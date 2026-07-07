import { describe, expect, it } from 'vitest';
import { RecurrenceFreq, type RecurrenceRule } from '@todomaster/shared';
import { computeNextOccurrence, describeRecurrence } from './recurrence-engine';

const state = (dueDate: string, occurrencesCompleted = 0) => ({ dueDate, occurrencesCompleted });

describe('computeNextOccurrence', () => {
  it('advances daily by the interval', () => {
    const rule: RecurrenceRule = { freq: RecurrenceFreq.DAILY, interval: 1 };
    expect(computeNextOccurrence(state('2026-07-05'), rule)).toBe('2026-07-06');
  });

  it('advances every N days', () => {
    const rule: RecurrenceRule = { freq: RecurrenceFreq.DAILY, interval: 3 };
    expect(computeNextOccurrence(state('2026-07-05'), rule)).toBe('2026-07-08');
  });

  it('advances weekly by the interval when no weekdays specified', () => {
    const rule: RecurrenceRule = { freq: RecurrenceFreq.WEEKLY, interval: 2 };
    expect(computeNextOccurrence(state('2026-07-05'), rule)).toBe('2026-07-19');
  });

  it('advances monthly, clamping to the last valid day of a shorter month', () => {
    const rule: RecurrenceRule = { freq: RecurrenceFreq.MONTHLY, interval: 1 };
    // Jan 31 + 1 month has no Feb 31, so date-fns clamps to the month's last day.
    expect(computeNextOccurrence(state('2026-01-31'), rule)).toBe('2026-02-28');
  });

  it('advances yearly', () => {
    const rule: RecurrenceRule = { freq: RecurrenceFreq.YEARLY, interval: 1 };
    expect(computeNextOccurrence(state('2026-07-05'), rule)).toBe('2027-07-05');
  });

  it('weekdays-only rule finds the next matching weekday within the week', () => {
    // 2026-07-05 is a Sunday (ISO weekday 7). Weekdays = Mon-Fri (1-5).
    const rule: RecurrenceRule = {
      freq: RecurrenceFreq.WEEKLY,
      interval: 1,
      byWeekday: [1, 2, 3, 4, 5],
    };
    expect(computeNextOccurrence(state('2026-07-05'), rule)).toBe('2026-07-06'); // Monday
  });

  it('weekdays-only rule wraps to next week from Friday to Monday', () => {
    const rule: RecurrenceRule = {
      freq: RecurrenceFreq.WEEKLY,
      interval: 1,
      byWeekday: [1, 2, 3, 4, 5],
    };
    // 2026-07-10 is a Friday.
    expect(computeNextOccurrence(state('2026-07-10'), rule)).toBe('2026-07-13'); // Monday
  });

  it('specific weekday set (Mon/Wed) steps through the set and wraps', () => {
    const rule: RecurrenceRule = { freq: RecurrenceFreq.WEEKLY, interval: 1, byWeekday: [1, 3] };
    // Monday 2026-07-06 -> next is Wednesday 2026-07-08
    expect(computeNextOccurrence(state('2026-07-06'), rule)).toBe('2026-07-08');
    // Wednesday 2026-07-08 -> wraps to next Monday 2026-07-13
    expect(computeNextOccurrence(state('2026-07-08'), rule)).toBe('2026-07-13');
  });

  it('stops the series once `count` occurrences are completed', () => {
    const rule: RecurrenceRule = { freq: RecurrenceFreq.DAILY, interval: 1, count: 3 };
    expect(computeNextOccurrence(state('2026-07-05', 0), rule)).toBe('2026-07-06');
    expect(computeNextOccurrence(state('2026-07-06', 1), rule)).toBe('2026-07-07');
    expect(computeNextOccurrence(state('2026-07-07', 2), rule)).toBeNull(); // 3rd completion ends it
  });

  it('stops the series once `until` is passed', () => {
    const rule: RecurrenceRule = {
      freq: RecurrenceFreq.DAILY,
      interval: 1,
      until: '2026-07-06T00:00:00.000Z',
    };
    expect(computeNextOccurrence(state('2026-07-05'), rule)).toBe('2026-07-06'); // still within
    expect(computeNextOccurrence(state('2026-07-06'), rule)).toBeNull(); // next would be past until
  });
});

describe('describeRecurrence', () => {
  it('describes simple daily/weekly/monthly/yearly rules', () => {
    expect(describeRecurrence({ freq: RecurrenceFreq.DAILY, interval: 1 })).toBe('Every day');
    expect(describeRecurrence({ freq: RecurrenceFreq.DAILY, interval: 3 })).toBe('Every 3 days');
    expect(describeRecurrence({ freq: RecurrenceFreq.MONTHLY, interval: 1 })).toBe('Every month');
  });

  it('describes weekdays-only as "Every weekday"', () => {
    const rule: RecurrenceRule = {
      freq: RecurrenceFreq.WEEKLY,
      interval: 1,
      byWeekday: [1, 2, 3, 4, 5],
    };
    expect(describeRecurrence(rule)).toBe('Every weekday');
  });

  it('describes a specific weekday set', () => {
    const rule: RecurrenceRule = { freq: RecurrenceFreq.WEEKLY, interval: 1, byWeekday: [3, 1] };
    expect(describeRecurrence(rule)).toBe('Weekly on Mon, Wed');
  });
});
