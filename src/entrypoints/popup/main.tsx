import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/components/popup/App';
import { currentLocale } from '@/hooks/useLocale';
import { applyThemeClass, systemPrefersDark } from '@/hooks/useTheme';
import { DEFAULT_BILLING_STATE } from '@/lib/billing/types';
import { EMPTY_DRAFT } from '@/lib/notes/draft';
import { resolveTheme } from '@/lib/settings';
import { readLocalSnapshot, type LocalSnapshot } from '@/lib/snapshot';
import { chromeLocalAdapter } from '@/lib/storage/chromeAdapter';
import { DEFAULT_SETTINGS } from '@/lib/storage/schema';

import '@/styles/tailwind.css';

/**
 * The popup renders from one local storage read.
 *
 * Nothing here waits on the service worker finding a colour scheme: doing the
 * theme lookup *before* the first render is what stops the popup from flashing
 * light before switching to dark.
 */
async function start(): Promise<void> {
  document.documentElement.lang = currentLocale();

  let snapshot: LocalSnapshot;
  try {
    snapshot = await readLocalSnapshot(chromeLocalAdapter());
  } catch (cause) {
    // Storage being unreadable is not recoverable, but rendering an empty app is
    // far better than a blank popup with no explanation.
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
      <App initial={snapshot} />
    </StrictMode>,
  );
}

void start();
