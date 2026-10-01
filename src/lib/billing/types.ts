import { z } from 'zod';

import type { Matches } from '@/lib/util/types';

export const PLAN_KINDS = ['free', 'monthly', 'yearly', 'lifetime', 'other'] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

export const SUBSCRIPTION_STATUSES = ['active', 'past_due', 'canceled'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** The subset of a user's entitlement that we persist locally. */
export interface StoredBilling {
  isPaid: boolean;
  plan: PlanKind;
  email: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  /** When the value was last confirmed with the payment provider. */
  checkedAt: number | null;
}

/** What the UI sees: the stored value plus whether it might be out of date. */
export interface BillingState extends StoredBilling {
  stale: boolean;
}

export const billingSchema = z.object({
  isPaid: z.boolean().catch(false),
  plan: z.enum(PLAN_KINDS).catch('free'),
  email: z.string().max(320).nullable().catch(null),
  subscriptionStatus: z.enum(SUBSCRIPTION_STATUSES).nullable().catch(null),
  checkedAt: z.number().int().nonnegative().nullable().catch(null),
});

export const __billingSchemaMatchesInterface: Matches<
  z.infer<typeof billingSchema>,
  StoredBilling
> = true;

/**
 * The starting point for a brand new install: free plan, nothing verified yet.
 * `checkedAt: null` means "never confirmed", which the service treats as stale.
 */
export const DEFAULT_BILLING: StoredBilling = {
  isPaid: false,
  plan: 'free',
  email: null,
  subscriptionStatus: null,
  checkedAt: null,
};

/** The free-plan state to render before storage has been read. */
export const DEFAULT_BILLING_STATE: BillingState = { ...DEFAULT_BILLING, stale: true };
