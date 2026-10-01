import { beforeEach, describe, expect, it } from 'vitest';

import { NotesRepository } from '@/lib/notes/repository';
import { STORAGE_KEYS } from '@/lib/storage/schema';
import { createMemoryAdapter, type MemoryAdapter } from '@/lib/storage/memoryAdapter';

const START = new Date(2026, 0, 15, 10, 0, 0).getTime();

function createRepository(adapter: MemoryAdapter, startAt = START) {
  let clock = startAt;
  let counter = 0;
  const repository = new NotesRepository(adapter, {
    now: () => clock,
    createId: () => {
      counter += 1;
      return `note-${counter}`;
    },
  });
  return { repository, advance: (ms: number) => (clock += ms) };
}

describe('NotesRepository', () => {
  let adapter: MemoryAdapter;

  beforeEach(() => {
    adapter = createMemoryAdapter();
  });

  it('returns an empty list when storage has never been written', async () => {
    const { repository } = createRepository(adapter);
    await expect(repository.list()).resolves.toEqual([]);
  });

  it('derives the title from the first non-empty line', async () => {
    const { repository } = createRepository(adapter);
    const note = await repository.create({ body: '\n\n  Buy milk  \nand eggs' });

    expect(note.title).toBe('Buy milk');
    expect(note.body).toBe('\n\n  Buy milk  \nand eggs');
    expect(note.status).toBe('open');
    expect(note.pinned).toBe(false);
    expect(note.createdAt).toBe(START);
    expect(note.notifiedAt).toBeNull();
  });

  it('persists notes and lists the most recent first', async () => {
    const { repository, advance } = createRepository(adapter);
    await repository.create({ body: 'first' });
    advance(1000);
    await repository.create({ body: 'second' });

    const stored = await repository.list();
    expect(stored.map((note) => note.title)).toEqual(['second', 'first']);
  });

  it('bumps updatedAt and recomputes the title on edit', async () => {
    const { repository, advance } = createRepository(adapter);
    const note = await repository.create({ body: 'old title' });

    advance(1000);
    const updated = await repository.update(note.id, { body: 'new title\nmore' });

    expect(updated?.title).toBe('new title');
    expect(updated?.updatedAt).toBe(START + 1000);
    expect(updated?.createdAt).toBe(START);
  });

  it('clears notifiedAt when the reminder is moved, so it can fire again', async () => {
    const { repository, advance } = createRepository(adapter);
    const note = await repository.create({ body: 'ping', remindAt: START + 60_000 });
    advance(60_000);
    await repository.markNotified(note.id, START + 60_000);

    expect((await repository.getById(note.id))?.notifiedAt).toBe(START + 60_000);

    advance(60_000);
    const rescheduled = await repository.update(note.id, { remindAt: START + 300_000 });
    expect(rescheduled?.notifiedAt).toBeNull();
  });

  it('keeps notifiedAt when an unrelated field changes', async () => {
    const { repository } = createRepository(adapter);
    const note = await repository.create({ body: 'ping', remindAt: START + 60_000 });
    await repository.markNotified(note.id, START + 60_000);

    const pinned = await repository.update(note.id, { pinned: true });
    expect(pinned?.notifiedAt).toBe(START + 60_000);
  });

  it('ignores updates for notes that do not exist', async () => {
    const { repository } = createRepository(adapter);
    await expect(repository.update('missing', { body: 'x' })).resolves.toBeNull();
    await expect(repository.remove('missing')).resolves.toBeNull();
  });

  it('returns the removed note so the caller can offer an undo', async () => {
    const { repository } = createRepository(adapter);
    const note = await repository.create({ body: 'temporary' });

    const removed = await repository.remove(note.id);
    expect(removed?.id).toBe(note.id);
    expect(await repository.list()).toEqual([]);

    await repository.restore(removed!);
    expect((await repository.list()).map((candidate) => candidate.id)).toEqual([note.id]);
  });

  it('does not duplicate a note that is restored twice', async () => {
    const { repository } = createRepository(adapter);
    const note = await repository.create({ body: 'once' });
    await repository.remove(note.id);

    await repository.restore(note);
    await repository.restore(note);

    expect(await repository.list()).toHaveLength(1);
  });

  it('counts archived notes out of the active total', async () => {
    const { repository } = createRepository(adapter);
    const first = await repository.create({ body: 'one' });
    await repository.create({ body: 'two' });
    expect(await repository.countActive()).toBe(2);

    await repository.update(first.id, { status: 'archived' });
    expect(await repository.countActive()).toBe(1);
  });

  describe('createWithinLimit', () => {
    it('allows a note while the collection is under the limit', async () => {
      const { repository } = createRepository(adapter);
      await repository.create({ body: 'a' });

      const outcome = await repository.createWithinLimit({ body: 'b' }, 2);
      expect(outcome).toEqual({ ok: true, note: expect.objectContaining({ title: 'b' }) });
      expect(await repository.list()).toHaveLength(2);
    });

    it('refuses at the limit, reporting why', async () => {
      const { repository } = createRepository(adapter);
      await repository.create({ body: 'a' });
      await repository.create({ body: 'b' });

      const outcome = await repository.createWithinLimit({ body: 'c' }, 2);
      expect(outcome).toEqual({ ok: false, reason: 'limit_reached' });
      expect(await repository.list()).toHaveLength(2);
    });

    it('is unlimited when the limit is null', async () => {
      const { repository } = createRepository(adapter);
      for (let index = 0; index < 5; index += 1) {
        await repository.create({ body: `note ${index}` });
      }

      await expect(repository.createWithinLimit({ body: 'extra' }, null)).resolves.toEqual(
        expect.objectContaining({ ok: true }),
      );
      expect(await repository.list()).toHaveLength(6);
    });

    it('cannot be raced past the limit by two concurrent saves', async () => {
      const { repository } = createRepository(adapter);

      // Both calls pass a count check that would see an empty collection if the
      // check happened outside the queued read-modify-write.
      const [first, second] = await Promise.all([
        repository.createWithinLimit({ body: 'one' }, 1),
        repository.createWithinLimit({ body: 'two' }, 1),
      ]);

      const outcomes = [first.ok, second.ok].sort();
      expect(outcomes).toEqual([false, true]);
      expect(await repository.list()).toHaveLength(1);
    });
  });

  it('drops unreadable records instead of failing the whole read', async () => {
    const { repository } = createRepository(adapter);
    await repository.create({ body: 'good' });

    const raw = (await adapter.get<unknown[]>(STORAGE_KEYS.notes)) ?? [];
    await adapter.set(STORAGE_KEYS.notes, [...raw, { nonsense: true }, 'not a note']);

    const { notes, dropped } = await repository.readWithReport();
    expect(notes).toHaveLength(1);
    expect(dropped).toBe(2);
  });

  it('replaces the whole collection on import', async () => {
    const { repository } = createRepository(adapter);
    await repository.create({ body: 'native' });

    await repository.replaceAll([
      {
        id: 'imported',
        title: 'imported',
        body: 'imported',
        status: 'doing',
        pinned: true,
        createdAt: START - 5_000,
        updatedAt: START - 5_000,
        remindAt: null,
        notifiedAt: null,
      },
    ]);

    const notes = await repository.list();
    expect(notes.map((note) => note.id)).toEqual(['imported']);
  });

  it('writes notes as a plain array that survives a round trip', async () => {
    const { repository } = createRepository(adapter);
    await repository.create({ body: 'persisted' });

    const raw = await adapter.get(STORAGE_KEYS.notes);
    expect(Array.isArray(raw)).toBe(true);
  });
});
