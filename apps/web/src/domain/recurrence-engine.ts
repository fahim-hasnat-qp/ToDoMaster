import { addDays, addMonths, addWeeks, addYears, getISODay, parseISO } from 'date-fns';
import { RecurrenceFreq, type RecurrenceRule, type Weekday } from '@todomaster/shared';
import { toLocalDay } from './task-queries';

/**
 * Pure recurrence expansion — given a task's current due date and its rule,
 * computes the next occurrence's due date (ISO "YYYY-MM-DD"), or null if the
 * series has ended (`until`/`count` exhausted).
 *
 * Completion model (rolling, matching TickTick/Todoist): completing a recurring
 * task never archives it. The task store advances `dueDate` to this function's
 * result and resets `completed: false` — see task-store.ts `toggleComplete`.
 * `count` is tracked via `occurrencesCompleted`, incremented by the caller each
 * time a rolling completion happens (kept out of this pure function so it stays
 * a simple date-in/date-out calculation with no hidden mutable state).
 */

/** ISO weekday of `date` (1=Mon..7=Sun), matching the shared `Weekday` type. */
function isoWeekday(date: Date): Weekday {
  return getISODay(date) as Weekday;
}

function nextByWeekdaySet(from: Date, byWeekday: readonly Weekday[]): Date {
  const sorted = [...byWeekday].sort((a, b) => a - b);
  const currentIso = isoWeekday(from);
  const next = sorted.find((day) => day > currentIso);
  if (next !== undefined) {
    return addDays(from, next - currentIso);
  }
  // Wrap to the earliest weekday next week.
  const first = sorted[0];
  if (first === undefined) return from;
  return addDays(from, 7 - currentIso + first);
}

/** Advances `date` by one occurrence of `rule`, ignoring `until`/`count`. */
function advance(date: Date, rule: RecurrenceRule): Date {
  switch (rule.freq) {
    case RecurrenceFreq.DAILY:
      return addDays(date, rule.interval);
    case RecurrenceFreq.WEEKLY:
      if (rule.byWeekday && rule.byWeekday.length > 0) {
        return nextByWeekdaySet(date, rule.byWeekday);
      }
      return addWeeks(date, rule.interval);
    case RecurrenceFreq.MONTHLY:
      return addMonths(date, rule.interval);
    case RecurrenceFreq.YEARLY:
      return addYears(date, rule.interval);
    default:
      return date;
  }
}

export interface RecurrenceState {
  dueDate: string;
  /** Number of occurrences completed so far in this series (for `count` limits). */
  occurrencesCompleted: number;
}

/**
 * Computes the next occurrence after completing the current one.
 * Returns null when the series has ended (`until` passed or `count` reached).
 */
export function computeNextOccurrence(
  state: RecurrenceState,
  rule: RecurrenceRule,
): string | null {
  const completedCount = state.occurrencesCompleted + 1;
  if (rule.count !== undefined && completedCount >= rule.count) {
    return null;
  }

  const next = advance(parseISO(state.dueDate), rule);

  if (rule.until !== undefined && toLocalDay(next) > toLocalDay(parseISO(rule.until))) {
    return null;
  }

  return toLocalDay(next);
}

/** Human-readable summary for the recurrence editor / task item badge. */
export function describeRecurrence(rule: RecurrenceRule): string {
  const { freq, interval, byWeekday } = rule;

  if (freq === RecurrenceFreq.WEEKLY && byWeekday && byWeekday.length > 0) {
    const isWeekdaysOnly =
      byWeekday.length === 5 && [1, 2, 3, 4, 5].every((d) => byWeekday.includes(d as Weekday));
    if (isWeekdaysOnly) return 'Every weekday';
    const names = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return `Weekly on ${[...byWeekday].sort((a, b) => a - b).map((d) => names[d]).join(', ')}`;
  }

  const unit: Record<string, string> = {
    [RecurrenceFreq.DAILY]: 'day',
    [RecurrenceFreq.WEEKLY]: 'week',
    [RecurrenceFreq.MONTHLY]: 'month',
    [RecurrenceFreq.YEARLY]: 'year',
  };
  const unitLabel = unit[freq] ?? freq.toLowerCase();
  if (interval === 1) return `Every ${unitLabel}`;
  return `Every ${interval} ${unitLabel}s`;
}
