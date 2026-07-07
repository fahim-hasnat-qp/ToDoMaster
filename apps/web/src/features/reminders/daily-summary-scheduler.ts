import type { Task } from '@todomaster/shared';
import { summarizeForDailyDigest } from '@/domain/reminders';
import { toLocalDay } from '@/domain/task-queries';
import { notificationService } from '@/core/notifications';

/**
 * Schedules a single recurring timer that fires the daily summary notification
 * at the configured local "HH:mm". Re-arms itself for the next day after firing,
 * and re-arms on `reschedule()` when the user changes the time in Settings.
 * Same tab-open-only caveat as reminder-scheduler.ts.
 */
export class DailySummaryScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;

  start(time: string | null, getTasks: () => Task[]): void {
    this.stop();
    if (!time) return;
    this.armNext(time, getTasks);
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private armNext(time: string, getTasks: () => Task[]): void {
    const [hour, minute] = time.split(':').map(Number);
    const now = new Date();
    const next = new Date(now);
    next.setHours(hour ?? 9, minute ?? 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    const delay = next.getTime() - now.getTime();
    this.timer = setTimeout(() => {
      const tasks = getTasks();
      const body = summarizeForDailyDigest(tasks, toLocalDay(new Date()));
      notificationService.notify('Daily Summary', { body, tag: 'daily-summary' });
      this.armNext(time, getTasks); // re-arm for tomorrow
    }, delay);
  }
}

export const dailySummaryScheduler = new DailySummaryScheduler();
