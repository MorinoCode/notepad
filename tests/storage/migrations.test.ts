import { describe, expect, it, vi } from 'vitest';

import {
  migrateStorage,
  readSchemaVersion,
  runStorageMigrations,
  STORAGE_MIGRATIONS,
  type StorageMigration,
} from '@/lib/storage/migrations';
import { SCHEMA_VERSION, STORAGE_KEYS } from '@/lib/storage/schema';
import { createMemoryAdapter, type MemoryAdapter } from '@/lib/storage/memoryAdapter';

const note = {
  id: 'note-1',
  title: 'Hello',
  body: 'Hello world',
  status: 'open',
  pinned: false,
  createdAt: 1,
  updatedAt: 2,
  remindAt: null,
  notifiedAt: null,
};

describe('readSchemaVersion', () => {
  it.each([
    [undefined],
    [null],
    ['1'],
    [{}],
    [{ schemaVersion: '1' }],
    [{ schemaVersion: -1 }],
    [{ schemaVersion: 1.5 }],
  ])('treats %s as version 0', (meta) => {
    expect(readSchemaVersion(meta)).toBe(0);
  });

  it('reads a valid version', () => {
    expect(readSchemaVersion({ schemaVersion: 2 })).toBe(2);
  });

  it('accepts version 0 explicitly', () => {
    expect(readSchemaVersion({ schemaVersion: 0 })).toBe(0);
  });
});

describe('migrateStorage', () => {
  it('migrates unversioned state up to the current version', () => {
    const outcome = migrateStorage({ meta: undefined, notes: [note] });

    expect(outcome.applied).toEqual([1]);
    expect(readSchemaVersion(outcome.state.meta)).toBe(SCHEMA_VERSION);
  });

  it('keeps readable notes and drops the rest during migration', () => {
    const outcome = migrateStorage({ meta: undefined, notes: [note, { garbage: true }, null] });

    expect(outcome.state.notes).toEqual([note]);
  });

  it('warns when records had to be dropped', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    migrateStorage({ meta: undefined, notes: [note, 'nope'] });

    expect(warn).toHaveBeenCalledOnce();
  });

  it('does nothing when storage is already current', () => {
    const state = { meta: { schemaVersion: SCHEMA_VERSION }, notes: [note] };
    const outcome = migrateStorage(state);

    expect(outcome.applied).toEqual([]);
    expect(outcome.state).toBe(state);
  });

  it('leaves data from a newer build untouched instead of downgrading it', () => {
    // Happens with a downgraded install or a profile running two builds.
    const future = { meta: { schemaVersion: SCHEMA_VERSION + 5 }, notes: [{ futureField: true }] };
    const outcome = migrateStorage(future);

    expect(outcome.applied).toEqual([]);
    expect(outcome.state).toEqual(future);
  });

  it('applies only the pending migrations, in version order', () => {
    const order: number[] = [];
    const step = (to: number): StorageMigration => ({
      to,
      description: `step ${to}`,
      up: (state) => {
        order.push(to);
        return { ...state, meta: { schemaVersion: to } };
      },
    });

    const outcome = migrateStorage(
      { meta: { schemaVersion: 1 }, notes: [] },
      [step(3), step(2)],
      3,
    );

    expect(order).toEqual([2, 3]);
    expect(outcome.applied).toEqual([2, 3]);
  });

  it('stops at the target version instead of running ahead', () => {
    const applied: number[] = [];
    const step = (to: number): StorageMigration => ({
      to,
      description: `step ${to}`,
      up: (state) => {
        applied.push(to);
        return state;
      },
    });

    migrateStorage({ meta: undefined, notes: [] }, [step(1), step(2)], 1);
    expect(applied).toEqual([1]);
  });

  it('reports the shipped migration list as upgradeable to the current version', () => {
    const highest = Math.max(0, ...STORAGE_MIGRATIONS.map((migration) => migration.to));
    expect(highest).toBe(SCHEMA_VERSION);
  });

  it('is idempotent: a second run applies nothing', () => {
    const first = migrateStorage({ meta: undefined, notes: [note, 'bad'] });
    const second = migrateStorage(first.state);

    expect(second.applied).toEqual([]);
    expect(second.state.notes).toEqual(first.state.notes);
  });
});

describe('runStorageMigrations', () => {
  it('persists the migrated state', async () => {
    const adapter: MemoryAdapter = createMemoryAdapter({ [STORAGE_KEYS.notes]: [note, 'bad'] });

    const applied = await runStorageMigrations(adapter);
    expect(applied).toEqual([1]);

    expect(await adapter.get(STORAGE_KEYS.notes)).toEqual([note]);
    expect(readSchemaVersion(await adapter.get(STORAGE_KEYS.meta))).toBe(SCHEMA_VERSION);
  });

  it('writes nothing when there is nothing to do', async () => {
    const adapter = createMemoryAdapter({
      [STORAGE_KEYS.notes]: [note],
      [STORAGE_KEYS.meta]: { schemaVersion: SCHEMA_VERSION, createdAt: 1 },
    });
    const set = vi.spyOn(adapter, 'set');

    expect(await runStorageMigrations(adapter)).toEqual([]);
    expect(set).not.toHaveBeenCalled();
  });

  it('handles a completely empty storage area', async () => {
    const adapter = createMemoryAdapter();
    expect(await runStorageMigrations(adapter)).toEqual([1]);
    expect(await adapter.get(STORAGE_KEYS.notes)).toEqual([]);
  });
});
