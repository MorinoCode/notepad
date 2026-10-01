import { describe, expect, it, vi } from 'vitest';

import {
  BillingService,
  isStale,
  planKindFromInterval,
  toStoredBilling,
  type BillingClient,
  type ExtPayUser,
} from '@/lib/billing/billingService';
import { DEFAULT_BILLING, type StoredBilling } from '@/lib/billing/types';
import { STORAGE_KEYS } from '@/lib/storage/schema';
import { createMemoryAdapter, type MemoryAdapter } from '@/lib/storage/memoryAdapter';

const NOW = 1_700_000_000_000;
const TTL = 6 * 60 * 60 * 1000;

function createClient(overrides: Partial<BillingClient> = {}): BillingClient {
  return {
    getUser: () => Promise.resolve({ paid: false } satisfies ExtPayUser),
    openPaymentPage: () => Promise.resolve(),
    openLoginPage: () => Promise.resolve(),
    ...overrides,
  };
}

function createService(adapter: MemoryAdapter, client: BillingClient, now = NOW, ttlMs = TTL) {
  return new BillingService({ adapter, client, now: () => now, ttlMs });
}

describe('planKindFromInterval', () => {
  it.each([
    ['month', 'monthly'],
    ['year', 'yearly'],
    ['once', 'lifetime'],
    [null, 'free'],
    [undefined, 'free'],
  ] as const)('maps %s to %s', (interval, expected) => {
    expect(planKindFromInterval(interval)).toBe(expected);
  });
});

describe('toStoredBilling', () => {
  it('records a free user without a plan', () => {
    expect(toStoredBilling({ paid: false, email: null }, NOW)).toEqual({
      isPaid: false,
      plan: 'free',
      email: null,
      subscriptionStatus: null,
      checkedAt: NOW,
    });
  });

  it('maps a paid monthly subscriber', () => {
    const stored = toStoredBilling(
      { paid: true, email: 'a@b.c', plan: { interval: 'month' }, subscriptionStatus: 'active' },
      NOW,
    );

    expect(stored).toMatchObject({
      isPaid: true,
      plan: 'monthly',
      email: 'a@b.c',
      subscriptionStatus: 'active',
      checkedAt: NOW,
    });
  });

  it('assumes an active subscription when the provider omits the status', () => {
    expect(toStoredBilling({ paid: true }, NOW).subscriptionStatus).toBe('active');
  });

  it('keeps a flagging payment visible for a paid user', () => {
    const stored = toStoredBilling({ paid: true, subscriptionStatus: 'past_due' }, NOW);
    expect(stored).toMatchObject({ isPaid: true, subscriptionStatus: 'past_due' });
  });
});

describe('isStale', () => {
  it('treats a never-checked record as stale', () => {
    expect(isStale(DEFAULT_BILLING, NOW, TTL)).toBe(true);
  });

  it('is fresh within the TTL', () => {
    expect(isStale({ ...DEFAULT_BILLING, checkedAt: NOW - 1000 }, NOW, TTL)).toBe(false);
  });

  it('is stale once the TTL is exceeded', () => {
    expect(isStale({ ...DEFAULT_BILLING, checkedAt: NOW - TTL - 1 }, NOW, TTL)).toBe(true);
  });
});

describe('BillingService.getState', () => {
  it('defaults to the free plan on a fresh install', async () => {
    const state = await createService(createMemoryAdapter(), createClient()).getState();

    expect(state).toMatchObject({ isPaid: false, plan: 'free', stale: true });
  });

  it('never touches the network', async () => {
    const getUser = vi.fn(() => Promise.resolve({ paid: false }));
    await createService(createMemoryAdapter(), createClient({ getUser })).getState();

    expect(getUser).not.toHaveBeenCalled();
  });
});

describe('BillingService.refresh', () => {
  it('caches a successful check', async () => {
    const adapter = createMemoryAdapter();
    const service = createService(
      adapter,
      createClient({ getUser: () => Promise.resolve({ paid: true }) }),
    );

    const state = await service.refresh();
    expect(state).toMatchObject({ isPaid: true, stale: false });

    const persisted = await adapter.get<StoredBilling>(STORAGE_KEYS.billing);
    expect(persisted).toMatchObject({ isPaid: true, checkedAt: NOW });
  });

  it('reports a paid user even when the provider is unreachable', async () => {
    // A paying customer must never be locked out by a dropped connection.
    const adapter = createMemoryAdapter();
    await adapter.set(STORAGE_KEYS.billing, {
      isPaid: true,
      plan: 'monthly',
      email: null,
      subscriptionStatus: 'active',
      checkedAt: NOW - TTL - 1,
    });
    const failing = createClient({ getUser: () => Promise.reject(new Error('offline')) });

    const state = await createService(adapter, failing).refresh();
    expect(state).toMatchObject({ isPaid: true, stale: true });
  });

  it('resolves rather than throwing when the provider fails', async () => {
    const failing = createClient({ getUser: () => Promise.reject(new Error('offline')) });
    await expect(createService(createMemoryAdapter(), failing).refresh()).resolves.toBeDefined();
  });

  it('does not corrupt the cache when a check fails', async () => {
    const adapter = createMemoryAdapter();
    const cached = {
      isPaid: true,
      plan: 'yearly',
      email: 'user@example.com',
      subscriptionStatus: 'active',
      checkedAt: NOW - 1000,
    };
    await adapter.set(STORAGE_KEYS.billing, cached);

    const failing = createClient({ getUser: () => Promise.reject(new Error('offline')) });
    await createService(adapter, failing).refresh();

    expect(await adapter.get(STORAGE_KEYS.billing)).toEqual(cached);
  });

  it('downgrades a lapsed subscriber who is no longer paid', async () => {
    const adapter = createMemoryAdapter();
    await adapter.set(STORAGE_KEYS.billing, {
      isPaid: true,
      plan: 'monthly',
      email: null,
      subscriptionStatus: 'active',
      checkedAt: NOW - 1,
    });

    const lapsed = createClient({
      getUser: () => Promise.resolve({ paid: false, subscriptionStatus: 'canceled' }),
    });
    const state = await createService(adapter, lapsed).refresh();

    expect(state).toMatchObject({ isPaid: false, plan: 'free' });
  });
});

describe('BillingService.ensureFresh', () => {
  it('skips the network while the cache is fresh', async () => {
    const adapter = createMemoryAdapter();
    await adapter.set(STORAGE_KEYS.billing, { ...DEFAULT_BILLING, isPaid: true, checkedAt: NOW });
    const getUser = vi.fn(() => Promise.resolve({ paid: true }));

    await createService(adapter, createClient({ getUser })).ensureFresh();
    expect(getUser).not.toHaveBeenCalled();
  });

  it('refreshes once the cache ages out', async () => {
    const adapter = createMemoryAdapter();
    await adapter.set(STORAGE_KEYS.billing, { ...DEFAULT_BILLING, checkedAt: NOW - TTL - 1 });
    const getUser = vi.fn(() => Promise.resolve({ paid: true }));

    const state = await createService(adapter, createClient({ getUser })).ensureFresh();
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(state.isPaid).toBe(true);
  });
});

describe('BillingService.refreshThrottled', () => {
  it('calls the provider once and then serves from cache', async () => {
    const getUser = vi.fn(() => Promise.resolve({ paid: true }));
    const service = createService(createMemoryAdapter(), createClient({ getUser }));

    await service.refreshThrottled(30_000);
    await service.refreshThrottled(30_000);
    await service.refreshThrottled(30_000);

    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it('checks again after the throttle window', async () => {
    const getUser = vi.fn(() => Promise.resolve({ paid: true }));
    let now = NOW;
    const service = new BillingService({
      adapter: createMemoryAdapter(),
      client: createClient({ getUser }),
      now: () => now,
    });

    await service.refreshThrottled(30_000);
    now += 31_000;
    await service.refreshThrottled(30_000);

    expect(getUser).toHaveBeenCalledTimes(2);
  });
});

describe('BillingService payment entry points', () => {
  it('forwards the plan nickname to the provider', async () => {
    const openPaymentPage = vi.fn(() => Promise.resolve());
    await createService(createMemoryAdapter(), createClient({ openPaymentPage })).openPaymentPage(
      'yearly',
    );

    expect(openPaymentPage).toHaveBeenCalledWith('yearly');
  });
});
