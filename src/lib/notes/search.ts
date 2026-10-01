import type { Note, NoteStatus } from './types';

export type StatusFilter = NoteStatus | 'all';

export interface NoteQuery {
  readonly status: StatusFilter;
  readonly query: string;
}

export function normalizeQuery(query: string): string {
  return query.trim().toLocaleLowerCase();
}

export function matchesQuery(note: Note, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) return true;
  return (
    note.title.toLocaleLowerCase().includes(normalizedQuery) ||
    note.body.toLocaleLowerCase().includes(normalizedQuery)
  );
}

export function matchesStatus(note: Note, status: StatusFilter): boolean {
  return status === 'all' || note.status === status;
}

/**
 * Filter for display.
 *
 * The `all` tab hides archived notes: they are "out of the way" by definition,
 * and keeping them visible would make the tab identical to every other tab.
 */
export function filterNotes(notes: readonly Note[], { status, query }: NoteQuery): Note[] {
  const normalizedQuery = normalizeQuery(query);
  return notes.filter((note) => {
    if (status === 'all' && note.status === 'archived') return false;
    return matchesStatus(note, status) && matchesQuery(note, normalizedQuery);
  });
}

/**
 * Display order: pinned notes first, then most recently updated.
 *
 * Ties break on `createdAt` then `id` so the order is fully deterministic — React
 * lists that reshuffle between renders feel broken even when the data is correct.
 */
export function sortNotes(notes: readonly Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.updatedAt !== b.updatedAt) return b.updatedAt - a.updatedAt;
    if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
    return a.id.localeCompare(b.id);
  });
}
