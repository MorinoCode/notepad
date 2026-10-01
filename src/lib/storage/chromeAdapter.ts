import { browser } from 'wxt/browser';

import type { StorageAdapter } from './adapter';

/**
 * {@link StorageAdapter} backed by `chrome.storage.local`.
 *
 * `chrome.storage.local` is chosen over `sync` on purpose: `sync` caps items at
 * 8KB and the whole area at 100KB, which a note collection would blow through,
 * and its write quota would make autosave feel unreliable.
 */
export function createChromeStorageAdapter(area: 'local' = 'local'): StorageAdapter {
  const store = browser.storage[area];

  return {
    async get<T>(key: string): Promise<T | undefined> {
      const result = (await store.get(key)) as Record<string, unknown>;
      return result[key] as T | undefined;
    },
    async getMany(keys: readonly string[]): Promise<Record<string, unknown>> {
      return (await store.get([...keys])) as Record<string, unknown>;
    },
    async set(key: string, value: unknown): Promise<void> {
      await store.set({ [key]: value });
    },
    async remove(key: string): Promise<void> {
      await store.remove(key);
    },
  };
}

let cached: StorageAdapter | null = null;

/**
 * Lazily created singleton. Laziness matters because merely importing this module
 * must not touch the `browser` global — that keeps it importable in tests and
 * during SSR-style tooling runs.
 */
export function chromeLocalAdapter(): StorageAdapter {
  cached ??= createChromeStorageAdapter('local');
  return cached;
}
