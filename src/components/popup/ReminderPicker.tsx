import { useMemo, useState } from 'react';

import { IconButton } from '@/components/common/Button';
import { BellIcon, CloseIcon } from '@/components/common/Icons';
import { useClock } from '@/hooks/useClock';
import {
  describeReminder,
  formatDateTime,
  reminderPresets,
  type ReminderPresetId,
} from '@/lib/reminders/time';
import { cn } from '@/lib/util/cn';
import { i18n } from '#i18n';

export interface ReminderPickerProps {
  value: number | null;
  onChange: (next: number | null) => void;
  locale: string;
}

function presetLabelKey(
  id: ReminderPresetId,
): 'reminderInOneHour' | 'reminderThisEvening' | 'reminderTomorrow' {
  switch (id) {
    case 'hour':
      return 'reminderInOneHour';
    case 'evening':
      return 'reminderThisEvening';
    case 'tomorrow':
      return 'reminderTomorrow';
  }
}

function toDateTimeLocalValue(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (part: number) => String(part).padStart(2, '0');
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join('T');
}

/**
 * Apple-style frosted pill reminder picker.
 */
export function ReminderPicker({ value, onChange, locale }: ReminderPickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const now = useClock();
  const presets = useMemo(() => reminderPresets(now), [now]);

  if (value !== null) {
    const descriptor = describeReminder(value, now, locale);
    const summary =
      descriptor.kind === 'today'
        ? i18n.t('reminderToday', [descriptor.time])
        : descriptor.kind === 'tomorrow'
          ? i18n.t('reminderTomorrowAt', [descriptor.time])
          : descriptor.dateTime;

    return (
      <div className="bg-accent/15 text-accent-text border-accent/25 flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium shadow-2xs backdrop-blur-md">
        <BellIcon size={12} className="text-accent" />
        <span className="tabular-nums">{summary}</span>
        <IconButton
          label={i18n.t('reminderClear')}
          size={18}
          className="text-accent-text hover:text-danger hover:bg-danger/10 -mr-1"
          onClick={() => {
            setShowCustom(false);
            onChange(null);
          }}
        >
          <CloseIcon size={11} />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-muted/80 flex items-center gap-1 pr-0.5 text-[11px] font-medium">
        <BellIcon size={12} />
      </span>

      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          title={formatDateTime(preset.at, locale)}
          onClick={() => onChange(preset.at)}
          className="border-border/80 bg-surface-muted/60 text-muted hover:bg-surface-elevated hover:text-text rounded-full border px-2 py-0.5 text-[11px] font-medium shadow-2xs transition-all active:scale-95"
        >
          {i18n.t(presetLabelKey(preset.id))}
        </button>
      ))}

      <button
        type="button"
        aria-expanded={showCustom}
        onClick={() => setShowCustom((current) => !current)}
        className={cn(
          'rounded-full border px-2 py-0.5 text-[11px] font-medium shadow-2xs transition-all active:scale-95',
          showCustom
            ? 'border-accent bg-accent/15 text-accent-text'
            : 'border-border/80 bg-surface-muted/60 text-muted hover:bg-surface-elevated hover:text-text',
        )}
      >
        {i18n.t('reminderCustom')}
      </button>

      {showCustom ? (
        <input
          type="datetime-local"
          aria-label={i18n.t('reminderCustomLabel')}
          min={toDateTimeLocalValue(now + 60_000)}
          onChange={(event) => {
            const parsed = new Date(event.target.value).getTime();
            if (Number.isFinite(parsed)) onChange(parsed);
          }}
          className="border-border bg-surface text-text focus:border-accent h-6.5 rounded-lg border px-2 text-[11px] outline-none"
        />
      ) : null}
    </div>
  );
}
