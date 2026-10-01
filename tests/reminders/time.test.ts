import { describe, expect, it } from 'vitest';

import {
  addMinutes,
  calendarDayDiff,
  describeReminder,
  EVENING_HOUR,
  formatClockTime,
  formatRelative,
  isOverdue,
  MORNING_HOUR,
  nextDailyAt,
  reminderPresets,
  startOfDay,
} from '@/lib/reminders/time';

/** Local wall-clock helper, so these assertions hold in any timezone. */
const local = (year: number, month: number, day: number, hour = 0, minute = 0) =>
  new Date(year, month - 1, day, hour, minute, 0, 0).getTime();

const NOON = local(2026, 6, 15, 12);

describe('addMinutes', () => {
  it('adds a whole number of minutes', () => {
    expect(addMinutes(NOON, 60)).toBe(NOON + 60 * 60_000);
  });
});

describe('startOfDay', () => {
  it('returns local midnight', () => {
    const midnight = new Date(startOfDay(NOON));
    expect([midnight.getHours(), midnight.getMinutes(), midnight.getDate()]).toEqual([0, 0, 15]);
  });
});

describe('nextDailyAt', () => {
  it('returns today when the hour is still ahead', () => {
    const at = new Date(nextDailyAt(NOON, EVENING_HOUR));
    expect([at.getDate(), at.getHours()]).toEqual([15, EVENING_HOUR]);
  });

  it('rolls to tomorrow when the hour has passed', () => {
    const at = new Date(nextDailyAt(NOON, MORNING_HOUR));
    expect([at.getDate(), at.getHours()]).toEqual([16, MORNING_HOUR]);
  });

  it('never returns a moment at or before now', () => {
    expect(nextDailyAt(NOON, 12)).toBeGreaterThan(NOON);
  });

  it('rolls over a month boundary', () => {
    const at = new Date(nextDailyAt(local(2026, 1, 31, 23), MORNING_HOUR));
    expect([at.getMonth(), at.getDate()]).toEqual([1, 1]);
  });
});

describe('calendarDayDiff', () => {
  it('counts whole days, ignoring the time of day', () => {
    expect(calendarDayDiff(local(2026, 6, 15, 23), local(2026, 6, 16, 1))).toBe(1);
  });

  it('is zero within the same day', () => {
    expect(calendarDayDiff(local(2026, 6, 15, 1), local(2026, 6, 15, 23))).toBe(0);
  });

  it('is negative for past dates', () => {
    expect(calendarDayDiff(local(2026, 6, 15), local(2026, 6, 13))).toBe(-2);
  });
});

describe('isOverdue', () => {
  it('is false without a reminder', () => {
    expect(isOverdue(null, NOON)).toBe(false);
  });

  it('is true at the exact moment the reminder is due', () => {
    expect(isOverdue(NOON, NOON)).toBe(true);
  });

  it('is true for a reminder in the past and false for the future', () => {
    expect(isOverdue(NOON - 1, NOON)).toBe(true);
    expect(isOverdue(NOON + 1, NOON)).toBe(false);
  });
});

describe('reminderPresets', () => {
  it('offers an hour, this evening and tomorrow morning', () => {
    const presets = reminderPresets(NOON);
    expect(presets.map((preset) => preset.id)).toEqual(['hour', 'evening', 'tomorrow']);
  });

  it('always produces future times', () => {
    for (const preset of reminderPresets(NOON)) {
      expect(preset.at).toBeGreaterThan(NOON);
    }
  });

  it('places the evening preset tonight and the morning preset tomorrow', () => {
    const [hour, evening, tomorrow] = reminderPresets(NOON);

    expect(hour?.at).toBe(addMinutes(NOON, 60));
    expect(new Date(evening!.at).getDate()).toBe(15);
    expect(new Date(evening!.at).getHours()).toBe(EVENING_HOUR);
    expect(new Date(tomorrow!.at).getDate()).toBe(16);
    expect(new Date(tomorrow!.at).getHours()).toBe(MORNING_HOUR);
  });
});

describe('describeReminder', () => {
  it('labels a reminder later today as today', () => {
    const descriptor = describeReminder(local(2026, 6, 15, 18), NOON, 'en-US');
    expect(descriptor.kind).toBe('today');
  });

  it('labels tomorrow as tomorrow', () => {
    const descriptor = describeReminder(local(2026, 6, 16, 9), NOON, 'en-US');
    expect(descriptor.kind).toBe('tomorrow');
  });

  it('falls back to an absolute date further out', () => {
    const descriptor = describeReminder(local(2026, 6, 20, 9), NOON, 'en-US');
    expect(descriptor.kind).toBe('absolute');
  });

  it('treats a past reminder as an absolute date rather than "today"', () => {
    // Guards the notification path: an overdue note must not claim to be later today.
    expect(describeReminder(local(2026, 6, 10, 9), NOON, 'en-US').kind).toBe('absolute');
  });
});

describe('formatClockTime', () => {
  it('renders a localized clock time', () => {
    expect(formatClockTime(local(2026, 6, 15, 18, 5), 'en-US')).toMatch(/6:05/);
  });
});

describe('formatRelative', () => {
  it('describes a recent past in minutes', () => {
    expect(formatRelative(NOON - 5 * 60_000, NOON, 'en-US')).toMatch(/5\s*min/i);
  });

  it('describes an imminent future in minutes', () => {
    expect(formatRelative(NOON + 10 * 60_000, NOON, 'en-US')).toMatch(/10\s*min/i);
  });

  it('describes hours', () => {
    expect(formatRelative(NOON - 3 * 3_600_000, NOON, 'en-US')).toMatch(/3\s*hr/i);
  });

  it('describes days within a month', () => {
    expect(formatRelative(NOON - 4 * 86_400_000, NOON, 'en-US')).toMatch(/4\s*day/i);
  });

  it('falls back to an absolute date beyond a month', () => {
    const result = formatRelative(local(2026, 1, 2, 9), NOON, 'en-US');
    expect(result).not.toMatch(/ago/i);
    expect(result).toMatch(/Jan/i);
  });

  it('adds the year only when it differs from the current year', () => {
    // "Jan 2" would be ambiguous six months out, but "Jun 20" is not.
    expect(formatRelative(local(2025, 1, 2, 9), NOON, 'en-US')).toMatch(/2025/);
    expect(formatRelative(local(2026, 1, 2, 9), NOON, 'en-US')).not.toMatch(/2026/);
  });

  it('does not throw for a timestamp equal to now', () => {
    expect(() => formatRelative(NOON, NOON, 'en-US')).not.toThrow();
  });

  it('works for a non-English locale', () => {
    expect(formatRelative(NOON - 5 * 60_000, NOON, 'fa-IR').length).toBeGreaterThan(0);
  });
});
