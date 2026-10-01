import { LockIcon, SparkIcon } from '@/components/common/Icons';
import { i18n } from '#i18n';
import { cn } from '@/lib/util/cn';

export interface UsageMeterProps {
  activeCount: number;
  limit: number | null;
  isPaid: boolean;
  onUpgrade: () => void;
}

/**
 * Apple-style capsule meter for the free allowance.
 */
export function UsageMeter({ activeCount, limit, isPaid, onUpgrade }: UsageMeterProps) {
  if (isPaid || limit === null) {
    return (
      <span className="bg-accent/15 text-accent-text border-accent/25 flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shadow-2xs backdrop-blur-md">
        <SparkIcon size={12} className="text-accent" />
        {i18n.t('usageUnlimited')}
      </span>
    );
  }

  const full = activeCount >= limit;
  const ratio = limit === 0 ? 1 : Math.min(1, activeCount / limit);

  return (
    <button
      type="button"
      onClick={onUpgrade}
      title={i18n.t('usageTitle', [String(activeCount), String(limit)])}
      className={cn(
        'flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[11px] font-medium shadow-2xs backdrop-blur-md transition-all duration-150 active:scale-95',
        full
          ? 'border-danger/30 bg-danger/10 text-danger'
          : 'border-border/80 bg-surface-muted/80 text-muted hover:text-text hover:bg-surface-elevated',
      )}
    >
      {full ? <LockIcon size={12} className="text-danger shrink-0" /> : null}
      <span className="font-medium tabular-nums">
        {activeCount}/{limit}
      </span>
      <span
        aria-hidden="true"
        className="h-1.5 w-7 overflow-hidden rounded-full bg-black/10 p-[0.5px] dark:bg-white/10"
        data-ratio={ratio.toFixed(2)}
      >
        <span
          className={cn(
            'block h-full rounded-full transition-all duration-300',
            full ? 'bg-danger' : 'from-accent bg-gradient-to-r to-indigo-500',
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
    </button>
  );
}
