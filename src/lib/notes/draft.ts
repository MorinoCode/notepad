import { z } from 'zod';

import type { StorageAdapter } from '@/lib/storage/adapter';
import { JsonStore, type Validator } from '@/lib/storage/jsonStore';
import { STORAGE_KEYS, type DraftState } from '@/lib/storage/schema';
import type { Matches } from '@/lib/util/types';

import { MAX_BODY_LENGTH } from './text';

/**
 * A browser popup is destroyed the moment it loses focus, which is the single
 * most common way note-taking extensions lose a user's typing. The composer
 * therefore writes a draft on every keystroke (debounced) and restores it on open.
 */
export const draftSchema = z.object({
  body: z.string().max(MAX_BODY_LENGTH),
  remindAt: z.number().int().nonnegative().nullable().catch(null),
  savedAt: z
    .number()
    .int()
    .nonnegative()
    .catch(() => 0),
});

export const __draftSchemaMatchesInterface: Matches<z.infer<typeof draftSchema>, DraftState> = true;

export const EMPTY_DRAFT: DraftState = { body: '', remindAt: null, savedAt: 0 };

/** True when there is nothing worth restoring, so the draft can be dropped. */
export function isDraftEmpty(draft: DraftState | null | undefined): boolean {
  if (draft === null || draft === undefined) return true;
  return draft.body.trim().length === 0 && draft.remindAt === null;
}

export function createDraftStore(adapter: StorageAdapter): JsonStore<DraftState> {
  return new JsonStore<DraftState>(
    adapter,
    STORAGE_KEYS.draft,
    draftSchema as Validator<DraftState>,
    EMPTY_DRAFT,
  );
}
