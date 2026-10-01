import { describe, expect, it } from 'vitest';

import {
  backupSchema,
  noteSchema,
  sanitizeNotes,
  sanitizeNotesWithReport,
} from '@/lib/notes/noteSchema';
import { MAX_BODY_LENGTH } from '@/lib/notes/text';
import type { Note } from '@/lib/notes/types';

const valid: Note = {
  id: 'note-1',
  title: 'Hello',
  body: 'Hello world',
  status: 'doing',
  pinned: true,
  createdAt: 1_000,
  updatedAt: 2_000,
  remindAt: 3_000,
  notifiedAt: null,
};

describe('noteSchema', () => {
  it('accepts a well formed note unchanged', () => {
    expect(noteSchema.parse(valid)).toEqual(valid);
  });

  it('drops unknown fields rather than persisting them', () => {
    const parsed = noteSchema.parse({ ...valid, unexpected: 'value' });
    expect(parsed).not.toHaveProperty('unexpected');
  });

  it('repairs an unknown status to "open"', () => {
    expect(noteSchema.parse({ ...valid, status: 'exploded' }).status).toBe('open');
  });

  it('repairs a non boolean pinned flag', () => {
    expect(noteSchema.parse({ ...valid, pinned: 'yes' }).pinned).toBe(false);
  });

  it('repairs a negative or fractional timestamp', () => {
    expect(noteSchema.parse({ ...valid, createdAt: -5 }).createdAt).toBeGreaterThan(0);
    expect(noteSchema.parse({ ...valid, updatedAt: 1.5 }).updatedAt).toBeGreaterThan(0);
  });

  it('repairs a reminder that is not a nullable number', () => {
    expect(noteSchema.parse({ ...valid, remindAt: 'tomorrow' }).remindAt).toBeNull();
  });

  it('keeps an explicit null reminder', () => {
    expect(noteSchema.parse({ ...valid, remindAt: null }).remindAt).toBeNull();
  });

  it('rejects a record whose body is missing entirely', () => {
    const { body: _body, ...withoutBody } = valid;
    expect(noteSchema.safeParse(withoutBody).success).toBe(false);
  });

  it('rejects a body longer than the configured cap', () => {
    expect(noteSchema.safeParse({ ...valid, body: 'x'.repeat(MAX_BODY_LENGTH + 1) }).success).toBe(
      false,
    );
  });
});

describe('sanitizeNotesWithReport', () => {
  it('recovers the readable notes and reports the rest', () => {
    // Four unreadable shapes and one valid note.
    const report = sanitizeNotesWithReport([valid, null, 42, {}, []]);

    expect(report.notes).toHaveLength(1);
    expect(report.dropped).toBe(4);
  });

  it('drops duplicates so React keys stay unique', () => {
    const report = sanitizeNotesWithReport([valid, { ...valid }]);
    expect(report.notes).toHaveLength(1);
    expect(report.dropped).toBe(1);
  });

  it('repairs fields instead of discarding an otherwise readable note', () => {
    const report = sanitizeNotesWithReport([{ ...valid, status: 99, pinned: null }]);

    expect(report.dropped).toBe(0);
    expect(report.notes[0]).toMatchObject({ status: 'open', pinned: false, title: 'Hello' });
  });

  it.each([[undefined], [null], ['a string'], [7], [{}], [true]])(
    'returns an empty list for non-array input: %s',
    (input) => {
      expect(sanitizeNotes(input)).toEqual([]);
    },
  );

  it('preserves order for valid records', () => {
    const second = { ...valid, id: 'note-2', title: 'Second' };
    expect(sanitizeNotes([valid, second]).map((note) => note.id)).toEqual(['note-1', 'note-2']);
  });
});

describe('backupSchema', () => {
  const envelope = { app: 'notewisp', schemaVersion: 1, exportedAt: 5, notes: [] };

  it('accepts a file this extension wrote', () => {
    expect(backupSchema.safeParse(envelope).success).toBe(true);
  });

  it('rejects a file from another application', () => {
    expect(backupSchema.safeParse({ ...envelope, app: 'other' }).success).toBe(false);
  });

  it('rejects a file with no notes array', () => {
    expect(backupSchema.safeParse({ ...envelope, notes: 'none' }).success).toBe(false);
  });

  it('leaves individual notes to the per-entry sanitizer', () => {
    // One unreadable entry must not fail the whole import.
    const parsed = backupSchema.parse({ ...envelope, notes: [{ bad: true }] });
    expect(sanitizeNotes(parsed.notes)).toEqual([]);
  });
});
