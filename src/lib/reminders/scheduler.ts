import { isUnfinished, type Note } from '@/lib/notes/types';

export const REMINDER_ALARM_PREFIX = 'notewisp:reminder:';

/** Periodic housekeeping alarm that keeps the toolbar badge honest. */
export const MAINTENANCE_ALARM = 'notewisp:maintenance';
export const MAINTENANCE_PERIOD_MINUTES = 15;

export function reminderAlarmName(noteId: string): string {
  return `${REMINDER_ALARM_PREFIX}${noteId}`;
}

/** The note id encoded in an alarm name, or `null` for alarms we do not own. */
export function parseReminderAlarmName(name: string): string | null {
  if (!name.startsWith(REMINDER_ALARM_PREFIX)) return null;
  const id = name.slice(REMINDER_ALARM_PREFIX.length);
  return id.length > 0 ? id : null;
}

export interface AlarmLike {
  name: string;
  scheduledTime: number;
}

/**
 * The alarm API surface we depend on.
 *
 * Narrowing it to these three methods keeps the scheduler testable without a
 * browser, and makes explicit that we only ever use one-shot alarms.
 */
export interface AlarmApi {
  create(name: string, info: { when: number }): Promise<void>;
  clear(name: string): Promise<boolean>;
  getAll(): Promise<AlarmLike[]>;
}

export type AlarmPlan = { action: 'schedule'; when: number } | { action: 'clear' };

/**
 * Decide what should happen to a note's alarm.
 *
 * A reminder in the past is *not* scheduled: `chrome.alarms` would fire it
 * immediately, and a burst of notifications for old reminders is worse than
 * surfacing them quietly through the badge. Past-due reminders are picked up by
 * {@link isReminderDue} on startup instead.
 */
export function planReminderAlarm(note: Note, now: number): AlarmPlan {
  if (note.remindAt === null || note.remindAt <= now) return { action: 'clear' };
  return { action: 'schedule', when: note.remindAt };
}

/** Apply the plan for a single note. */
export async function applyReminderAlarm(
  api: AlarmApi,
  note: Note,
  now: number,
): Promise<AlarmPlan> {
  const plan = planReminderAlarm(note, now);
  const name = reminderAlarmName(note.id);
  if (plan.action === 'schedule') {
    await api.create(name, { when: plan.when });
  } else {
    await api.clear(name);
  }
  return plan;
}

export interface ReconcileSummary {
  scheduled: number;
  cleared: number;
}

/**
 * Rebuild every reminder alarm from the stored notes.
 *
 * Chrome does not reliably keep alarms across a browser restart, so this runs on
 * install and on every startup, and after any import. Alarms we do not own (the
 * maintenance alarm) are left untouched.
 */
export async function reconcileReminderAlarms(
  api: AlarmApi,
  notes: readonly Note[],
  now: number,
): Promise<ReconcileSummary> {
  const desired = new Map<string, number>();
  for (const note of notes) {
    const plan = planReminderAlarm(note, now);
    if (plan.action === 'schedule') desired.set(reminderAlarmName(note.id), plan.when);
  }

  const existing = await api.getAll();
  const alreadyCorrect = new Set<string>();
  let cleared = 0;

  for (const alarm of existing) {
    if (parseReminderAlarmName(alarm.name) === null) continue;
    const wanted = desired.get(alarm.name);
    if (wanted !== undefined && wanted === alarm.scheduledTime) {
      alreadyCorrect.add(alarm.name);
      continue;
    }
    await api.clear(alarm.name);
    if (wanted === undefined) cleared += 1;
  }

  let scheduled = 0;
  for (const [name, when] of desired) {
    if (alreadyCorrect.has(name)) continue;
    await api.create(name, { when });
    scheduled += 1;
  }

  return { scheduled, cleared };
}

/**
 * True when a reminder has come due and has not been announced yet.
 *
 * Comparing against `notifiedAt` is what makes this idempotent: the service
 * worker is restarted constantly, and without this check every wake would
 * re-notify.
 */
export function isReminderDue(note: Note, now: number): boolean {
  if (note.remindAt === null || note.remindAt > now) return false;
  return note.notifiedAt === null || note.notifiedAt < note.remindAt;
}

/** Notes whose reminder has passed and which are still unfinished. */
export function shouldNotify(note: Note): boolean {
  return isUnfinished(note.status);
}

/**
 * How many notes need attention: reminder passed, still open or in progress.
 *
 * Intentionally independent of `notifiedAt` — the badge should keep showing an
 * overdue note until the user actually deals with it.
 */
export function countNotesNeedingAttention(notes: readonly Note[], now: number): number {
  let count = 0;
  for (const note of notes) {
    if (note.remindAt === null || note.remindAt > now) continue;
    if (isUnfinished(note.status)) count += 1;
  }
  return count;
}

/** Chrome renders at most ~4 characters well; anything more is truncated. */
export function formatBadgeText(count: number): string {
  if (count <= 0) return '';
  return count > 9 ? '9+' : String(count);
}
