import type { Task } from '@todomaster/shared';
import { collectDueReminders } from '@/domain/reminders';
import { notificationService } from '@/core/notifications';
import { logger } from '@/core/logger';

/**
 * Schedules in-memory timers for reminders due within the next SCAN_WINDOW_MS.
 * Re-scans on an interval so newly created/edited reminders and the rolling
 * window itself stay covered — see core/notifications.ts for why this is
 * tab-open-only, not true background push.
 */
const SCAN_WINDOW_MS = 60 * 60 * 1000; // look 1 hour ahead at a time
const RESCAN_INTERVAL_MS = 5 * 60 * 1000; // re-scan every 5 minutes

export class ReminderScheduler {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private rescanHandle: ReturnType<typeof setInterval> | null = null;

  /** Starts periodic scanning. `getTasks` is called fresh on each scan so edits are picked up. */
  start(getTasks: () => Task[]): void {
    this.scan(getTasks());
    this.rescanHandle = setInterval(() => this.scan(getTasks()), RESCAN_INTERVAL_MS);
  }

  stop(): void {
    if (this.rescanHandle) clearInterval(this.rescanHandle);
    this.rescanHandle = null;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  private scan(tasks: Task[]): void {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + SCAN_WINDOW_MS);
    const due = collectDueReminders(tasks, now, windowEnd);

    for (const { task, reminder, fireAt } of due) {
      const key = reminder.id;
      if (this.timers.has(key)) continue; // already armed this run

      const delay = Math.max(0, fireAt.getTime() - now.getTime());
      const timer = setTimeout(() => {
        notificationService.notify(task.title, {
          body: task.description || 'Reminder',
          tag: reminder.id,
        });
        this.timers.delete(key);
        logger.debug('Reminder fired', { taskId: task.id, reminderId: reminder.id });
      }, delay);

      this.timers.set(key, timer);
    }
  }
}

export const reminderScheduler = new ReminderScheduler();
