import { z } from 'zod';

import { NOTE_STATUSES } from '@/lib/notes/types';
import type { StorageAdapter } from '@/lib/storage/adapter';
import { JsonStore, type Validator } from '@/lib/storage/jsonStore';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  type Settings,
  type ThemePreference,
} from '@/lib/storage/schema';
import type { Matches } from '@/lib/util/types';

export const settingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark', 'oled', 'sepia']).catch('system'),
  defaultStatus: z.enum(NOTE_STATUSES).catch('open'),
  remindersEnabled: z.boolean().catch(true),
});

export const __settingsSchemaMatchesInterface: Matches<
  z.infer<typeof settingsSchema>,
  Settings
> = true;

export type ResolvedTheme = 'light' | 'dark' | 'oled' | 'sepia';

/**
 * Turn a stored preference into a concrete theme.
 *
 * Pure so the "system" branch can be tested without touching `matchMedia`.
 */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

export function createSettingsStore(adapter: StorageAdapter): JsonStore<Settings> {
  return new JsonStore<Settings>(
    adapter,
    STORAGE_KEYS.settings,
    settingsSchema as Validator<Settings>,
    DEFAULT_SETTINGS,
  );
}
