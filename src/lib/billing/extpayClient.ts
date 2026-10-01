import ExtPay from 'extpay';

import type { BillingClient, ExtPayUser } from './billingService';

/**
 * Your ExtensionPay extension id, from https://extensionpay.com.
 *
 * This id is chosen by you when registering the extension on extensionpay.com and
 * only has to be unique *there*. It is not the Chrome Web Store id and not the
 * `chrome://extensions` id — ExtPay uses it to build the URLs of your payment and
 * login pages (`https://extensionpay.com/extension/<id>`).
 *
 * Override it at build time with `WXT_EXTPAY_ID` (see `.env.example`) so the
 * release workflow can inject the id without a code change.
 *
 * IMPORTANT: `notewisp` is only a claim on the name — the id does nothing until
 * the matching extension exists on extensionpay.com. Publishing before that
 * means payments cannot complete.
 */
export const DEFAULT_EXTPAY_EXTENSION_ID = 'notewisp';

export function readExtPayExtensionId(): string {
  const env = import.meta.env as unknown as Record<string, string | undefined>;
  const configured = env['WXT_EXTPAY_ID'];
  return configured !== undefined && configured.length > 0
    ? configured
    : DEFAULT_EXTPAY_EXTENSION_ID;
}

export interface ExtPayBillingClient extends BillingClient {
  /**
   * Must be called exactly once from the background service worker; it installs
   * the listener that notices a payment completed on extensionpay.com.
   */
  startBackground(): void;
}

/**
 * Note: ExtPay ships under a copyleft licence (see its `package.json`). Confirming
 * the licence is acceptable for your distribution model is a product decision —
 * see the "Licensing" section of README.md.
 */
export function createExtPayBillingClient(
  extensionId = readExtPayExtensionId(),
): ExtPayBillingClient {
  const extpay = ExtPay(extensionId);

  return {
    async getUser(): Promise<ExtPayUser> {
      const user = await extpay.getUser();
      return {
        paid: user.paid,
        email: user.email,
        // Only the billing interval is read; the plan nickname is not used, and
        // ExtPay's own type declares it with a boxed `String`, which would not be
        // assignable to our domain type.
        plan: user.plan === null ? null : { interval: user.plan.interval },
        ...(user.subscriptionStatus === undefined
          ? {}
          : { subscriptionStatus: user.subscriptionStatus }),
      };
    },
    openPaymentPage: (planNickname?: string) => extpay.openPaymentPage(planNickname),
    openLoginPage: () => extpay.openLoginPage(),
    startBackground: () => extpay.startBackground(),
  };
}
