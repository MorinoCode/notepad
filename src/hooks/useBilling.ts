import { useCallback, useEffect, useRef, useState } from 'react';

import type { BillingState } from '@/lib/billing/types';
import { sendMessage } from '@/lib/messaging';
import { callBackground } from '@/lib/messagingClient';

/** How often we re-check entitlement while the checkout tab is open. */
const POLL_INTERVAL_MS = 2500;
/** Give up polling after this long; the next popup open re-checks anyway. */
const POLL_TIMEOUT_MS = 3 * 60_000;

export interface BillingController {
  billing: BillingState;
  /** Open the checkout page. Resolves `false` when it could not be opened. */
  upgrade: (plan?: string) => Promise<boolean>;
  /** Restore an existing subscription on this profile. */
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Entitlement state for the UI.
 *
 * After the checkout page is opened, entitlement is polled for a few minutes.
 * That is what makes the flow feel right: pay in the tab that just opened, come
 * back, and the popup has already unlocked — no "restart your browser" step.
 */
export function useBilling(initial: BillingState): BillingController {
  const [billing, setBilling] = useState<BillingState>(initial);
  const pollTimer = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current !== null) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const refresh = useCallback(async () => {
    const next = await callBackground(() => sendMessage('refreshBilling', {}));
    if (next !== null) setBilling(next);
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    const startedAt = Date.now();

    pollTimer.current = window.setInterval(() => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        stopPolling();
        return;
      }
      void (async () => {
        const next = await callBackground(() => sendMessage('refreshBilling', {}));
        if (next === null) return;
        setBilling(next);
        if (next.isPaid) stopPolling();
      })();
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  const upgrade = useCallback(
    async (plan?: string) => {
      const result = await callBackground(() =>
        sendMessage('openPaymentPage', plan === undefined ? {} : { plan }),
      );
      if (result === null || !result.opened) return false;
      startPolling();
      return true;
    },
    [startPolling],
  );

  const restore = useCallback(async () => {
    const result = await callBackground(() => sendMessage('openLoginPage', {}));
    if (result === null) return false;
    startPolling();
    return result.opened;
  }, [startPolling]);

  return { billing, upgrade, restore, refresh };
}
