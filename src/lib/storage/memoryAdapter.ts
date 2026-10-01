import type { StorageAdapter } from './adapter';

/**
 * In-memory {@link StorageAdapter}.
 *
 * Values are deep-copied on the way in and out, mirroring `chrome.storage`'s
 * structured-clone semantics. Without that, a test could pass while production
 * code accidentally relied on mutating a stored object by reference.
 */
export class MemoryAdapter implements StorageAdapter {
  private readonly store: Map<string, unknown>;

  constructor(seed: Record<string, unknown> = {}) {
    this.store = new Map();
    for (const [key, value] of Object.entries(seed)) {
      this.store.set(key, clone(value));
    }
  }

  get<T = unknown>(key: string): Promise<T | undefined> {
    return Promise.resolve(this.store.has(key) ? (clone(this.store.get(key)) as T) : undefined);
  }

  getMany(keys: readonly string[]): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      if (this.store.has(key)) result[key] = clone(this.store.get(key));
    }
    return Promise.resolve(result);
  }

  set(key: string, value: unknown): Promise<void> {
    this.store.set(key, clone(value));
    return Promise.resolve();
  }

  remove(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }
}

/** `structuredClone` is available in Node 18+ and every target browser. */
function clone<T>(value: T): T {
  return value === undefined ? value : structuredClone(value);
}

export function createMemoryAdapter(seed?: Record<string, unknown>): MemoryAdapter {
  return new MemoryAdapter(seed);
}
