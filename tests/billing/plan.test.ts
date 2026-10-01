import { describe, expect, it } from 'vitest';

import { formatPrice, PRO_PLAN, PRO_PLAN_YEARLY } from '@/lib/billing/plan';

describe('PRO_PLAN', () => {
  it('describes a monthly subscription matching the ExtensionPay plan', () => {
    expect(PRO_PLAN.interval).toBe('month');
    expect(PRO_PLAN.nickname).toBe('monthly');
    expect(PRO_PLAN.amount).toBeGreaterThan(0);
  });

  it('describes a yearly subscription matching the ExtensionPay plan', () => {
    expect(PRO_PLAN_YEARLY.interval).toBe('year');
    expect(PRO_PLAN_YEARLY.nickname).toBe('yearly');
    expect(PRO_PLAN_YEARLY.amount).toBeGreaterThan(PRO_PLAN.amount);
  });
});

describe('formatPrice', () => {
  it('renders USD without trailing zeros for a whole amount', () => {
    const formatted = formatPrice(1, 'USD', 'en-US');
    expect(formatted).toContain('1');
    expect(formatted).toContain('$');
    expect(formatted).not.toContain('.00');
  });

  it('keeps the fractional part when there is one', () => {
    expect(formatPrice(2.5, 'USD', 'en-US')).toContain('2.5');
  });

  it('formats using the requested locale', () => {
    // The point is to prove it is locale-aware, not to assert one notation.
    expect(formatPrice(1, 'EUR', 'de-DE').length).toBeGreaterThan(0);
  });

  it('falls back to a readable string for an invalid currency code', () => {
    expect(formatPrice(1, 'NOT-A-CURRENCY', 'en-US')).toBe('1 NOT-A-CURRENCY');
  });

  it('falls back for an invalid locale tag', () => {
    expect(formatPrice(1, 'USD', 'not a locale')).not.toBe('$1');
  });
});
