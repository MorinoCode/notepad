import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeAll, describe, expect, it } from 'vitest';

import { App } from '@/components/popup/App';
import { DEFAULT_BILLING_STATE } from '@/lib/billing/types';
import { EMPTY_DRAFT } from '@/lib/notes/draft';
import type { Note } from '@/lib/notes/types';
import type { LocalSnapshot } from '@/lib/snapshot';
import { DEFAULT_SETTINGS } from '@/lib/storage/schema';

/*
 * A render smoke test.
 *
 * Unit tests cover the domain logic exhaustively, but nothing else proves the
 * popup component tree can actually mount — that hooks are called in a valid
 * order, that the Tailwind entry imports cleanly, and that a missing background
 * service worker degrades instead of blanking the popup.
 */

const NOW = 1_700_000_000_000;

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Buy oat milk',
    body: 'Buy oat milk\nand coffee',
    status: 'open',
    pinned: false,
    createdAt: NOW,
    updatedAt: NOW,
    remindAt: null,
    notifiedAt: null,
    ...overrides,
  };
}

function snapshot(notes: Note[]): LocalSnapshot {
  return {
    notes,
    billing: DEFAULT_BILLING_STATE,
    settings: DEFAULT_SETTINGS,
    draft: EMPTY_DRAFT,
  };
}

let root: Root | null = null;

/**
 * Render and let the mounting effects settle.
 *
 * The flush matters: `useNotes` kicks off a background request on mount, and
 * without draining it React reports the resulting state update as an unwrapped
 * `act`, which would bury real warnings in noise.
 */
async function renderApp(initial: LocalSnapshot): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(<App initial={initial} />);
    await Promise.resolve();
  });

  return container;
}

beforeAll(() => {
  // React only emits act() warnings when it knows it is in a test environment.
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('popup App', () => {
  it('mounts with a composer, search field and the captured notes', async () => {
    const container = await renderApp(
      snapshot([note(), note({ id: 'note-2', title: 'Ship v1', status: 'done' })]),
    );

    expect(container.querySelector('textarea')).not.toBeNull();
    expect(container.querySelector('input[type="search"]')).not.toBeNull();

    const titles = [...container.querySelectorAll('li')].map((item) => item.textContent ?? '');
    expect(titles).toHaveLength(2);
    expect(titles.join(' ')).toContain('Buy oat milk');
    expect(titles.join(' ')).toContain('Ship v1');
  });

  it('mounts on a fresh install with no notes at all', async () => {
    const container = await renderApp(snapshot([]));

    expect(container.querySelector('textarea')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });

  it('keeps the notes on screen when the background worker is unreachable', async () => {
    // No message handler is registered in this environment, which models the
    // service worker being asleep or torn down mid-request.
    const container = await renderApp(snapshot([note()]));

    expect(container.textContent).toContain('Buy oat milk');
    expect(container.querySelector('textarea')).not.toBeNull();
  });
});
