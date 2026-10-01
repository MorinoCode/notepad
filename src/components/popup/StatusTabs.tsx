import { filterLabelKey, FILTER_TABS } from '@/components/popup/statusMeta';
import { i18n } from '#i18n';
import { cn } from '@/lib/util/cn';
import type { StatusFilter } from '@/lib/notes/search';

export interface StatusTabsProps {
  value: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (next: StatusFilter) => void;
}

/**
 * Apple macOS-style segmented control.
 */
export function StatusTabs({ value, counts, onChange }: StatusTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={i18n.t('statusAll')}
      className="qn-scroll apple-segmented flex gap-1 overflow-x-auto rounded-full p-1"
    >
      {FILTER_TABS.map((filter) => {
        const selected = filter === value;
        const count = counts[filter];
        return (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(filter)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-all duration-150',
              selected
                ? 'bg-surface-elevated text-text border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-white/10'
                : 'text-muted hover:text-text border border-transparent hover:bg-black/5 dark:hover:bg-white/5',
            )}
          >
            <span>{i18n.t(filterLabelKey(filter))}</span>
            {count > 0 ? (
              <span
                className={cn(
                  'py-0.2 rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                  selected
                    ? 'bg-accent/15 text-accent-text'
                    : 'text-muted bg-black/5 dark:bg-white/10',
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
