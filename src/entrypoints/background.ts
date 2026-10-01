import { defineBackground } from '#imports';
import { i18n } from '#i18n';
import { browser } from 'wxt/browser';

import { BillingService, type BillingClient } from '@/lib/billing/billingService';
import { createExtPayBillingClient } from '@/lib/billing/extpayClient';
import { onMessage, type NotesStateDto } from '@/lib/messaging';
import { createDraftStore } from '@/lib/notes/draft';
import { countActiveNotes, limitFor } from '@/lib/notes/limits';
import { createNotesRepository } from '@/lib/notes/repository';
import { toNotesState } from '@/lib/notes/state';
import { toPreview } from '@/lib/notes/text';
import type { Note } from '@/lib/notes/types';
import {
  MAINTENANCE_ALARM,
  MAINTENANCE_PERIOD_MINUTES,
  applyReminderAlarm,
  countNotesNeedingAttention,
  formatBadgeText,
  isReminderDue,
  parseReminderAlarmName,
  reconcileReminderAlarms,
  reminderAlarmName,
  shouldNotify,
  type AlarmApi,
} from '@/lib/reminders/scheduler';
import { createSettingsStore } from '@/lib/settings';
import { chromeLocalAdapter } from '@/lib/storage/chromeAdapter';
import { runStorageMigrations } from '@/lib/storage/migrations';
import { extensionPageUrl, publicAssetUrl } from '@/lib/util/url';

const CONTEXT_MENU_ID = 'notewisp:save-selection';
const BADGE_COLOR = '#f59e0b';
const SNOOZE_MINUTES = 10;
const NOTIFICATION_ICON = 'icon/128.png';

/** ExtensionPay's background hook must run once per service-worker context. */
let billingBackgroundStarted = false;

/**
 * The background service worker is the single writer for notes.
 *
 * Centralising writes here (the popup routes every mutation through messaging)
 * means there is exactly one owner of the read-modify-write cycle, so a popup and
 * the service worker can never clobber each other's changes.
 */
export default defineBackground(() => {
  const adapter = chromeLocalAdapter();
  const notes = createNotesRepository(adapter);
  const settings = createSettingsStore(adapter);
  const draft = createDraftStore(adapter);
  const billing = new BillingService({ adapter, client: createSafeBillingClient() });
  const alarms = createAlarmApi();

  registerMessageHandlers();
  registerListeners();
  void bootstrap();

  // ---------------------------------------------------------------- state ---

  async function buildState(): Promise<NotesStateDto> {
    const [allNotes, entitlement] = await Promise.all([notes.list(), billing.getState()]);
    return toNotesState(allNotes, entitlement.isPaid);
  }

  async function refreshBadge(): Promise<void> {
    const allNotes = await notes.list();
    const count = countNotesNeedingAttention(allNotes, Date.now());
    await browser.action.setBadgeText({ text: formatBadgeText(count) });
    if (count > 0) {
      await browser.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
      await browser.action.setTitle({ title: i18n.t('actionTitleWithDue', [String(count)]) });
    } else {
      await browser.action.setTitle({ title: i18n.t('actionTitle') });
    }
  }

  // ----------------------------------------------------------- reminders ----

  /**
   * Deliver any reminder that came due while the browser was closed.
   *
   * Runs on install, on startup and on the maintenance tick. Safe to repeat
   * because `markNotified` records what has already been announced.
   */
  async function processDueReminders(): Promise<void> {
    const [allNotes, currentSettings] = await Promise.all([notes.list(), settings.read()]);
    const now = Date.now();

    for (const note of allNotes) {
      if (!isReminderDue(note, now)) continue;
      if (currentSettings.remindersEnabled && shouldNotify(note)) {
        await showReminderNotification(note);
      }
      // Settle even when notifications are off, otherwise this list would be
      // rescanned on every wake forever.
      await notes.markNotified(note.id, now);
    }
  }

  async function showReminderNotification(note: Note): Promise<void> {
    const preview = toPreview(note.body, 140);
    await browser.notifications.create(note.id, {
      type: 'basic',
      iconUrl: publicAssetUrl(NOTIFICATION_ICON),
      title: note.title.length > 0 ? note.title : i18n.t('noteUntitled'),
      message: preview.length > 0 ? preview : i18n.t('noteNoBody'),
      priority: 2,
      buttons: [
        { title: i18n.t('notificationSnoozeTen') },
        { title: i18n.t('notificationMarkDone') },
      ],
    });
  }

  async function snoozeNote(noteId: string, minutes: number): Promise<void> {
    const updated = await notes.update(noteId, { remindAt: Date.now() + minutes * 60_000 });
    if (updated !== null) await applyReminderAlarm(alarms, updated, Date.now());
    await refreshBadge();
  }

  // ------------------------------------------------------------ windows -----

  async function openNoteWindow(noteId: string): Promise<void> {
    const url = extensionPageUrl('popup.html', `#note/${encodeURIComponent(noteId)}`);
    try {
      await browser.windows.create({ url, type: 'popup', width: 440, height: 650 });
    } catch (error) {
      console.error('[notewisp] could not open note window', error);
    }
  }

  /** Open the toolbar popup programmatically, where Chrome permits it. */
  async function tryOpenPopup(): Promise<boolean> {
    try {
      if (typeof browser.action.openPopup !== 'function') return false;
      await browser.action.openPopup();
      return true;
    } catch {
      // Chrome rejects this when no window is focused.
      return false;
    }
  }

  async function notify(title: string, message: string): Promise<void> {
    await browser.notifications.create({
      type: 'basic',
      iconUrl: publicAssetUrl(NOTIFICATION_ICON),
      title,
      message,
    });
  }

  // ------------------------------------------------------------ lifecycle ---

  async function bootstrap(): Promise<void> {
    // Upgrade stored data before anything reads it.
    try {
      const applied = await runStorageMigrations(adapter);
      if (applied.length > 0) console.warn('[notewisp] applied storage migrations', applied);
    } catch (error) {
      console.error('[notewisp] storage migration failed', error);
    }

    await reconcileReminderAlarms(alarms, await notes.list(), Date.now());
    await browser.alarms.create(MAINTENANCE_ALARM, { periodInMinutes: MAINTENANCE_PERIOD_MINUTES });
    await processDueReminders();
    await refreshBadge();
    // Warm the entitlement cache without making the popup wait on the network.
    void billing.ensureFresh();
  }

  async function saveSelectionAsNote(text: string): Promise<void> {
    const entitlement = await billing.getState();
    const outcome = await notes.createWithinLimit({ body: text }, limitFor(entitlement.isPaid));

    if (!outcome.ok) {
      const activeCount = countActiveNotes(await notes.list());
      await notify(i18n.t('limitReachedTitle'), i18n.t('limitReachedBody', [String(activeCount)]));
      await tryOpenPopup();
      return;
    }

    await applyReminderAlarm(alarms, outcome.note, Date.now());
    await refreshBadge();

    if (!(await tryOpenPopup())) {
      await notify(
        i18n.t('selectionSavedTitle'),
        outcome.note.title.length > 0 ? outcome.note.title : i18n.t('noteUntitled'),
      );
    }
  }

  // ------------------------------------------------------------- handlers ---

  function registerMessageHandlers(): void {
    onMessage('getState', (message) => {
      // The state is served from cache so the popup never waits on the network;
      // the entitlement re-check happens behind it and lands on the next open.
      if (message.data.refreshBilling === true) void billing.refreshThrottled();
      return buildState();
    });

    onMessage('createNote', async (message) => {
      const entitlement = await billing.getState();
      const outcome = await notes.createWithinLimit(message.data, limitFor(entitlement.isPaid));

      if (!outcome.ok) {
        return { ok: false, reason: 'limit_reached' as const, state: await buildState() };
      }

      await applyReminderAlarm(alarms, outcome.note, Date.now());
      await refreshBadge();
      return { ok: true, reason: null, state: await buildState() };
    });

    onMessage('updateNote', async (message) => {
      const updated = await notes.update(message.data.id, message.data.patch);
      if (updated !== null) await applyReminderAlarm(alarms, updated, Date.now());
      await refreshBadge();
      return buildState();
    });

    onMessage('setNoteStatus', async (message) => {
      const updated = await notes.update(message.data.id, { status: message.data.status });
      if (updated !== null) await applyReminderAlarm(alarms, updated, Date.now());
      await refreshBadge();
      return buildState();
    });

    onMessage('toggleNotePin', async (message) => {
      const existing = await notes.getById(message.data.id);
      if (existing !== null) await notes.update(existing.id, { pinned: !existing.pinned });
      return buildState();
    });

    onMessage('deleteNote', async (message) => {
      const deleted = await notes.remove(message.data.id);
      if (deleted !== null) {
        await alarms.clear(reminderAlarmName(deleted.id));
        await refreshBadge();
      }
      return { state: await buildState(), deleted };
    });

    onMessage('restoreNote', async (message) => {
      const restored = await notes.restore(message.data.note);
      await applyReminderAlarm(alarms, restored, Date.now());
      await refreshBadge();
      return buildState();
    });

    onMessage('replaceAllNotes', async (message) => {
      await notes.replaceAll(message.data.notes);
      await reconcileReminderAlarms(alarms, await notes.list(), Date.now());
      await refreshBadge();
      return buildState();
    });

    onMessage('getBilling', () => billing.getState());
    onMessage('refreshBilling', () => billing.refresh());

    onMessage('openPaymentPage', async (message) => {
      try {
        await billing.openPaymentPage(message.data.plan);
        return { opened: true };
      } catch (error) {
        console.error('[notewisp] could not open the payment page', error);
        return { opened: false };
      }
    });

    onMessage('openLoginPage', async () => {
      try {
        await billing.openLoginPage();
        return { opened: true };
      } catch (error) {
        console.error('[notewisp] could not open the login page', error);
        return { opened: false };
      }
    });

    onMessage('getSettings', () => settings.read());

    onMessage('updateSettings', (message) =>
      settings.update((current) => ({ ...current, ...message.data.patch })),
    );

    onMessage('resetAllData', async () => {
      await Promise.all([notes.clear(), draft.clear(), settings.clear()]);
      await reconcileReminderAlarms(alarms, [], Date.now());
      await refreshBadge();
      return buildState();
    });

    onMessage('openOptionsPage', () => {
      void browser.runtime.openOptionsPage();
    });
  }

  function registerListeners(): void {
    browser.runtime.onInstalled.addListener(() => {
      void (async () => {
        await browser.contextMenus.removeAll();
        browser.contextMenus.create({
          id: CONTEXT_MENU_ID,
          title: i18n.t('contextMenuSaveSelection'),
          contexts: ['selection'],
        });
        await bootstrap();
      })();
    });

    browser.runtime.onStartup.addListener(() => {
      void bootstrap();
    });

    browser.alarms.onAlarm.addListener((alarm) => {
      void (async () => {
        if (alarm.name === MAINTENANCE_ALARM) {
          await reconcileReminderAlarms(alarms, await notes.list(), Date.now());
          await processDueReminders();
          await refreshBadge();
          return;
        }

        const noteId = parseReminderAlarmName(alarm.name);
        if (noteId === null) return;

        const note = await notes.getById(noteId);
        if (note === null) return;

        const now = Date.now();
        if (!isReminderDue(note, now)) {
          // The note was edited or rescheduled while this alarm was pending.
          await applyReminderAlarm(alarms, note, now);
          return;
        }

        const currentSettings = await settings.read();
        if (currentSettings.remindersEnabled && shouldNotify(note)) {
          await showReminderNotification(note);
        }
        await notes.markNotified(noteId, now);
        await refreshBadge();
      })();
    });

    browser.notifications.onClicked.addListener((notificationId) => {
      void (async () => {
        const note = await notes.getById(notificationId);
        if (note !== null) await openNoteWindow(note.id);
        else await tryOpenPopup();
        await browser.notifications.clear(notificationId);
      })();
    });

    browser.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      void (async () => {
        if ((await notes.getById(notificationId)) !== null) {
          if (buttonIndex === 0) {
            await snoozeNote(notificationId, SNOOZE_MINUTES);
          } else {
            await notes.update(notificationId, { status: 'done' });
            await refreshBadge();
          }
        }
        await browser.notifications.clear(notificationId);
      })();
    });

    browser.contextMenus.onClicked.addListener((info) => {
      if (info.menuItemId !== CONTEXT_MENU_ID) return;
      const text = typeof info.selectionText === 'string' ? info.selectionText.trim() : '';
      if (text.length === 0) return;
      void saveSelectionAsNote(text);
    });
  }

  // --------------------------------------------------------------- shared ---

  function createAlarmApi(): AlarmApi {
    return {
      create(name, info) {
        // `chrome.alarms.create` is synchronous and returns void, unlike the rest
        // of the alarms API, so it is wrapped to satisfy the async interface.
        browser.alarms.create(name, info);
        return Promise.resolve();
      },
      clear: (name) => browser.alarms.clear(name),
      getAll: async () =>
        (await browser.alarms.getAll()).map((alarm) => ({
          name: alarm.name,
          scheduledTime: alarm.scheduledTime,
        })),
    };
  }

  /**
   * Wrapped so a failure inside the payment library can never take down the core
   * product: notes and reminders must keep working even if billing does not.
   */
  function createSafeBillingClient(): BillingClient {
    try {
      const client = createExtPayBillingClient();
      if (!billingBackgroundStarted) {
        billingBackgroundStarted = true;
        client.startBackground();
      }
      return client;
    } catch (error) {
      console.error('[notewisp] payment provider unavailable', error);
      const unavailable = (): Promise<never> =>
        Promise.reject(new Error('payment provider unavailable'));
      return {
        getUser: unavailable,
        openPaymentPage: unavailable,
        openLoginPage: unavailable,
      };
    }
  }
});
