import type { Note } from './types';

/** How many notes a user can keep without paying. */
export const FREE_NOTE_LIMIT = 10;

/** The state of a user's note allowance. */
export interface LimitSnapshot {
  /** Notes that count toward the limit. Archived notes are excluded. */
  readonly activeCount: number;
  /** `null` means unlimited. */
  readonly limit: number | null;
  readonly isPaid: boolean;
}

/** Count the notes that occupy a free-tier slot. Archived notes do not. */
export function countActiveNotes(notes: readonly Note[]): number {
  let count = 0;
  for (const note of notes) {
    if (note.status !== 'archived') count += 1;
  }
  return count;
}

/**
 * The note allowance for a given plan.
 *
 * Deliberately a plain function of `isPaid` so the paywall rule lives in exactly
 * one place instead of being re-derived at each call site.
 */
export function limitFor(isPaid: boolean, freeLimit: number = FREE_NOTE_LIMIT): number | null {
  return isPaid ? null : freeLimit;
}

export function canCreateNote(snapshot: LimitSnapshot): boolean {
  return snapshot.limit === null || snapshot.activeCount < snapshot.limit;
}

/** Build a snapshot from raw inputs, used by the background service. */
export function buildLimitSnapshot(
  notes: readonly Note[],
  isPaid: boolean,
  freeLimit: number = FREE_NOTE_LIMIT,
): LimitSnapshot {
  return {
    activeCount: countActiveNotes(notes),
    limit: limitFor(isPaid, freeLimit),
    isPaid,
  };
}
