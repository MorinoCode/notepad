import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/common/Button';
import { AlertIcon, LockIcon } from '@/components/common/Icons';
import { ToastHost } from '@/components/common/ToastHost';
import { Header } from '@/components/popup/Header';
import { NoteComposer } from '@/components/popup/NoteComposer';
import { NoteList } from '@/components/popup/NoteList';
import { PaywallModal } from '@/components/popup/PaywallModal';
import { SearchBar } from '@/components/popup/SearchBar';
import { ShortcutsModal } from '@/components/popup/ShortcutsModal';
import { StatusTabs } from '@/components/popup/StatusTabs';
import { TagFilterBar } from '@/components/popup/TagFilterBar';
import { AccountSection } from '@/components/settings/AccountSection';
import { PreferencesSection } from '@/components/settings/PreferencesSection';
import { i18n } from '#i18n';
import { currentLocale, isRtlLocale } from '@/hooks/useLocale';
import { useBilling } from '@/hooks/useBilling';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useDraft } from '@/hooks/useDraft';
import { useNotes } from '@/hooks/useNotes';
import { useTheme } from '@/hooks/useTheme';
import { useToasts } from '@/hooks/useToasts';
import { PRO_PLAN } from '@/lib/billing/plan';
import { HIGHLIGHT_DURATION_MS } from '@/lib/constants';
import { sendMessage } from '@/lib/messaging';
import { callBackground } from '@/lib/messagingClient';
import { createDraftStore } from '@/lib/notes/draft';
import { downloadMarkdownFile, notesToMarkdown } from '@/lib/notes/export';
import { filterNotes, type StatusFilter } from '@/lib/notes/search';
import { getAllTags } from '@/lib/notes/tags';
import type { Note, NoteColor } from '@/lib/notes/types';
import { describeReminder } from '@/lib/reminders/time';
import { snapshotToState, type LocalSnapshot } from '@/lib/snapshot';
import { chromeLocalAdapter } from '@/lib/storage/chromeAdapter';
import type { Settings } from '@/lib/storage/schema';

/** Keeps filtering off the per-keystroke path on large collections. */
const SEARCH_DEBOUNCE_MS = 120;

/**
 * The note a notification deep-linked to, read before the first render.
 */
function readDeepLinkNoteId(): string | null {
  const raw = /^#note\/(.+)$/.exec(window.location.hash)?.[1];
  if (raw === undefined) return null;
  const id = decodeURIComponent(raw);
  return id.length > 0 ? id : null;
}

export interface AppProps {
  initial: LocalSnapshot;
}

export function App({ initial }: AppProps) {
  const locale = currentLocale();
  const isRtl = isRtlLocale(locale);

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, [isRtl]);

  const [settings, setSettings] = useState<Settings>(initial.settings);
  useTheme(settings.theme);

  const notes = useNotes(useMemo(() => snapshotToState(initial), [initial]));
  const billing = useBilling(initial.billing);

  const draftStore = useMemo(() => createDraftStore(chromeLocalAdapter()), []);
  const draft = useDraft(draftStore, initial.draft);
  const toasts = useToasts();

  const [view, setView] = useState<'notes' | 'settings'>('notes');
  const [highlightedId, setHighlightedId] = useState<string | null>(readDeepLinkNoteId);
  const [filter, setFilter] = useState<StatusFilter>(() => {
    if (highlightedId === null) return 'all';
    const target = initial.notes.find((n) => n.id === highlightedId);
    return target?.status === 'archived' ? 'archived' : 'all';
  });
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallBusy, setPaywallBusy] = useState(false);
  const [paywallFailed, setPaywallFailed] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  // ------------------------------------------------- notifications bridge ---

  useEffect(() => {
    if (highlightedId === null) return undefined;
    const timer = window.setTimeout(() => setHighlightedId(null), HIGHLIGHT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [highlightedId]);

  useEffect(() => {
    if (highlightedId === null) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`note-${highlightedId}`)?.scrollIntoView({ block: 'center' });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [highlightedId]);

  // Global keyboard shortcut helpers
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea';

      // Press '/' to quickly focus search
      if (event.key === '/' && !isInput) {
        event.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[type="search"]');
        searchInput?.focus();
      }

      // Press '?' to view shortcuts
      if (event.key === '?' && !isInput) {
        event.preventDefault();
        setShortcutsOpen((current) => !current);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ------------------------------------------------------------- derived ---

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = {
      all: 0,
      open: 0,
      doing: 0,
      done: 0,
      archived: 0,
    };
    for (const note of notes.state.notes) {
      result[note.status] += 1;
      if (note.status !== 'archived') result.all += 1;
    }
    return result;
  }, [notes.state.notes]);

  const visibleNotes = useMemo(
    () => filterNotes(notes.state.notes, { status: filter, query: debouncedQuery }),
    [notes.state.notes, filter, debouncedQuery],
  );

  const allTags = useMemo(() => getAllTags(notes.state.notes), [notes.state.notes]);

  const selectedTag = useMemo(() => {
    const match = /^#([a-zA-Z0-9_\u0600-\u06FF]+)$/.exec(query.trim());
    return match?.[1] ? match[1].toLowerCase() : null;
  }, [query]);

  // ------------------------------------------------------------ handlers ---

  const handleSubmit = useCallback(async () => {
    if (draft.body.trim().length === 0) return;
    setSubmitting(true);
    const reminderAt = draft.remindAt;
    const result = await notes.create({
      body: draft.body,
      remindAt: reminderAt,
      status: settings.defaultStatus,
    });
    setSubmitting(false);

    if (result === null) {
      toasts.push({ message: i18n.t('noteSaveFailed'), tone: 'danger' });
      return;
    }

    if (!result.ok) {
      setPaywallOpen(true);
      return;
    }

    draft.clear();
    if (reminderAt !== null) {
      const descriptor = describeReminder(reminderAt, Date.now(), locale);
      const text =
        descriptor.kind === 'today'
          ? i18n.t('reminderToday', [descriptor.time])
          : descriptor.kind === 'tomorrow'
            ? i18n.t('reminderTomorrowAt', [descriptor.time])
            : descriptor.dateTime;
      toasts.push({ message: i18n.t('reminderSet', [text]) });
    }
  }, [draft, locale, notes, settings.defaultStatus, toasts]);

  const handleDelete = useCallback(
    async (id: string) => {
      const deleted = await notes.remove(id);
      if (deleted === null) return;
      toasts.push({
        message: i18n.t('noteDeleted'),
        action: { label: i18n.t('undo'), onAction: () => void notes.restore(deleted) },
      });
    },
    [notes, toasts],
  );

  const handleSaveBody = useCallback(
    async (id: string, body: string) => {
      if (body.trim().length === 0) return;
      await notes.update(id, { body });
    },
    [notes],
  );

  const handleColorChange = useCallback(
    async (id: string, color: NoteColor) => {
      await notes.update(id, { color });
    },
    [notes],
  );

  const handleDuplicate = useCallback(
    async (note: Note) => {
      const result = await notes.create({
        body: note.body,
        status: note.status,
        color: note.color,
      });
      if (result && !result.ok) {
        setPaywallOpen(true);
      }
    },
    [notes],
  );

  const handleSelectTag = useCallback((tag: string | null) => {
    setQuery(tag ? `#${tag}` : '');
  }, []);

  const handleExportNotes = useCallback(() => {
    if (notes.state.notes.length === 0) {
      toasts.push({ message: i18n.t('exportEmpty'), tone: 'danger' });
      return;
    }
    const md = notesToMarkdown(notes.state.notes);
    downloadMarkdownFile(md, `notewisp-notes-${new Date().toISOString().slice(0, 10)}.md`);
    toasts.push({ message: i18n.t('exportMarkdownDone') });
  }, [notes.state.notes, toasts]);

  const handleSettingsChange = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }));
    void (async () => {
      const next = await callBackground(() => sendMessage('updateSettings', { patch }));
      if (next !== null) setSettings(next);
    })();
  }, []);

  const handleUpgrade = useCallback(
    async (planNickname: string = PRO_PLAN.nickname) => {
      setPaywallBusy(true);
      setPaywallFailed(false);
      const opened = await billing.upgrade(planNickname);
      setPaywallBusy(false);
      if (opened) {
        setPaywallOpen(false);
      } else {
        setPaywallFailed(true);
      }
    },
    [billing],
  );

  const handleRestore = useCallback(async () => {
    setPaywallBusy(true);
    setPaywallFailed(false);
    const opened = await billing.restore();
    setPaywallBusy(false);
    if (!opened) setPaywallFailed(true);
  }, [billing]);

  const limit = notes.state.limit ?? 0;

  return (
    <div className="bg-bg/95 relative flex h-full flex-col overflow-hidden select-none">
      {/* Apple Liquid Glass Ambient Light Aurora */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="ambient-glow-1 absolute -top-14 -left-14 size-60 rounded-full bg-gradient-to-br from-indigo-500/25 via-purple-500/15 to-transparent blur-3xl" />
        <div className="ambient-glow-2 absolute -right-16 -bottom-16 size-72 rounded-full bg-gradient-to-tl from-sky-400/20 via-blue-500/15 to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/4 size-44 -translate-y-1/2 rounded-full bg-amber-400/[0.06] blur-3xl" />
      </div>

      <Header
        activeCount={notes.state.activeCount}
        limit={notes.state.limit}
        isPaid={notes.state.isPaid}
        view={view}
        onUpgrade={() => setPaywallOpen(true)}
        onToggleView={() => setView((current) => (current === 'settings' ? 'notes' : 'settings'))}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onExportNotes={handleExportNotes}
      />

      {notes.errorKey !== null ? (
        <div className="border-border bg-danger-soft text-danger flex items-center gap-2 border-b px-3.5 py-1.5 text-[11px] backdrop-blur-md">
          <AlertIcon size={13} className="shrink-0" />
          <span className="flex-1">{i18n.t('errorTitle')}</span>
          <Button size="sm" variant="ghost" onClick={() => void notes.reload()}>
            {i18n.t('errorRetry')}
          </Button>
        </div>
      ) : null}

      {view === 'settings' ? (
        <div className="qn-scroll relative z-10 flex flex-1 flex-col gap-4 overflow-y-auto p-3.5">
          <PreferencesSection settings={settings} onChange={handleSettingsChange} />
          <AccountSection
            billing={billing.billing}
            locale={locale}
            busy={paywallBusy}
            failed={paywallFailed}
            onUpgrade={() => void handleUpgrade()}
            onRestore={() => void handleRestore()}
            onRefresh={() => void billing.refresh()}
          />
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => void sendMessage('openOptionsPage', {})}
          >
            {i18n.t('settingsTitle')}
          </Button>
        </div>
      ) : (
        <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
          {/* Quick Capture Composer */}
          <div className="px-3.5 pt-3 pb-2">
            <NoteComposer
              body={draft.body}
              onBodyChange={draft.setBody}
              remindAt={draft.remindAt}
              onRemindAtChange={draft.setRemindAt}
              onSubmit={() => void handleSubmit()}
              busy={submitting}
              locale={locale}
            />
          </div>

          {/* Search, Hashtag Chips & Status Controls */}
          <div className="flex flex-col gap-1.5 px-3.5 pt-1 pb-1">
            <SearchBar value={query} onChange={setQuery} />
            <TagFilterBar tags={allTags} selectedTag={selectedTag} onSelectTag={handleSelectTag} />
            <StatusTabs value={filter} counts={counts} onChange={setFilter} />
          </div>

          {/* Notes Stream */}
          <div className="qn-scroll flex-1 overflow-y-auto px-3.5 py-2">
            <NoteList
              notes={visibleNotes}
              locale={locale}
              filter={filter}
              searching={query.trim().length > 0}
              highlightedId={highlightedId}
              onStatusChange={(id, status) => void notes.setStatus(id, status)}
              onTogglePin={(id) => void notes.togglePin(id)}
              onColorChange={handleColorChange}
              onDuplicate={handleDuplicate}
              onTagClick={(tag) => setQuery(`#${tag}`)}
              onSave={(id, body) => void handleSaveBody(id, body)}
              onDelete={(id) => void handleDelete(id)}
            />

            {!notes.state.canCreate ? (
              <button
                type="button"
                onClick={() => setPaywallOpen(true)}
                className="apple-card hover:border-accent text-muted hover:text-accent-text mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed px-3.5 py-2.5 text-[12px] font-medium transition-all"
              >
                <LockIcon size={13} />
                {i18n.t('usageFull')}
              </button>
            ) : null}
          </div>
        </div>
      )}

      <PaywallModal
        open={paywallOpen}
        limit={limit}
        locale={locale}
        busy={paywallBusy}
        failed={paywallFailed}
        onClose={() => setPaywallOpen(false)}
        onUpgrade={(plan) => void handleUpgrade(plan)}
        onRestore={() => void handleRestore()}
      />

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <ToastHost toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </div>
  );
}
