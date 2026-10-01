export type WriteQueue = <T>(task: () => Promise<T>) => Promise<T>;

/**
 * Serialises read-modify-write cycles.
 *
 * Every mutation is "read the whole note list, change it, write it back". If two
 * of those overlap, the second read can miss the first write and silently drop a
 * note. Chains are serialised per queue instance, so one queue must be shared by
 * everyone writing to the same storage area.
 *
 * A rejected task does not poison the chain: the tail is reset to a resolved
 * promise either way, so one failure cannot wedge every later write.
 */
export function createWriteQueue(): WriteQueue {
  let tail: Promise<unknown> = Promise.resolve();

  return <T>(task: () => Promise<T>): Promise<T> => {
    const result = tail.then(task, task);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}
