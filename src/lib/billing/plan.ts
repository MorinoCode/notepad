/**
 * The paid plans this build sells.
 *
 * The amount lives here rather than in the locale files on purpose: a price is
 * not translatable copy, it is configuration, and keeping `$` out of message
 * strings avoids colliding with the `$1` substitution token that
 * `browser.i18n` uses.
 */
export const PRO_PLAN = {
  amount: 1,
  currency: 'USD',
  interval: 'month',
  /** Plan nickname configured in the ExtensionPay dashboard. */
  nickname: 'monthly',
} as const;

export const PRO_PLAN_YEARLY = {
  amount: 10,
  currency: 'USD',
  interval: 'year',
  /** Plan nickname configured in the ExtensionPay dashboard. */
  nickname: 'yearly',
} as const;

/**
 * Format an amount for display.
 *
 * Falls back to a plain `CUR amount` string if `Intl` rejects either argument,
 * which can happen with an unusual browser locale.
 */
export function formatPrice(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
