import type { NoteStatus } from '@/lib/notes/types';

/**
 * Bumped whenever the persisted shape changes in a way that needs a migration.
 * See `migrations.ts`.
 */
export const SCHEMA_VERSION = 1;

/**
 * Keys are stable and unversioned; versioning lives in the metadata record so a
 * migration can read all state at once instead of guessing at key names.
 *
 * The prefix is namespacing only — it keeps our keys recognisable in the storage
 * inspector and out of the way of anything else that shares the area.
 */
export const STORAGE_KEYS = {
  notes: 'notewisp:notes',
  meta: 'notewisp:meta',
  draft: 'notewisp:draft',
  settings: 'notewisp:settings',
  billing: 'notewisp:billing',
} as const;

/** Unsaved composer content, restored if the popup closes mid-typing. */
export interface DraftState {
  body: string;
  remindAt: number | null;
  savedAt: number;
}

export type ThemePreference = 'system' | 'light' | 'dark' | 'oled' | 'sepia';

export interface Settings {
  theme: ThemePreference;
  /** Status applied to notes created from the composer. */
  defaultStatus: NoteStatus;
  /** Whether reminders raise a desktop notification at all. */
  remindersEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  // `system` is the least surprising default and matches the browser chrome.
  theme: 'system',
  defaultStatus: 'open',
  remindersEnabled: true,
};
