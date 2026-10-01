import { describe, expect, it } from 'vitest';

import { createSettingsStore, resolveTheme, settingsSchema } from '@/lib/settings';
import { JsonStore, type Validator } from '@/lib/storage/jsonStore';
import { DEFAULT_SETTINGS, STORAGE_KEYS, type Settings } from '@/lib/storage/schema';
import { createMemoryAdapter } from '@/lib/storage/memoryAdapter';

describe('resolveTheme', () => {
  it('follows the operating system when set to system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('honours an explicit choice over the system setting', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });
});

describe('settingsSchema', () => {
  it('accepts the defaults', () => {
    expect(settingsSchema.parse(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });

  it('repairs an unknown theme to system', () => {
    expect(settingsSchema.parse({ ...DEFAULT_SETTINGS, theme: 'neon' }).theme).toBe('system');
  });

  it('repairs an unknown default status to open', () => {
    expect(
      settingsSchema.parse({ ...DEFAULT_SETTINGS, defaultStatus: 'later' }).defaultStatus,
    ).toBe('open');
  });

  it('repairs a non-boolean reminders flag', () => {
    expect(
      settingsSchema.parse({ ...DEFAULT_SETTINGS, remindersEnabled: 'yes' }).remindersEnabled,
    ).toBe(true);
  });

  it('falls back entirely for a corrupt record', () => {
    expect(settingsSchema.safeParse('not settings').success).toBe(false);
  });
});

describe('createSettingsStore', () => {
  it('returns the defaults when nothing is stored', async () => {
    const store = createSettingsStore(createMemoryAdapter());
    await expect(store.read()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips a change', async () => {
    const adapter = createMemoryAdapter();
    const store = createSettingsStore(adapter);

    const next = await store.update((current) => ({ ...current, theme: 'dark' as const }));
    expect(next.theme).toBe('dark');
    expect(await store.read()).toMatchObject({ theme: 'dark' });
  });

  it('ignores a corrupt record rather than crashing', async () => {
    const adapter = createMemoryAdapter({ [STORAGE_KEYS.settings]: { theme: 42, junk: [] } });
    const store = createSettingsStore(adapter);

    // Every field is repaired individually, so a partially valid record still
    // yields usable settings instead of resetting everything.
    await expect(store.read()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('clears back to the defaults', async () => {
    const adapter = createMemoryAdapter();
    const store = createSettingsStore(adapter);
    await store.write({ ...DEFAULT_SETTINGS, theme: 'dark' });

    await store.clear();
    await expect(store.read()).resolves.toEqual(DEFAULT_SETTINGS);
  });
});

describe('JsonStore', () => {
  const fallback: Settings = DEFAULT_SETTINGS;
  const validator: Validator<Settings> = {
    safeParse: (value: unknown) =>
      typeof value === 'object' && value !== null
        ? ({ success: true, data: value as Settings } as const)
        : ({ success: false, error: 'not an object' } as const),
  };

  it('uses the fallback for missing data', async () => {
    const store = new JsonStore(createMemoryAdapter(), 'test:key', validator, fallback);
    await expect(store.read()).resolves.toBe(fallback);
  });

  it('uses the fallback when validation fails', async () => {
    const adapter = createMemoryAdapter({ 'test:key': 'a string' });
    const store = new JsonStore(adapter, 'test:key', validator, fallback);

    await expect(store.read()).resolves.toBe(fallback);
  });

  it('passes validated data through', async () => {
    const adapter = createMemoryAdapter({ 'test:key': { theme: 'dark' } });
    const store = new JsonStore(adapter, 'test:key', validator, fallback);

    await expect(store.read()).resolves.toEqual({ theme: 'dark' });
  });

  it('update reads, changes and writes in one step', async () => {
    const adapter = createMemoryAdapter({ 'test:key': { theme: 'light' } });
    const store = new JsonStore<Settings>(adapter, 'test:key', validator, fallback);

    await store.update((current) => ({ ...current, theme: 'dark' }));
    await expect(store.read()).resolves.toEqual({ theme: 'dark' });
  });
});
