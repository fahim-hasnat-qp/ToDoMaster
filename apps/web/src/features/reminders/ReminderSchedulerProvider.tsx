import { useEffect } from 'react';
import { useTaskStore } from '@/features/tasks/task-store';
import { useSettingsStore } from '@/stores/settings-store';
import { reminderScheduler } from './reminder-scheduler';
import { dailySummaryScheduler } from './daily-summary-scheduler';

/**
 * Starts the reminder + daily-summary schedulers once tasks are loaded, and
 * re-arms the daily summary whenever its configured time changes. Renders
 * nothing — this is a side-effect-only component, mounted once near the app root.
 */
export function ReminderSchedulerProvider() {
  const tasksLoaded = useTaskStore((s) => !s.loading);
  const dailySummaryTime = useSettingsStore((s) => s.dailySummaryTime);

  useEffect(() => {
    if (!tasksLoaded) return;
    reminderScheduler.start(() => useTaskStore.getState().tasks);
    return () => reminderScheduler.stop();
  }, [tasksLoaded]);

  useEffect(() => {
    if (!tasksLoaded) return;
    dailySummaryScheduler.start(dailySummaryTime, () => useTaskStore.getState().tasks);
    return () => dailySummaryScheduler.stop();
  }, [tasksLoaded, dailySummaryTime]);

  return null;
}
