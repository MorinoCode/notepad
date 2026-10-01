/**
 * The storage seam.
 *
 * Production uses `chrome.storage.local`; tests use an in-memory implementation.
 * Keeping the surface this small is what makes the whole domain layer testable in
 * plain Node with no browser present.
 */
export interface StorageAdapter {
  get<T = unknown>(key: string): Promise<T | undefined>;
  /** Single round trip for several keys, used when the popup hydrates. */
  getMany(keys: readonly string[]): Promise<Record<string, unknown>>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}
