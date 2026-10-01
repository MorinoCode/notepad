/**
 * Core note domain types.
 *
 * This module is deliberately free of any browser or framework dependency so the
 * domain can be unit tested in plain Node.
 */

/** Every lifecycle state a note can be in, in display order. */
export const NOTE_STATUSES = ['open', 'doing', 'done', 'archived'] as const;

export type NoteStatus = (typeof NOTE_STATUSES)[number];

export const NOTE_COLORS = ['default', 'amber', 'emerald', 'blue', 'purple', 'rose'] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];

/** Statuses that represent unfinished work. Used for reminders and the badge. */
export const UNFINISHED_STATUSES: readonly NoteStatus[] = ['open', 'doing'];

/** The persisted shape of a single note. */
export interface Note {
  readonly id: string;
  /** Derived from {@link body} on every write so lists never need to re-parse it. */
  readonly title: string;
  readonly body: string;
  readonly status: NoteStatus;
  readonly pinned: boolean;
  readonly color?: NoteColor;
  readonly createdAt: number;
  readonly updatedAt: number;
  /** Epoch milliseconds, or `null` when no reminder is set. */
  readonly remindAt: number | null;
  /** When the reminder notification was last delivered. Prevents duplicates. */
  readonly notifiedAt: number | null;
}

/** Fields a caller may supply when creating a note. */
export interface NewNoteInput {
  readonly body: string;
  readonly status?: NoteStatus;
  readonly color?: NoteColor;
  readonly remindAt?: number | null;
}

/**
 * Fields a caller may change on an existing note.
 *
 * `title` is intentionally absent: it is always derived from `body` so the two
 * can never drift apart.
 */
export interface NotePatch {
  readonly body?: string;
  readonly status?: NoteStatus;
  readonly pinned?: boolean;
  readonly color?: NoteColor;
  readonly remindAt?: number | null;
}

/** Statuses eligible for reminder notifications. Completed/archived notes are not. */
export function isUnfinished(status: NoteStatus): boolean {
  return UNFINISHED_STATUSES.includes(status);
}
