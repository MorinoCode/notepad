import type { NotesStateDto } from '@/lib/messaging';

import { buildLimitSnapshot, canCreateNote } from './limits';
import type { Note } from './types';

/**
 * The single place that turns a note collection plus a plan into the payload the
 * UI renders from.
 *
 * Shared by the background service and by the popup's instant-start path, which
 * guarantees the two can never disagree about whether the paywall applies.
 */
export function toNotesState(notes: Note[], isPaid: boolean): NotesStateDto {
  const snapshot = buildLimitSnapshot(notes, isPaid);
  return {
    notes,
    activeCount: snapshot.activeCount,
    limit: snapshot.limit,
    canCreate: canCreateNote(snapshot),
    isPaid: snapshot.isPaid,
  };
}
