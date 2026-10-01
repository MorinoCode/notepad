import type { StorageAdapter } from '@/lib/storage/adapter';
import { JsonStore, type Validator } from '@/lib/storage/jsonStore';
import { STORAGE_KEYS } from '@/lib/storage/schema';

import {
  billingSchema,
  DEFAULT_BILLING,
  type BillingState,
  type PlanKind,
  type StoredBilling,
  type SubscriptionStatus,
} from './types';

/** How long a confirmed entitlement is trusted before we re-check the network. */
export const BILLING_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Floor on network re-checks.
 *
 * The popup asks for a fresh entitlement every time it opens so that a user who
 * has just paid sees Pro immediately. Without a floor, a user who opens the popup
 * repeatedly would generate a request each time.
 */
export const MIN_REFRESH_INTERVAL_MS = 30_000;

/** The parts of an ExtensionPay user record that this app reads. */
export interface ExtPayUser {
  paid: boolean;
  email?: string | null;
  plan?: { interval?: 'month' | 'year' | 'once' | null } | null;
  subscriptionStatus?: SubscriptionStatus;
}

/**
 * The payment provider, narrowed to what this app needs.
 *
 * Everything else depends on this interface rather than on ExtensionPay, so
 * swapping providers is a new adapter rather than a rewrite — and tests can run
 * the full billing path with no network.
 */
export interface BillingClient {
  getUser(): Promise<ExtPayUser>;
  openPaymentPage(planNickname?: string): Promise<void>;
  openLoginPage(): Promise<void>;
}

export interface BillingServiceOptions {
  adapter: StorageAdapter;
  client: BillingClient;
  now?: () => number;
  ttlMs?: number;
}

export function planKindFromInterval(
  interval: 'month' | 'year' | 'once' | null | undefined,
): PlanKind {
  switch (interval) {
    case 'month':
      return 'monthly';
    case 'year':
      return 'yearly';
    case 'once':
      return 'lifetime';
    default:
      return 'free';
  }
}

/** Map a provider user record onto the local entitlement record. */
export function toStoredBilling(user: ExtPayUser, now: number): StoredBilling {
  if (!user.paid) {
    return {
      isPaid: false,
      plan: 'free',
      email: user.email ?? null,
      subscriptionStatus: user.subscriptionStatus ?? null,
      checkedAt: now,
    };
  }
  return {
    isPaid: true,
    plan: planKindFromInterval(user.plan?.interval),
    email: user.email ?? null,
    subscriptionStatus: user.subscriptionStatus ?? 'active',
    checkedAt: now,
  };
}

export class BillingService {
  private readonly store: JsonStore<StoredBilling>;
  private readonly client: BillingClient;
  private readonly now: () => number;
  private readonly ttlMs: number;
  /** In-memory only: it guards request bursts within one service-worker lifetime. */
  private lastNetworkRefreshAt: number | null = null;

  constructor({
    adapter,
    client,
    now = Date.now,
    ttlMs = BILLING_CACHE_TTL_MS,
  }: BillingServiceOptions) {
    this.store = new JsonStore<StoredBilling>(
      adapter,
      STORAGE_KEYS.billing,
      billingSchema as Validator<StoredBilling>,
      DEFAULT_BILLING,
    );
    this.client = client;
    this.now = now;
    this.ttlMs = ttlMs;
  }

  /**
   * The cached entitlement, with no network call.
   *
   * The popup renders from this so it can appear instantly and work offline.
   */
  async getState(): Promise<BillingState> {
    const stored = await this.store.read();
    return this.#withStaleness(stored);
  }

  /** Refresh only when the cached value has aged out. */
  async ensureFresh(): Promise<BillingState> {
    const stored = await this.store.read();
    if (!isStale(stored, this.now(), this.ttlMs)) return this.#withStaleness(stored);
    return this.refresh();
  }

  /**
   * Ask the provider for the current entitlement.
   *
   * Never throws: on a network failure the last known value is returned marked
   * stale. That guarantees a paying user is never locked out of their notes by a
   * dropped connection, which matters far more than catching a lapsed payment
   * a few hours early.
   */
  async refresh(): Promise<BillingState> {
    try {
      const user = await this.client.getUser();
      const stored = toStoredBilling(user, this.now());
      await this.store.write(stored);
      return this.#withStaleness(stored);
    } catch {
      return this.#withStaleness(await this.store.read());
    }
  }

  /**
   * Refresh unless a network check happened very recently.
   *
   * This is the call the popup makes on open: it is what turns a completed
   * payment into an unlocked account on the very next open, while staying within
   * a bounded request rate.
   */
  async refreshThrottled(minIntervalMs = MIN_REFRESH_INTERVAL_MS): Promise<BillingState> {
    const now = this.now();
    if (this.lastNetworkRefreshAt !== null && now - this.lastNetworkRefreshAt < minIntervalMs) {
      return this.getState();
    }
    this.lastNetworkRefreshAt = now;
    return this.refresh();
  }

  async openPaymentPage(planNickname?: string): Promise<void> {
    await this.client.openPaymentPage(planNickname);
  }

  /** Restores access on a new profile or after a reinstall. */
  async openLoginPage(): Promise<void> {
    await this.client.openLoginPage();
  }

  #withStaleness(stored: StoredBilling): BillingState {
    return toBillingState(stored, this.now(), this.ttlMs);
  }
}

/** Attach the "may be out of date" flag to a stored entitlement. */
export function toBillingState(stored: StoredBilling, now: number, ttlMs: number): BillingState {
  return { ...stored, stale: isStale(stored, now, ttlMs) };
}

export function isStale(stored: StoredBilling, now: number, ttlMs: number): boolean {
  if (stored.checkedAt === null) return true;
  return now - stored.checkedAt > ttlMs;
}
