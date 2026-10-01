import { useCallback, useEffect, useState } from 'react';

import { isDraftEmpty } from '@/lib/notes/draft';
import type { JsonStore } from '@/lib/storage/jsonStore';
import type { DraftState } from '@/lib/storage/schema';

import { useDebouncedValue } from './useDebouncedValue';

/** Short enough that a closed popup loses at most a couple of characters. */
export const DRAFT_DEBOUNCE_MS = 250;

export interface DraftController {
  body: string;
  setBody: (value: string) => void;
  remindAt: number | null;
  setRemindAt: (value: number | null) => void;
  /** Clear the composer and the stored draft, after a successful save. */
  clear: () => void;
}

/**
 * Draft autosave for the composer.
 *
 * A browser popup is destroyed the instant it loses focus, which is the single
 * most common way a note-taking extension loses what someone just typed. Every
 * keystroke is therefore persisted (debounced) and restored on the next open.
 */
export function useDraft(store: JsonStore<DraftState>, initial: DraftState): DraftController {
  const [body, setBody] = useState(initial.body);
  const [remindAt, setRemindAt] = useState<number | null>(initial.remindAt);
  const debouncedBody = useDebouncedValue(body, DRAFT_DEBOUNCE_MS);

  useEffect(() => {
    const draft: DraftState = { body: debouncedBody, remindAt, savedAt: Date.now() };
    void (isDraftEmpty(draft) ? store.clear() : store.write(draft));
  }, [store, debouncedBody, remindAt]);

  useEffect(() => {
    function flushDraft() {
      const draft: DraftState = { body, remindAt, savedAt: Date.now() };
      void (isDraftEmpty(draft) ? store.clear() : store.write(draft));
    }

    window.addEventListener('pagehide', flushDraft);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushDraft();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flushDraft);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [store, body, remindAt]);

  const clear = useCallback(() => {
    setBody('');
    setRemindAt(null);
    void store.clear();
  }, [store]);

  return { body, setBody, remindAt, setRemindAt, clear };
}
