import type { StorageAdapter } from '@/lib/storage/adapter';
import { STORAGE_KEYS } from '@/lib/storage/schema';
import { createWriteQueue, type WriteQueue } from '@/lib/storage/writeQueue';

import { countActiveNotes } from './limits';
import { sanitizeNotesWithReport } from './noteSchema';
import { sortNotes } from './search';
import { deriveTitle, normalizeBody } from './text';
import type { NewNoteInput, Note, NotePatch } from './types';

export interface NotesRepositoryOptions {
  /** Injectable clock so reminder logic is deterministic under test. */
  now?: () => number;
  /** Injectable id source so tests produce stable ids. */
  createId?: () => string;
  /** Share one queue across every writer to the same storage area. */
  queue?: WriteQueue;
}

interface Mutation<T> {
  next: Note[];
  result: T;
}

export type CreateOutcome = { ok: true; note: Note } | { ok: false; reason: 'limit_reached' };

function buildNote(id: string, input: NewNoteInput, now: number): Note {
  const body = normalizeBody(input.body);
  return {
    id,
    title: deriveTitle(body),
    body,
    status: input.status ?? 'open',
    pinned: false,
    color: input.color ?? 'default',
    createdAt: now,
    updatedAt: now,
    remindAt: input.remindAt ?? null,
    notifiedAt: null,
  };
}

/**
 * All note persistence lives here.
 *
 * The repository is deliberately framework-free: it takes a {@link StorageAdapter},
 * contains no browser API calls and no React, and therefore runs unmodified in
 * both the service worker and the test suite.
 */
export class NotesRepository {
  readonly #adapter: StorageAdapter;
  readonly #now: () => number;
  readonly #createId: () => string;
  readonly #enqueue: WriteQueue;

  constructor(adapter: StorageAdapter, options: NotesRepositoryOptions = {}) {
    this.#adapter = adapter;
    this.#now = options.now ?? Date.now;
    this.#createId = options.createId ?? defaultIdFactory;
    this.#enqueue = options.queue ?? createWriteQueue();
  }

  /** Notes in display order. Missing or corrupt storage yields an empty list. */
  async list(): Promise<Note[]> {
    return sortNotes(await this.#read());
  }

  /** Notes in raw storage order, plus how many records had to be discarded. */
  async readWithReport(): Promise<{ notes: Note[]; dropped: number }> {
    const raw = await this.#adapter.get(STORAGE_KEYS.notes);
    return sanitizeNotesWithReport(raw);
  }

  async getById(id: string): Promise<Note | null> {
    const notes = await this.#read();
    return notes.find((note) => note.id === id) ?? null;
  }

  async countActive(): Promise<number> {
    return countActiveNotes(await this.#read());
  }

  async create(input: NewNoteInput): Promise<Note> {
    return this.#mutate((notes) => {
      const note = buildNote(this.#createId(), input, this.#now());
      return { next: [...notes, note], result: note };
    });
  }

  /**
   * Create a note only if the free-tier allowance permits it.
   *
   * The check runs *inside* the queued mutation, so two rapid saves cannot both
   * pass a stale count and land an extra note past the paywall.
   */
  async createWithinLimit(input: NewNoteInput, limit: number | null): Promise<CreateOutcome> {
    // The type argument is explicit: inference would latch onto whichever branch
    // it sees first and reject the other.
    return this.#mutate<CreateOutcome>((notes) => {
      if (limit !== null && countActiveNotes(notes) >= limit) {
        return { next: notes, result: { ok: false, reason: 'limit_reached' } as const };
      }
      const note = buildNote(this.#createId(), input, this.#now());
      return { next: [...notes, note], result: { ok: true, note } as const };
    });
  }

  async update(id: string, patch: NotePatch): Promise<Note | null> {
    return this.#mutate((notes) => {
      const index = notes.findIndex((note) => note.id === id);
      const existing = notes[index];
      if (index === -1 || existing === undefined) return { next: notes, result: null };

      const body = patch.body === undefined ? existing.body : normalizeBody(patch.body);
      const remindAt = patch.remindAt === undefined ? existing.remindAt : patch.remindAt;
      const reminderChanged = remindAt !== existing.remindAt;

      const updated: Note = {
        ...existing,
        body,
        title: deriveTitle(body),
        status: patch.status ?? existing.status,
        pinned: patch.pinned ?? existing.pinned,
        color: patch.color !== undefined ? patch.color : existing.color,
        remindAt,
        // Moving a reminder makes the note eligible to fire again; a stale
        // `notifiedAt` would otherwise silence the new reminder.
        notifiedAt: reminderChanged ? null : existing.notifiedAt,
        updatedAt: this.#now(),
      };

      const next = [...notes];
      next[index] = updated;
      return { next, result: updated };
    });
  }

  /** Removes a note and returns it so the caller can offer an undo. */
  async remove(id: string): Promise<Note | null> {
    return this.#mutate((notes) => {
      const existing = notes.find((note) => note.id === id);
      if (existing === undefined) return { next: notes, result: null };
      return { next: notes.filter((note) => note.id !== id), result: existing };
    });
  }

  /**
   * Re-insert a removed note with its original timestamps, so undoing a delete
   * puts it back exactly where the user remembers it.
   */
  async restore(note: Note): Promise<Note> {
    return this.#mutate((notes) => {
      if (notes.some((candidate) => candidate.id === note.id)) return { next: notes, result: note };
      return { next: [...notes, note], result: note };
    });
  }

  /** Record that a reminder notification was delivered. */
  async markNotified(id: string, at: number): Promise<Note | null> {
    return this.#mutate((notes) => {
      const index = notes.findIndex((note) => note.id === id);
      const existing = notes[index];
      if (index === -1 || existing === undefined) return { next: notes, result: null };
      const updated: Note = { ...existing, notifiedAt: at };
      const next = [...notes];
      next[index] = updated;
      return { next, result: updated };
    });
  }

  /** Replace the whole collection. Used by import and by "delete all data". */
  async replaceAll(notes: readonly Note[]): Promise<Note[]> {
    return this.#mutate(() => ({ next: [...notes], result: [...notes] }));
  }

  async clear(): Promise<void> {
    await this.#enqueue(async () => {
      await this.#adapter.set(STORAGE_KEYS.notes, []);
    });
  }

  /**
   * The single write primitive.
   *
   * The read happens *inside* the queued task, so no concurrent mutation can slip
   * between reading the collection and writing it back.
   */
  async #mutate<T>(mutator: (notes: Note[]) => Mutation<T>): Promise<T> {
    return this.#enqueue(async () => {
      const notes = await this.#read();
      const { next, result } = mutator(notes);
      await this.#adapter.set(STORAGE_KEYS.notes, next);
      return result;
    });
  }

  async #read(): Promise<Note[]> {
    const raw = await this.#adapter.get(STORAGE_KEYS.notes);
    return sanitizeNotesWithReport(raw).notes;
  }
}

/** `crypto.randomUUID` exists in every extension context; the fallback is defensive. */
export function defaultIdFactory(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createNotesRepository(
  adapter: StorageAdapter,
  options?: NotesRepositoryOptions,
): NotesRepository {
  return new NotesRepository(adapter, options);
}
