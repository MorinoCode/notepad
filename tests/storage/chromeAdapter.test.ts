import { describe, expect, it } from 'vitest';

import { chromeLocalAdapter, createChromeStorageAdapter } from '@/lib/storage/chromeAdapter';

/*
 * These run against the `chrome.*` mock that `WxtVitest` installs, so they cover
 * the real adapter rather than a stand-in: it is the seam between the promise-based
 * storage API and the rest of the app.
 */
describe('createChromeStorageAdapter', () => {
  it('round-trips a value', async () => {
    const adapter = createChromeStorageAdapter();
    await adapter.set('notewisp:test', { count: 3 });

    await expect(adapter.get('notewisp:test')).resolves.toEqual({ count: 3 });
  });

  it('returns undefined for a key that was never written', async () => {
    await expect(createChromeStorageAdapter().get('notewisp:missing')).resolves.toBeUndefined();
  });

  it('removes a key', async () => {
    const adapter = createChromeStorageAdapter();
    await adapter.set('notewisp:test', 1);
    await adapter.remove('notewisp:test');

    await expect(adapter.get('notewisp:test')).resolves.toBeUndefined();
  });

  it('reads several keys in a single call and omits the ones that are absent', async () => {
    const adapter = createChromeStorageAdapter();
    await adapter.set('notewisp:a', 1);
    await adapter.set('notewisp:b', 2);

    await expect(adapter.getMany(['notewisp:a', 'notewisp:b', 'notewisp:c'])).resolves.toEqual({
      'notewisp:a': 1,
      'notewisp:b': 2,
    });
  });

  it('handles an empty key list', async () => {
    await expect(createChromeStorageAdapter().getMany([])).resolves.toEqual({});
  });

  it('stores falsy values rather than treating them as absent', async () => {
    const adapter = createChromeStorageAdapter();
    await adapter.set('notewisp:zero', 0);
    await adapter.set('notewisp:empty', '');

    await expect(adapter.get('notewisp:zero')).resolves.toBe(0);
    await expect(adapter.get('notewisp:empty')).resolves.toBe('');
  });
});

describe('chromeLocalAdapter', () => {
  it('returns the same instance on every call', () => {
    expect(chromeLocalAdapter()).toBe(chromeLocalAdapter());
  });
});
