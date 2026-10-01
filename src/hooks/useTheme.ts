import { useLayoutEffect, useState } from 'react';

import { resolveTheme, type ResolvedTheme } from '@/lib/settings';
import type { ThemePreference } from '@/lib/storage/schema';

/** Whether the operating system currently asks for a dark appearance. */
export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/**
 * Toggle the `dark` class that every semantic colour token keys off.
 *
 * Exported separately from the hook so entrypoints can apply the stored theme
 * *before* the first React render, which is what prevents a light-to-dark flash
 * when the popup opens.
 */
export function applyThemeClass(theme: ResolvedTheme): void {
  const root = document.documentElement.classList;
  root.remove('dark', 'oled', 'sepia');
  if (theme === 'dark') {
    root.add('dark');
  } else if (theme === 'oled') {
    root.add('dark', 'oled');
  } else if (theme === 'sepia') {
    root.add('sepia');
  }
}

export interface ThemeController {
  /** The theme actually in effect. */
  resolved: ResolvedTheme;
}

/**
 * Keep the document in sync with the stored preference, following the OS when
 * the preference is `system`.
 *
 * `useLayoutEffect` applies the class before the browser paints, so switching
 * themes never shows a half-themed frame.
 */
export function useTheme(preference: ThemePreference): ThemeController {
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolveTheme(preference, systemPrefersDark()),
  );

  useLayoutEffect(() => {
    let media: MediaQueryList | null = null;
    const sync = () => setResolved(resolveTheme(preference, systemPrefersDark()));

    sync();
    try {
      media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', sync);
    } catch {
      // Match on open only; the environment does not expose matchMedia.
    }

    return () => media?.removeEventListener('change', sync);
  }, [preference]);

  useLayoutEffect(() => {
    applyThemeClass(resolved);
  }, [resolved]);

  return { resolved };
}
