import { useEffect, useState } from 'react';

/**
 * Debounce a value.
 *
 * Used for two things that both matter to perceived quality: keeping draft
 * autosave off the per-keystroke path, and keeping list filtering responsive on
 * large collections.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
