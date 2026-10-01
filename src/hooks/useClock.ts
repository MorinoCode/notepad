import { useSyncExternalStore } from 'react';

/** How often the rendered "now" advances. */
export const CLOCK_INTERVAL_MS = 30_000;

interface ClockStore {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => number;
}

function createClockStore(intervalMs: number): ClockStore {
  const listeners = new Set<() => void>();
  let timer: number | null = null;

  /*
   * The snapshot is bucketed to the tick interval, so React sees a stable value
   * between ticks instead of a new number on every read (which would re-render
   * forever). Reading the wall clock here — rather than in a component body — is
   * what keeps components pure.
   */
  const getSnapshot = () => Math.floor(Date.now() / intervalMs) * intervalMs;

  function subscribe(onChange: () => void): () => void {
    listeners.add(onChange);
    timer ??= window.setInterval(() => {
      for (const listener of listeners) listener();
    }, intervalMs);

    return () => {
      listeners.delete(onChange);
      if (listeners.size === 0 && timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };
  }

  return { subscribe, getSnapshot };
}

const stores = new Map<number, ClockStore>();

function storeFor(intervalMs: number): ClockStore {
  let store = stores.get(intervalMs);
  if (store === undefined) {
    store = createClockStore(intervalMs);
    stores.set(intervalMs, store);
  }
  return store;
}

/**
 * The current time, refreshed on an interval.
 *
 * Two problems are solved by routing the clock through `useSyncExternalStore`.
 * Components stay pure (reading `Date.now()` during render is not), and relative
 * labels stay honest — a popup left open for five minutes would otherwise still
 * claim a note was edited "just now".
 */
export function useClock(intervalMs: number = CLOCK_INTERVAL_MS): number {
  const store = storeFor(intervalMs);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
