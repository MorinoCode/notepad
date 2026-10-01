export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Local hour used by the "This evening" preset. */
export const EVENING_HOUR = 18;
/** Local hour used by the "Tomorrow morning" preset. */
export const MORNING_HOUR = 9;

export function addMinutes(now: number, minutes: number): number {
  return now + minutes * MINUTE_MS;
}

export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * The next time of day matching `hour:minute`, in the user's local timezone.
 * Returns today when that moment is still ahead, otherwise tomorrow.
 */
export function nextDailyAt(now: number, hour: number, minute = 0): number {
  const candidate = new Date(now);
  candidate.setHours(hour, minute, 0, 0);
  if (candidate.getTime() <= now) candidate.setDate(candidate.getDate() + 1);
  return candidate.getTime();
}

/** Whole calendar days between two instants, tolerant of daylight-saving shifts. */
export function calendarDayDiff(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

export function isOverdue(remindAt: number | null, now: number): boolean {
  return remindAt !== null && remindAt <= now;
}

export type ReminderPresetId = 'hour' | 'evening' | 'tomorrow';

export interface ReminderPreset {
  id: ReminderPresetId;
  at: number;
}

/**
 * The one-tap reminder options offered by the composer.
 *
 * Returned as data so the UI stays free of clock arithmetic and the presets can
 * be unit tested against a fixed `now`.
 */
export function reminderPresets(now: number): ReminderPreset[] {
  return [
    { id: 'hour', at: addMinutes(now, 60) },
    { id: 'evening', at: nextDailyAt(now, EVENING_HOUR) },
    { id: 'tomorrow', at: nextDailyAt(now, MORNING_HOUR) },
  ];
}

/**
 * A reminder rendered for display.
 *
 * Returned as a descriptor rather than a sentence so that translation stays in
 * the UI layer: only "today" and "tomorrow" need localized words, while the clock
 * time itself is already localized by `Intl`.
 */
export type ReminderDescriptor =
  | { kind: 'today'; time: string }
  | { kind: 'tomorrow'; time: string }
  | { kind: 'absolute'; dateTime: string };

const timeFormatters = new Map<string, Intl.DateTimeFormat>();
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();
const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();

function timeFormatter(locale: string): Intl.DateTimeFormat {
  let formatter = timeFormatters.get(locale);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });
    timeFormatters.set(locale, formatter);
  }
  return formatter;
}

function dateTimeFormatter(locale: string, withYear: boolean): Intl.DateTimeFormat {
  const key = `${locale}|${withYear ? 'year' : 'no-year'}`;
  let formatter = dateTimeFormatters.get(key);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      ...(withYear ? { year: 'numeric' } : {}),
      hour: 'numeric',
      minute: '2-digit',
    });
    dateTimeFormatters.set(key, formatter);
  }
  return formatter;
}

function relativeFormatter(locale: string): Intl.RelativeTimeFormat {
  let formatter = relativeFormatters.get(locale);
  if (formatter === undefined) {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
    relativeFormatters.set(locale, formatter);
  }
  return formatter;
}

export function formatClockTime(timestamp: number, locale: string): string {
  return timeFormatter(locale).format(timestamp);
}

/**
 * An absolute date and time.
 *
 * The year is included only when it differs from the reference year: printing
 * "Jan 2" for a reminder that is six months away is ambiguous, while printing
 * "Jun 20, 2026" for one next week is noise.
 */
export function formatDateTime(timestamp: number, locale: string, now = Date.now()): string {
  const withYear = new Date(timestamp).getFullYear() !== new Date(now).getFullYear();
  return dateTimeFormatter(locale, withYear).format(timestamp);
}

export function describeReminder(
  timestamp: number,
  now: number,
  locale: string,
): ReminderDescriptor {
  const dayDiff = calendarDayDiff(now, timestamp);
  if (dayDiff === 0) return { kind: 'today', time: formatClockTime(timestamp, locale) };
  if (dayDiff === 1) return { kind: 'tomorrow', time: formatClockTime(timestamp, locale) };
  return { kind: 'absolute', dateTime: formatDateTime(timestamp, locale, now) };
}

/**
 * "5m ago" style label, localized by `Intl` and therefore language-independent.
 * Falls back to an absolute date beyond a month, where relative phrasing stops
 * being useful.
 */
export function formatRelative(timestamp: number, now: number, locale: string): string {
  const diff = timestamp - now;
  const magnitude = Math.abs(diff);
  const formatter = relativeFormatter(locale);

  if (magnitude < MINUTE_MS) return formatter.format(Math.trunc(diff / 1000) || 0, 'second');
  if (magnitude < HOUR_MS) return formatter.format(Math.trunc(diff / MINUTE_MS), 'minute');
  if (magnitude < DAY_MS) return formatter.format(Math.trunc(diff / HOUR_MS), 'hour');
  if (magnitude < 30 * DAY_MS) return formatter.format(Math.trunc(diff / DAY_MS), 'day');

  return formatDateTime(timestamp, locale, now);
}
