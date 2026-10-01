import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { OptionsApp } from '@/components/options/OptionsApp';
import { currentLocale } from '@/hooks/useLocale';
import { applyThemeClass, systemPrefersDark } from '@/hooks/useTheme';
import { DEFAULT_BILLING_STATE } from '@/lib/billing/types';
import { EMPTY_DRAFT } from '@/lib/notes/draft';
import { resolveTheme } from '@/lib/settings';
import { readLocalSnapshot, type LocalSnapshot } from '@/lib/snapshot';
import { chromeLocalAdapter } from '@/lib/storage/chromeAdapter';
import { DEFAULT_SETTINGS } from '@/lib/storage/schema';

import '@/styles/tailwind.css';

/** Mirrors the popup bootstrap: read once locally, apply the theme, then render. */
async function start(): Promise<void> {
  document.documentElement.lang = currentLocale();

  let snapshot: LocalSnapshot;
  try {
    snapshot = await readLocalSnapshot(chromeLocalAdapter());
  } catch (cause) {
    console.error('[notewisp] could not read local storage', cause);
    snapshot = {
      notes: [],
      billing: DEFAULT_BILLING_STATE,
      settings: DEFAULT_SETTINGS,
      draft: EMPTY_DRAFT,
    };
  }

  applyThemeClass(resolveTheme(snapshot.settings.theme, systemPrefersDark()));

  const container = document.getElementById('root');
  if (container === null) throw new Error('Notewisp: missing #root element');

  createRoot(container).render(
    <StrictMode>
      <OptionsApp initial={snapshot} />
    </StrictMode>,
  );
}

void start();
