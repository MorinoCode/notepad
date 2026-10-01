import { Button } from '@/components/common/Button';
import { Field, FieldGroup } from '@/components/common/Field';
import { AlertIcon, SparkIcon } from '@/components/common/Icons';
import { i18n } from '#i18n';
import { formatPrice, PRO_PLAN } from '@/lib/billing/plan';
import type { BillingState, PlanKind } from '@/lib/billing/types';

export interface AccountSectionProps {
  billing: BillingState;
  locale: string;
  busy: boolean;
  failed: boolean;
  onUpgrade: () => void;
  onRestore: () => void;
  onRefresh: () => void;
}

function planLabelKey(
  plan: PlanKind,
): 'planFree' | 'planMonthly' | 'planYearly' | 'planLifetime' | 'planOther' {
  switch (plan) {
    case 'free':
      return 'planFree';
    case 'monthly':
      return 'planMonthly';
    case 'yearly':
      return 'planYearly';
    case 'lifetime':
      return 'planLifetime';
    case 'other':
      return 'planOther';
  }
}

function statusLabelKey(
  status: BillingState['subscriptionStatus'],
): 'statusValueActive' | 'statusValuePastDue' | 'statusValueCanceled' | null {
  switch (status) {
    case 'active':
      return 'statusValueActive';
    case 'past_due':
      return 'statusValuePastDue';
    case 'canceled':
      return 'statusValueCanceled';
    default:
      return null;
  }
}

/**
 * Plan, entitlement and the exit hatch.
 *
 * Letting a subscriber manage or cancel their plan from inside the extension is
 * both required by the Chrome Web Store and simply the decent thing to do, so the
 * manage button is never hidden behind another screen.
 */
export function AccountSection({
  billing,
  locale,
  busy,
  failed,
  onUpgrade,
  onRestore,
  onRefresh,
}: AccountSectionProps) {
  const price = formatPrice(PRO_PLAN.amount, PRO_PLAN.currency, locale);
  const statusKey = statusLabelKey(billing.subscriptionStatus);

  return (
    <FieldGroup title={i18n.t('settingsAccount')}>
      <Field
        label={i18n.t(planLabelKey(billing.plan))}
        hint={billing.isPaid ? i18n.t('proManage') : i18n.t('settingsDataHint')}
      >
        {/*
         * A single call opens the provider page, which covers both buying and
         * managing a subscription, so the same handler serves both states.
         */}
        <Button
          size="sm"
          variant={billing.isPaid ? 'secondary' : 'primary'}
          busy={busy}
          icon={<SparkIcon size={14} />}
          onClick={onUpgrade}
        >
          {billing.isPaid ? i18n.t('paywallManage') : `${i18n.t('paywallUpgrade')} · ${price}`}
        </Button>
      </Field>

      {billing.email !== null ? (
        <Field label={i18n.t('settingsEmail')}>
          <span className="text-muted text-[12px]">{billing.email}</span>
        </Field>
      ) : null}

      {statusKey !== null ? (
        <Field label={i18n.t('settingsStatus')}>
          <span className={billing.isPaid ? 'text-muted text-[12px]' : 'text-warn text-[12px]'}>
            {i18n.t(statusKey)}
          </span>
        </Field>
      ) : null}

      {!billing.isPaid ? (
        <Field label={i18n.t('settingsRefresh')}>
          <Button size="sm" variant="ghost" onClick={onRefresh}>
            {i18n.t('settingsRefresh')}
          </Button>
        </Field>
      ) : null}

      {!billing.isPaid ? (
        <Field label={i18n.t('paywallRestore')}>
          <Button size="sm" variant="ghost" onClick={onRestore}>
            {i18n.t('paywallRestore')}
          </Button>
        </Field>
      ) : null}

      {failed ? (
        <div className="text-danger flex items-start gap-1.5 px-3 py-2 text-[11px]">
          <AlertIcon size={13} className="mt-px shrink-0" />
          {i18n.t('paywallFailed')}
        </div>
      ) : null}
    </FieldGroup>
  );
}
