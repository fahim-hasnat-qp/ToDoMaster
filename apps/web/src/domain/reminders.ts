import { addMinutes, parseISO } from 'date-fns';
import { ReminderType, type Reminder, type Task } from '@todomaster/shared';

/**
 * Pure reminder scheduling logic — computing absolute fire times and which
 * reminders are due, with no dependency on the Notification API or timers.
 * Kept separate from core/notifications.ts so the math is unit-testable without
 * a browser environment.
 */

/**
 * Resolves a DUE reminder's absolute fire time from the task's due date/time and
 * the reminder's offset. Returns null if the task has no due date (a DUE
 * reminder needs an anchor) or no due time (defaults to 9:00 local if all-day —
 * see `ALL_DAY_REMINDER_HOUR`).
 */
const ALL_DAY_REMINDER_HOUR = 9;

export function resolveReminderTime(task: Task, reminder: Reminder): Date | null {
  if (reminder.type === ReminderType.CUSTOM) {
    return parseISO(reminder.remindAt);
  }

  // DUE reminder: derive from the task's due date/time minus the offset.
  if (!task.dueDate) return null;
  const [hour, minute] = task.dueTime
    ? task.dueTime.split(':').map(Number)
    : [ALL_DAY_REMINDER_HOUR, 0];
  const due = parseISO(`${task.dueDate}T00:00:00`);
  due.setHours(hour ?? ALL_DAY_REMINDER_HOUR, minute ?? 0, 0, 0);
  return addMinutes(due, -(reminder.offsetMinutes ?? 0));
}

export interface DueReminder {
  task: Task;
  reminder: Reminder;
  fireAt: Date;
}

/**
 * Collects reminders across all tasks that fire within [from, to) — the window
 * the scheduler should arm timers for. Skips completed/archived/deleted tasks
 * (a finished task's reminders are moot) and reminders with no resolvable time.
 */
export function collectDueReminders(tasks: Task[], from: Date, to: Date): DueReminder[] {
  const results: DueReminder[] = [];
  for (const task of tasks) {
    if (task.completed || task.archived || task.deletedAt !== null) continue;
    for (const reminder of task.reminders) {
      const fireAt = resolveReminderTime(task, reminder);
      if (fireAt && fireAt >= from && fireAt < to) {
        results.push({ task, reminder, fireAt });
      }
    }
  }
  return results.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

/** Builds the notification body for the daily summary (today's due + overdue). */
export function summarizeForDailyDigest(tasks: Task[], today: string): string {
  const relevant = tasks.filter(
    (t) =>
      !t.completed &&
      !t.archived &&
      t.deletedAt === null &&
      t.parentTaskId === null &&
      t.dueDate !== null &&
      t.dueDate <= today,
  );
  if (relevant.length === 0) return "You're all caught up — nothing due today.";
  if (relevant.length === 1) return `1 task due: ${relevant[0]?.title}`;
  return `${relevant.length} tasks due today, including "${relevant[0]?.title}".`;
}
