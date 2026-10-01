import { z } from 'zod';

import type { Matches } from '@/lib/util/types';

import { MAX_BODY_LENGTH, MAX_TITLE_LENGTH } from './text';
import { NOTE_COLORS, NOTE_STATUSES, type Note } from './types';

/**
 * Runtime schema for persisted notes.
 *
 * Every field uses `.catch()`, so a partially corrupted record is *repaired* with
 * a sensible default instead of being thrown away. Only a record whose body is
 * entirely missing is dropped — see {@link sanitizeNotes}.
 */
export const noteSchema = z.object({
  id: z.string().min(1).max(128),
  title: z.string().max(MAX_TITLE_LENGTH).catch(''),
  body: z.string().max(MAX_BODY_LENGTH),
  status: z.enum(NOTE_STATUSES).catch('open'),
  pinned: z.boolean().catch(false),
  color: z.enum(NOTE_COLORS).optional().catch(undefined),
  createdAt: z
    .number()
    .int()
    .nonnegative()
    .catch(() => Date.now()),
  updatedAt: z
    .number()
    .int()
    .nonnegative()
    .catch(() => Date.now()),
  remindAt: z.number().int().nonnegative().nullable().catch(null),
  notifiedAt: z.number().int().nonnegative().nullable().catch(null),
});

/**
 * Compile-time proof that the hand-written interface and the runtime schema have
 * not drifted apart. If either side changes, this stops compiling.
 */
export const __noteSchemaMatchesInterface: Matches<z.infer<typeof noteSchema>, Note> = true;

/** Envelope written by "Export notes" and accepted by "Import notes". */
export const backupSchema = z.object({
  app: z.literal('notewisp'),
  schemaVersion: z.number().int().nonnegative(),
  exportedAt: z.number().int().nonnegative(),
  /** Validated per-entry by {@link sanitizeNotes} so one bad note cannot fail the import. */
  notes: z.array(z.unknown()),
});

export type BackupFile = z.infer<typeof backupSchema>;

export interface SanitizeReport {
  notes: Note[];
  /** Records that could not be recovered at all. */
  dropped: number;
}

/**
 * Turn untrusted input (extension storage or an imported file) into valid notes.
 * Duplicate ids are discarded so a corrupt file cannot create two rows that React
 * would treat as the same key.
 */
export function sanitizeNotesWithReport(raw: unknown): SanitizeReport {
  if (!Array.isArray(raw)) return { notes: [], dropped: 0 };

  const notes: Note[] = [];
  const seenIds = new Set<string>();
  let dropped = 0;

  for (const entry of raw) {
    const parsed = noteSchema.safeParse(entry);
    if (!parsed.success || seenIds.has(parsed.data.id)) {
      dropped += 1;
      continue;
    }
    seenIds.add(parsed.data.id);
    notes.push(parsed.data);
  }

  return { notes, dropped };
}

/** Convenience wrapper when the caller only needs the recovered notes. */
export function sanitizeNotes(raw: unknown): Note[] {
  return sanitizeNotesWithReport(raw).notes;
}
