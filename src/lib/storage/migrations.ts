import type { StorageAdapter } from './adapter';
import { sanitizeNotesWithReport } from '@/lib/notes/noteSchema';
import { SCHEMA_VERSION, STORAGE_KEYS } from './schema';

/** The raw, untrusted storage state a migration operates on. */
export interface RawStorageState {
  meta: unknown;
  notes: unknown;
}

export interface StorageMigration {
  /** Version this migration produces. */
  to: number;
  description: string;
  up: (state: RawStorageState) => RawStorageState;
}

export interface MigrationOutcome {
  state: RawStorageState;
  /** Versions that were applied, in order. Empty when nothing needed doing. */
  applied: number[];
}

/**
 * Version 0 → 1.
 *
 * State written before versioning existed has no metadata record, so it is
 * reported as version 0. This migration drops records that cannot be read as a
 * note and stamps the current version.
 */
const preVersionedToV1: StorageMigration = {
  to: 1,
  description: 'Sanitize the note collection and stamp the storage version.',
  up: (state) => {
    const { notes, dropped } = sanitizeNotesWithReport(state.notes);
    if (dropped > 0) {
      console.warn(`[notewisp] migration dropped ${dropped} unreadable note record(s)`);
    }
    return {
      meta: { schemaVersion: 1, createdAt: readCreatedAt(state.meta) },
      notes,
    };
  },
};

export const STORAGE_MIGRATIONS: readonly StorageMigration[] = [preVersionedToV1];

/** The version recorded in storage, or 0 when there is no usable record. */
export function readSchemaVersion(meta: unknown): number {
  if (typeof meta !== 'object' || meta === null) return 0;
  const value = (meta as Record<string, unknown>)['schemaVersion'];
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

function readCreatedAt(meta: unknown): number {
  if (typeof meta !== 'object' || meta === null) return Date.now();
  const value = (meta as Record<string, unknown>)['createdAt'];
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : Date.now();
}

/**
 * Apply every pending migration.
 *
 * Pure and deterministic so the upgrade path can be tested without a browser.
 * Unknown *future* versions are left untouched rather than downgraded — that
 * happens when a user runs an older build after a newer one (a downgraded
 * install, or two profiles sharing storage), and silently rewriting their data
 * would lose fields this build does not understand.
 */
export function migrateStorage(
  state: RawStorageState,
  migrations: readonly StorageMigration[] = STORAGE_MIGRATIONS,
  targetVersion: number = SCHEMA_VERSION,
): MigrationOutcome {
  let current = state;
  let version = readSchemaVersion(state.meta);
  const applied: number[] = [];

  if (version > targetVersion) return { state, applied: [] };

  const ordered = [...migrations].sort((a, b) => a.to - b.to);
  for (const migration of ordered) {
    if (migration.to <= version || migration.to > targetVersion) continue;
    current = migration.up(current);
    applied.push(migration.to);
    version = migration.to;
  }

  return { state: current, applied };
}

/**
 * Run migrations against real storage and persist the result.
 *
 * Called once from the service worker on install and startup.
 */
export async function runStorageMigrations(adapter: StorageAdapter): Promise<number[]> {
  const raw = await adapter.getMany([STORAGE_KEYS.meta, STORAGE_KEYS.notes]);
  const outcome = migrateStorage({
    meta: raw[STORAGE_KEYS.meta],
    notes: raw[STORAGE_KEYS.notes],
  });

  if (outcome.applied.length === 0) return [];

  // Notes first: if the write is interrupted, an older meta means the migration
  // simply runs again next time, which is safe because it is idempotent.
  await adapter.set(STORAGE_KEYS.notes, outcome.state.notes);
  await adapter.set(STORAGE_KEYS.meta, outcome.state.meta);
  return outcome.applied;
}
