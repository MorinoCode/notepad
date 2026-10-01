import { describe, expect, it } from 'vitest';

import type { Note, NoteStatus } from '@/lib/notes/types';
import {
  applyReminderAlarm,
  countNotesNeedingAttention,
  formatBadgeText,
  isReminderDue,
  MAINTENANCE_ALARM,
  parseReminderAlarmName,
  planReminderAlarm,
  reconcileReminderAlarms,
  reminderAlarmName,
  shouldNotify,
  type AlarmApi,
  type AlarmLike,
} from '@/lib/reminders/scheduler';

const NOW = 1_000_000;

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id ?? 'n1',
    title: 'title',
    body: 'body',
    status: 'open',
    pinned: false,
    createdAt: 0,
    updatedAt: 0,
    remindAt: null,
    notifiedAt: null,
    ...overrides,
  };
}

/** In-memory stand-in for `chrome.alarms`, so the scheduler runs without a browser. */
function createFakeAlarms(initial: AlarmLike[] = []): AlarmApi & { alarms: Map<string, number> } {
  const alarms = new Map(initial.map((alarm) => [alarm.name, alarm.scheduledTime]));
  return {
    alarms,
    create(name, info) {
      alarms.set(name, info.when);
      return Promise.resolve();
    },
    clear(name) {
      return Promise.resolve(alarms.delete(name));
    },
    getAll() {
      return Promise.resolve([...alarms].map(([name, scheduledTime]) => ({ name, scheduledTime })));
    },
  };
}

describe('alarm names', () => {
  it('round-trips a note id', () => {
    expect(parseReminderAlarmName(reminderAlarmName('abc-123'))).toBe('abc-123');
  });

  it('ignores alarms it does not own', () => {
    expect(parseReminderAlarmName(MAINTENANCE_ALARM)).toBeNull();
    expect(parseReminderAlarmName('something-else')).toBeNull();
  });

  it('rejects an empty id', () => {
    expect(parseReminderAlarmName(reminderAlarmName(''))).toBeNull();
  });
});

describe('planReminderAlarm', () => {
  it('schedules a future reminder', () => {
    expect(planReminderAlarm(note({ remindAt: NOW + 500 }), NOW)).toEqual({
      action: 'schedule',
      when: NOW + 500,
    });
  });

  it('clears when there is no reminder', () => {
    expect(planReminderAlarm(note(), NOW)).toEqual({ action: 'clear' });
  });

  it('clears a reminder that has already passed rather than firing late', () => {
    expect(planReminderAlarm(note({ remindAt: NOW - 1 }), NOW)).toEqual({ action: 'clear' });
  });

  it('clears a reminder due right now', () => {
    expect(planReminderAlarm(note({ remindAt: NOW }), NOW)).toEqual({ action: 'clear' });
  });

  it('clears a reminder on a note that has since been archived', () => {
    // Policy lives in shouldNotify, but the alarm itself should still go away.
    expect(planReminderAlarm(note({ remindAt: NOW + 500, status: 'archived' }), NOW).action).toBe(
      'schedule',
    );
    expect(shouldNotify(note({ remindAt: NOW + 500, status: 'archived' }))).toBe(false);
  });
});

describe('applyReminderAlarm', () => {
  it('creates the alarm for a future reminder', async () => {
    const alarms = createFakeAlarms();
    await applyReminderAlarm(alarms, note({ id: 'a', remindAt: NOW + 1000 }), NOW);

    expect(alarms.alarms.get(reminderAlarmName('a'))).toBe(NOW + 1000);
  });

  it('removes the alarm when the reminder is gone', async () => {
    const alarms = createFakeAlarms([{ name: reminderAlarmName('a'), scheduledTime: NOW + 1000 }]);
    await applyReminderAlarm(alarms, note({ id: 'a' }), NOW);

    expect(alarms.alarms.size).toBe(0);
  });
});

describe('reconcileReminderAlarms', () => {
  it('schedules one alarm per future reminder', async () => {
    const alarms = createFakeAlarms();
    const summary = await reconcileReminderAlarms(
      alarms,
      [
        note({ id: 'a', remindAt: NOW + 100 }),
        note({ id: 'b', remindAt: NOW + 200 }),
        note({ id: 'c' }),
      ],
      NOW,
    );

    expect(summary).toEqual({ scheduled: 2, cleared: 0 });
    expect(alarms.alarms.size).toBe(2);
  });

  it('recreates alarms after a browser restart wiped them', async () => {
    // Chrome does not reliably persist alarms across restarts.
    const alarms = createFakeAlarms();
    await reconcileReminderAlarms(alarms, [note({ id: 'a', remindAt: NOW + 100 })], NOW);
    await reconcileReminderAlarms(alarms, [note({ id: 'a', remindAt: NOW + 100 })], NOW);

    expect(alarms.alarms.get(reminderAlarmName('a'))).toBe(NOW + 100);
    expect(alarms.alarms.size).toBe(1);
  });

  it('reschedules when the reminder time changed', async () => {
    const alarms = createFakeAlarms([{ name: reminderAlarmName('a'), scheduledTime: NOW + 100 }]);
    const summary = await reconcileReminderAlarms(
      alarms,
      [note({ id: 'a', remindAt: NOW + 900 })],
      NOW,
    );

    expect(summary.scheduled).toBe(1);
    expect(alarms.alarms.get(reminderAlarmName('a'))).toBe(NOW + 900);
  });

  it('drops alarms whose note no longer wants one', async () => {
    const alarms = createFakeAlarms([
      { name: reminderAlarmName('ghost'), scheduledTime: NOW + 100 },
    ]);
    const summary = await reconcileReminderAlarms(alarms, [], NOW);

    expect(summary.cleared).toBe(1);
    expect(alarms.alarms.size).toBe(0);
  });

  it('leaves alarms it does not own alone', async () => {
    const alarms = createFakeAlarms([{ name: MAINTENANCE_ALARM, scheduledTime: NOW }]);
    await reconcileReminderAlarms(alarms, [], NOW);

    expect(alarms.alarms.has(MAINTENANCE_ALARM)).toBe(true);
  });

  it('does not churn alarms that are already correct', async () => {
    const alarms = createFakeAlarms([{ name: reminderAlarmName('a'), scheduledTime: NOW + 100 }]);
    const summary = await reconcileReminderAlarms(
      alarms,
      [note({ id: 'a', remindAt: NOW + 100 })],
      NOW,
    );

    expect(summary).toEqual({ scheduled: 0, cleared: 0 });
  });
});

describe('isReminderDue', () => {
  it('is true once the reminder passes and it has not been announced', () => {
    expect(isReminderDue(note({ remindAt: NOW - 1 }), NOW)).toBe(true);
  });

  it('stays false before the reminder is due', () => {
    expect(isReminderDue(note({ remindAt: NOW + 1 }), NOW)).toBe(false);
  });

  it('is false without a reminder', () => {
    expect(isReminderDue(note(), NOW)).toBe(false);
  });

  it('does not re-fire an already announced reminder', () => {
    expect(isReminderDue(note({ remindAt: NOW - 100, notifiedAt: NOW - 50 }), NOW)).toBe(false);
  });

  it('re-fires when the reminder was moved after the last notification', () => {
    expect(isReminderDue(note({ remindAt: NOW - 10, notifiedAt: NOW - 500 }), NOW)).toBe(true);
  });
});

describe('shouldNotify', () => {
  it.each<[NoteStatus, boolean]>([
    ['open', true],
    ['doing', true],
    ['done', false],
    ['archived', false],
  ])('notifies for %s: %s', (status, expected) => {
    expect(shouldNotify(note({ status }))).toBe(expected);
  });
});

describe('countNotesNeedingAttention', () => {
  it('counts overdue, unfinished notes only', () => {
    const count = countNotesNeedingAttention(
      [
        note({ id: 'a', remindAt: NOW - 1 }),
        note({ id: 'b', remindAt: NOW - 1, status: 'done' }),
        note({ id: 'c', remindAt: NOW - 1, status: 'doing' }),
        note({ id: 'd', remindAt: NOW + 100_000 }),
        note({ id: 'e' }),
      ],
      NOW,
    );

    expect(count).toBe(2);
  });

  it('keeps counting a note that has already been notified', () => {
    // The badge tracks outstanding work, not unannounced notifications.
    expect(countNotesNeedingAttention([note({ remindAt: NOW - 1, notifiedAt: NOW })], NOW)).toBe(1);
  });

  it('is zero for an empty collection', () => {
    expect(countNotesNeedingAttention([], NOW)).toBe(0);
  });
});

describe('formatBadgeText', () => {
  it('clears the badge at zero', () => {
    expect(formatBadgeText(0)).toBe('');
  });

  it('renders single digits directly', () => {
    expect(formatBadgeText(3)).toBe('3');
  });

  it('caps at 9+ so the badge never widens the toolbar button', () => {
    expect(formatBadgeText(10)).toBe('9+');
    expect(formatBadgeText(120)).toBe('9+');
  });

  it('treats a negative count as nothing to show', () => {
    expect(formatBadgeText(-1)).toBe('');
  });
});
