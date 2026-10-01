import { BILLING_CACHE_TTL_MS, toBillingState } from '@/lib/billing/billingService';
import { billingSchema, DEFAULT_BILLING, type BillingState } from '@/lib/billing/types';
import type { NotesStateDto } from '@/lib/messaging';
import { draftSchema, EMPTY_DRAFT } from '@/lib/notes/draft';
import { sanitizeNotes } from '@/lib/notes/noteSchema';
import { toNotesState } from '@/lib/notes/state';
import type { Note } from '@/lib/notes/types';
import { settingsSchema } from '@/lib/settings';
import type { StorageAdapter } from '@/lib/storage/adapter';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  type DraftState,
  type Settings,
} from '@/lib/storage/schema';

export interface LocalSnapshot {
  notes: Note[];
  /** Ready to render: staleness is resolved here, outside React. */
  billing: BillingState;
  settings: Settings;
  draft: DraftState;
}

/**
 * Everything the popup needs for its first paint, in **one** storage call.
 *
 * The popup can read `chrome.storage.local` in a couple of milliseconds, whereas
 * asking the service worker means waiting for it to wake up first. So the popup
 * paints from this snapshot immediately and then reconciles with the
 * authoritative state from the background.
 *
 * Writes still go exclusively through the background, so this read shortcut can
 * never cause a lost update.
 */
export async function readLocalSnapshot(adapter: StorageAdapter): Promise<LocalSnapshot> {
  const raw = await adapter.getMany([
    STORAGE_KEYS.notes,
    STORAGE_KEYS.billing,
    STORAGE_KEYS.settings,
    STORAGE_KEYS.draft,
  ]);

  const billing = billingSchema.safeParse(raw[STORAGE_KEYS.billing]);
  const settings = settingsSchema.safeParse(raw[STORAGE_KEYS.settings]);
  const draft = draftSchema.safeParse(raw[STORAGE_KEYS.draft]);

  return {
    notes: sanitizeNotes(raw[STORAGE_KEYS.notes]),
    // Resolved on the way out so components never read the clock during render.
    billing: toBillingState(
      billing.success ? billing.data : DEFAULT_BILLING,
      Date.now(),
      BILLING_CACHE_TTL_MS,
    ),
    settings: settings.success ? settings.data : DEFAULT_SETTINGS,
    draft: draft.success ? draft.data : EMPTY_DRAFT,
  };
}

/** Convert a snapshot into the same payload the background returns. */
export function snapshotToState(snapshot: LocalSnapshot): NotesStateDto {
  return toNotesState(snapshot.notes, snapshot.billing.isPaid);
}
