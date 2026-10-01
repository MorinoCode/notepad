import { useState } from 'react';

import { Button } from '@/components/common/Button';
import { AlertIcon, CheckIcon, SparkIcon } from '@/components/common/Icons';
import { Modal } from '@/components/common/Modal';
import { i18n } from '#i18n';
import { formatPrice, PRO_PLAN, PRO_PLAN_YEARLY } from '@/lib/billing/plan';
import { cn } from '@/lib/util/cn';

export interface PaywallModalProps {
  open: boolean;
  /** The free allowance, so the copy never hard-codes "10". */
  limit: number;
  locale: string;
  busy: boolean;
  failed: boolean;
  onClose: () => void;
  onUpgrade: (nickname: string) => void;
  onRestore: () => void;
}

/**
 * The upgrade prompt.
 *
 * Prices are rendered from configuration rather than baked into translated copy,
 * so the amount shown always matches what the payment provider will actually
 * charge. Supports monthly and discounted yearly plans.
 */
export function PaywallModal({
  open,
  limit,
  locale,
  busy,
  failed,
  onClose,
  onUpgrade,
  onRestore,
}: PaywallModalProps) {
  const [interval, setInterval] = useState<'month' | 'year'>('year');

  const monthlyPrice = formatPrice(PRO_PLAN.amount, PRO_PLAN.currency, locale);
  const yearlyPrice = formatPrice(PRO_PLAN_YEARLY.amount, PRO_PLAN_YEARLY.currency, locale);
  const selectedPlan = interval === 'year' ? PRO_PLAN_YEARLY : PRO_PLAN;

  return (
    <Modal
      open={open}
      title={i18n.t('paywallTitle', [String(limit)])}
      description={i18n.t('paywallBody', [String(limit)])}
      onClose={onClose}
      closeLabel={i18n.t('close')}
      footer={
        <>
          {/* Plan Interval Selector */}
          <div className="bg-surface-muted/90 border-border/80 grid grid-cols-2 gap-2 rounded-xl border p-1">
            <button
              type="button"
              onClick={() => setInterval('month')}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-lg border px-3 py-2 text-center transition-all',
                interval === 'month'
                  ? 'border-accent bg-surface text-text shadow-xs'
                  : 'text-muted hover:text-text border-transparent',
              )}
            >
              <span className="text-[11px] font-medium">{i18n.t('planMonthly')}</span>
              <span className="text-text text-[13px] font-bold">{monthlyPrice}</span>
              <span className="text-muted text-[10px]">{i18n.t('paywallPerMonth')}</span>
            </button>

            <button
              type="button"
              onClick={() => setInterval('year')}
              className={cn(
                'relative flex cursor-pointer flex-col items-center justify-center rounded-lg border px-3 py-2 text-center transition-all',
                interval === 'year'
                  ? 'border-accent bg-surface text-text shadow-xs'
                  : 'text-muted hover:text-text border-transparent',
              )}
            >
              <span className="py-0.2 absolute -top-2 right-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-1.5 text-[9px] font-bold tracking-wider text-white uppercase shadow-2xs">
                -17%
              </span>
              <span className="text-[11px] font-medium">{i18n.t('planYearly')}</span>
              <span className="text-text text-[13px] font-bold">{yearlyPrice}</span>
              <span className="text-muted text-[10px]">/ year</span>
            </button>
          </div>

          <Button
            variant="primary"
            fullWidth
            busy={busy}
            icon={<SparkIcon size={15} />}
            onClick={() => onUpgrade(selectedPlan.nickname)}
          >
            {i18n.t('paywallUpgrade')}
          </Button>

          {failed ? (
            <p className="bg-danger-soft text-danger flex items-start gap-1.5 rounded-md px-2 py-1.5 text-[11px]">
              <AlertIcon size={13} className="mt-px shrink-0" />
              {i18n.t('paywallFailed')}
            </p>
          ) : null}

          <Button variant="ghost" size="sm" fullWidth onClick={onRestore}>
            {i18n.t('paywallRestore')}
          </Button>
        </>
      }
    >
      <ul className="flex flex-col gap-1.5">
        <Benefit>{i18n.t('usageUnlimited')}</Benefit>
        <Benefit>{i18n.t('settingsReminders')}</Benefit>
        <Benefit>{i18n.t('settingsDataHint')}</Benefit>
      </ul>
    </Modal>
  );
}

function Benefit({ children }: { children: string }) {
  return (
    <li className="flex items-start gap-2">
      <CheckIcon size={14} className="text-accent mt-0.5 shrink-0" />
      <span className="text-text">{children}</span>
    </li>
  );
}
