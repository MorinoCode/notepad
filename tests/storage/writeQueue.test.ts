import { describe, expect, it } from 'vitest';

import { createWriteQueue } from '@/lib/storage/writeQueue';

describe('createWriteQueue', () => {
  it('runs tasks strictly one at a time, in submission order', async () => {
    const enqueue = createWriteQueue();
    const events: string[] = [];

    const task = (name: string, delayMs: number) => () =>
      new Promise<void>((resolve) => {
        events.push(`${name}:start`);
        setTimeout(() => {
          events.push(`${name}:end`);
          resolve();
        }, delayMs);
      });

    // The first task is the slowest, which would interleave under concurrency.
    await Promise.all([enqueue(task('a', 20)), enqueue(task('b', 0)), enqueue(task('c', 0))]);

    expect(events).toEqual(['a:start', 'a:end', 'b:start', 'b:end', 'c:start', 'c:end']);
  });

  it('returns each task its own result', async () => {
    const enqueue = createWriteQueue();
    const [first, second] = await Promise.all([
      enqueue(() => Promise.resolve(1)),
      enqueue(() => Promise.resolve(2)),
    ]);

    expect([first, second]).toEqual([1, 2]);
  });

  it('surfaces a failure to its own caller but keeps the chain usable', async () => {
    const enqueue = createWriteQueue();

    await expect(enqueue(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(enqueue(() => Promise.resolve('still works'))).resolves.toBe('still works');
  });
});
