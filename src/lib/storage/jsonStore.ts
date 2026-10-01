import type { StorageAdapter } from './adapter';

/**
 * Structural subset of a zod schema.
 *
 * Depending on this shape instead of importing zod's generics keeps the store
 * decoupled from the validation library, and lets tests pass a two-line fake.
 */
export interface Validator<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false; error: unknown };
}

/**
 * A single key holding one validated JSON value.
 *
 * Reads never throw: corrupt or missing data falls back to the default so a bad
 * record can degrade one feature instead of breaking the whole UI.
 */
export class JsonStore<T> {
  private readonly adapter: StorageAdapter;
  private readonly key: string;
  private readonly validator: Validator<T>;
  private readonly fallback: T;

  constructor(adapter: StorageAdapter, key: string, validator: Validator<T>, fallback: T) {
    this.adapter = adapter;
    this.key = key;
    this.validator = validator;
    this.fallback = fallback;
  }

  async read(): Promise<T> {
    const raw = await this.adapter.get(this.key);
    if (raw === undefined) return this.fallback;
    const parsed = this.validator.safeParse(raw);
    return parsed.success ? parsed.data : this.fallback;
  }

  async write(value: T): Promise<void> {
    await this.adapter.set(this.key, value);
  }

  /** Read-modify-write in one call, for callers that only need to change one field. */
  async update(updater: (current: T) => T): Promise<T> {
    const next = updater(await this.read());
    await this.write(next);
    return next;
  }

  async clear(): Promise<void> {
    await this.adapter.remove(this.key);
  }
}
