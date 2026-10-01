import { describe, expect, it } from 'vitest';

import {
  buildLimitSnapshot,
  canCreateNote,
  countActiveNotes,
  FREE_NOTE_LIMIT,
  limitFor,
} from '@/lib/notes/limits';
import type { Note, NoteStatus } from '@/lib/notes/types';

function note(status: NoteStatus, index = 0): Note {
  return {
    id: `note-${index}`,
    title: `note ${index}`,
    body: `note ${index}`,
    status,
    pinned: false,
    createdAt: index,
    updatedAt: index,
    remindAt: null,
    notifiedAt: null,
  };
}

function notes(statuses: NoteStatus[]): Note[] {
  return statuses.map((status, index) => note(status, index));
}

describe('countActiveNotes', () => {
  it('counts every status except archived', () => {
    expect(countActiveNotes(notes(['open', 'doing', 'done', 'archived']))).toBe(3);
  });

  it('handles an empty collection', () => {
    expect(countActiveNotes([])).toBe(0);
  });
});

describe('limitFor', () => {
  it('gives free users the documented allowance', () => {
    expect(limitFor(false)).toBe(FREE_NOTE_LIMIT);
  });

  it('gives paying users no limit', () => {
    expect(limitFor(true)).toBeNull();
  });
});

describe('canCreateNote', () => {
  it('uses the boundary exactly: 9 allows, 10 blocks', () => {
    expect(canCreateNote({ activeCount: 9, limit: 10, isPaid: false })).toBe(true);
    expect(canCreateNote({ activeCount: 10, limit: 10, isPaid: false })).toBe(false);
  });

  it('blocks a free user who overshot the limit', () => {
    expect(canCreateNote({ activeCount: 11, limit: 10, isPaid: false })).toBe(false);
  });

  it('allows an unlimited plan to keep creating indefinitely', () => {
    expect(canCreateNote({ activeCount: 10_000, limit: null, isPaid: true })).toBe(true);
  });

  it('blocks even at zero when the limit itself is zero', () => {
    expect(canCreateNote({ activeCount: 0, limit: 0, isPaid: false })).toBe(false);
  });
});

describe('buildLimitSnapshot', () => {
  it('combines the collection and the plan', () => {
    const snapshot = buildLimitSnapshot(notes(['open', 'archived', 'done']), false);

    expect(snapshot).toEqual({ activeCount: 2, limit: FREE_NOTE_LIMIT, isPaid: false });
    expect(canCreateNote(snapshot)).toBe(true);
  });

  it('archiving never grants a new slot to a paying user needlessly', () => {
    // Archived notes are excluded, so the count reflects only live notes.
    expect(buildLimitSnapshot(notes(['archived', 'archived']), false).activeCount).toBe(0);
    expect(buildLimitSnapshot(notes(['archived', 'archived']), true).limit).toBeNull();
  });
});
