import { describe, expect, it } from 'vitest';

import { filterNotes, matchesQuery, sortNotes } from '@/lib/notes/search';
import type { Note, NoteStatus } from '@/lib/notes/types';

function note(overrides: Partial<Note> & { id: string }): Note {
  return {
    title: overrides.title ?? overrides.id,
    body: overrides.body ?? overrides.id,
    status: 'open',
    pinned: false,
    createdAt: 0,
    updatedAt: 0,
    remindAt: null,
    notifiedAt: null,
    ...overrides,
  };
}

const all: Note[] = [
  note({ id: 'a', status: 'open', updatedAt: 10 }),
  note({ id: 'b', status: 'doing', updatedAt: 30 }),
  note({ id: 'c', status: 'done', updatedAt: 20 }),
  note({ id: 'd', status: 'archived', updatedAt: 40 }),
];

describe('filterNotes', () => {
  it('hides archived notes from the "all" tab', () => {
    expect(filterNotes(all, { status: 'all', query: '' }).map((n) => n.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('shows only archived notes on the archived tab', () => {
    expect(filterNotes(all, { status: 'archived', query: '' }).map((n) => n.id)).toEqual(['d']);
  });

  it.each<[NoteStatus]>([['open'], ['doing'], ['done']])('filters on %s', (status) => {
    const result = filterNotes(all, { status, query: '' });
    expect(result).toHaveLength(1);
    expect(result[0]?.status).toBe(status);
  });

  it('matches a query case-insensitively against the body, not just the title', () => {
    const notes = [
      note({ id: 'x', title: 'Groceries', body: 'Groceries\nbuy OATMILK' }),
      note({ id: 'y', title: 'Work', body: 'Work\nsend report' }),
    ];

    expect(filterNotes(notes, { status: 'all', query: 'oatmilk' }).map((n) => n.id)).toEqual(['x']);
  });

  it('ignores surrounding whitespace in the query', () => {
    expect(filterNotes(all, { status: 'all', query: '   ' })).toHaveLength(3);
  });

  it('returns nothing when nothing matches', () => {
    expect(filterNotes(all, { status: 'all', query: 'zzzz' })).toEqual([]);
  });

  it('matches non-latin scripts', () => {
    const notes = [
      note({ id: 'fa', title: 'خرید', body: 'خرید نان و شیر' }),
      note({ id: 'en', title: 'Shopping', body: 'Shopping' }),
    ];

    expect(filterNotes(notes, { status: 'all', query: 'نان' }).map((n) => n.id)).toEqual(['fa']);
  });

  it('preserves the incoming order of the notes it keeps', () => {
    expect(filterNotes(all, { status: 'all', query: '' }).map((n) => n.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });
});

describe('matchesQuery', () => {
  it('treats an empty query as a match', () => {
    expect(matchesQuery(note({ id: 'a' }), '')).toBe(true);
  });
});

describe('sortNotes', () => {
  it('puts pinned notes first regardless of recency', () => {
    const notes = [
      note({ id: 'recent', updatedAt: 100 }),
      note({ id: 'pinned', updatedAt: 1, pinned: true }),
    ];

    expect(sortNotes(notes).map((n) => n.id)).toEqual(['pinned', 'recent']);
  });

  it('orders by most recently updated', () => {
    const notes = [note({ id: 'old', updatedAt: 1 }), note({ id: 'new', updatedAt: 9 })];
    expect(sortNotes(notes).map((n) => n.id)).toEqual(['new', 'old']);
  });

  it('breaks ties deterministically so rows never jump between renders', () => {
    const notes = [
      note({ id: 'b', updatedAt: 5, createdAt: 5 }),
      note({ id: 'a', updatedAt: 5, createdAt: 5 }),
    ];

    expect(sortNotes(notes).map((n) => n.id)).toEqual(['a', 'b']);
    expect(sortNotes([...notes].reverse()).map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('does not mutate the input array', () => {
    const notes = [note({ id: 'a', updatedAt: 1 }), note({ id: 'b', updatedAt: 2 })];
    sortNotes(notes);
    expect(notes.map((n) => n.id)).toEqual(['a', 'b']);
  });
});
