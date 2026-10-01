import { useCallback, useEffect, useState } from 'react';

import { sendMessage, type CreateNoteResult, type NotesStateDto } from '@/lib/messaging';
import { callBackground } from '@/lib/messagingClient';
import { toNotesState } from '@/lib/notes/state';
import type { NewNoteInput, Note, NotePatch, NoteStatus } from '@/lib/notes/types';

export interface NotesController {
  state: NotesStateDto;
  /** i18n key for the current error, or `null` when everything is healthy. */
  errorKey: string | null;
  reload: () => Promise<void>;
  create: (input: NewNoteInput) => Promise<CreateNoteResult | null>;
  update: (id: string, patch: NotePatch) => Promise<void>;
  setStatus: (id: string, status: NoteStatus) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  remove: (id: string) => Promise<Note | null>;
  restore: (note: Note) => Promise<void>;
  replaceAll: (notes: Note[]) => Promise<void>;
}

function replaceNote(notes: readonly Note[], id: string, patch: Partial<Note>): Note[] {
  return notes.map((note) => (note.id === id ? { ...note, ...patch } : note));
}

/**
 * Notes state plus every mutation the UI can perform.
 *
 * `initialState` comes from the popup's instant local read, so the list is on
 * screen before the service worker has even woken up; the first `reload`
 * reconciles against the authoritative state.
 */
export function useNotes(initialState: NotesStateDto): NotesController {
  const [state, setState] = useState<NotesStateDto>(initialState);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const run = useCallback(async <T>(task: () => Promise<T>): Promise<T | null> => {
    const result = await callBackground(task);
    setErrorKey(result === null ? 'errorTitle' : null);
    return result;
  }, []);

  const reload = useCallback(async () => {
    // Asking the background to refresh billing is what unlocks a just-completed
    // payment on the next open, without the popup ever waiting on the network.
    const next = await run(() => sendMessage('getState', { refreshBilling: true }));
    if (next !== null) setState(next);
  }, [run]);

  useEffect(() => {
    /*
     * `reload` awaits a message before touching state, so this is not the
     * synchronous set-during-render cascade the rule guards against — the linter
     * just cannot see across the await. Fetching on mount is unavoidable without
     * adding a data-fetching library for a single query.
     */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const create = useCallback(
    (input: NewNoteInput) =>
      run(async () => {
        const result = await sendMessage('createNote', input);
        setState(result.state);
        return result;
      }),
    [run],
  );

  const update = useCallback(
    async (id: string, patch: NotePatch) => {
      const next = await run(() => sendMessage('updateNote', { id, patch }));
      if (next !== null) setState(next);
    },
    [run],
  );

  const setStatus = useCallback(
    async (id: string, status: NoteStatus) => {
      // Status is the most frequently used control, so it updates straight away
      // and the authoritative list replaces it a moment later.
      setState((current) =>
        toNotesState(
          replaceNote(current.notes, id, { status, updatedAt: Date.now() }),
          current.isPaid,
        ),
      );
      const next = await run(() => sendMessage('setNoteStatus', { id, status }));
      if (next !== null) setState(next);
    },
    [run],
  );

  const togglePin = useCallback(
    async (id: string) => {
      setState((current) => {
        const note = current.notes.find((candidate) => candidate.id === id);
        if (note === undefined) return current;
        return toNotesState(
          replaceNote(current.notes, id, { pinned: !note.pinned }),
          current.isPaid,
        );
      });
      const next = await run(() => sendMessage('toggleNotePin', { id }));
      if (next !== null) setState(next);
    },
    [run],
  );

  const remove = useCallback(
    async (id: string) => {
      setState((current) =>
        toNotesState(
          current.notes.filter((note) => note.id !== id),
          current.isPaid,
        ),
      );
      const result = await run(() => sendMessage('deleteNote', { id }));
      if (result !== null) setState(result.state);
      return result?.deleted ?? null;
    },
    [run],
  );

  const restore = useCallback(
    async (note: Note) => {
      const next = await run(() => sendMessage('restoreNote', { note }));
      if (next !== null) setState(next);
    },
    [run],
  );

  const replaceAll = useCallback(
    async (notes: Note[]) => {
      const next = await run(() => sendMessage('replaceAllNotes', { notes }));
      if (next !== null) setState(next);
    },
    [run],
  );

  return {
    state,
    errorKey,
    reload,
    create,
    update,
    setStatus,
    togglePin,
    remove,
    restore,
    replaceAll,
  };
}
