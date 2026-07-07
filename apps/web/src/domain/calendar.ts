import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Task } from '@todomaster/shared';
import { isVisibleTopLevel, toLocalDay } from './task-queries';

/**
 * Pure calendar grid/grouping logic. No I/O, no React. Weeks start Monday
 * (ISO), matching the Weekday enum used elsewhere (recurrence, etc).
 */

export interface CalendarDay {
  date: string; // "YYYY-MM-DD"
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
}

/** Tasks visible on a calendar: top-level, not archived/deleted, with a due date. */
function calendarEligible(task: Task): boolean {
  return isVisibleTopLevel(task) && task.dueDate !== null;
}

/** Groups eligible tasks by their `dueDate` for O(1) lookup while building a grid. */
function groupByDueDate(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!calendarEligible(task)) continue;
    const key = task.dueDate as string;
    const bucket = map.get(key);
    if (bucket) bucket.push(task);
    else map.set(key, [task]);
  }
  return map;
}

/**
 * Builds the 6-week (42-day) grid for a month view, including the leading/
 * trailing days from adjacent months needed to fill whole weeks.
 */
export function buildMonthGrid(monthAnchor: Date, tasks: Task[], today: Date): CalendarDay[] {
  const grouped = groupByDueDate(tasks);
  const monthStart = startOfMonth(monthAnchor);
  const monthEnd = endOfMonth(monthAnchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const todayKey = toLocalDay(today);

  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => {
    const key = toLocalDay(date);
    return {
      date: key,
      isCurrentMonth: date.getMonth() === monthAnchor.getMonth(),
      isToday: key === todayKey,
      tasks: grouped.get(key) ?? [],
    };
  });
}

/** Builds a single week's 7 days (Mon-Sun) for the week view. */
export function buildWeekGrid(weekAnchor: Date, tasks: Task[], today: Date): CalendarDay[] {
  const grouped = groupByDueDate(tasks);
  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekAnchor, { weekStartsOn: 1 });
  const todayKey = toLocalDay(today);

  return eachDayOfInterval({ start: weekStart, end: weekEnd }).map((date) => {
    const key = toLocalDay(date);
    return {
      date: key,
      isCurrentMonth: true, // not meaningful in week view; always "current"
      isToday: key === todayKey,
      tasks: grouped.get(key) ?? [],
    };
  });
}

export interface AgendaGroup {
  date: string;
  tasks: Task[];
}

/**
 * Groups eligible, incomplete tasks by due date from `from` (inclusive, default
 * today) onward, sorted chronologically — the flat list view.
 */
export function buildAgenda(tasks: Task[], from: Date, daysAhead = 60): AgendaGroup[] {
  const grouped = groupByDueDate(
    tasks.filter((t) => !t.completed),
  );
  const fromKey = toLocalDay(from);
  const toKey = toLocalDay(addDays(from, daysAhead));

  return [...grouped.entries()]
    .filter(([date]) => date >= fromKey && date <= toKey)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayTasks]) => ({ date, tasks: dayTasks }));
}
