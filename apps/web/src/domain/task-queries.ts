import {
  Priority,
  SmartListId,
  type Task,
} from '@todomaster/shared';

/**
 * Pure query/derivation logic for tasks. No I/O, no React — trivially unit
 * tested and reusable by smart lists, filters, sorting, and the calendar.
 *
 * All date comparisons use the local calendar day (YYYY-MM-DD) so "today"
 * matches the user's wall clock, not UTC.
 */

export type SortKey =
  | 'dueDate'
  | 'priority'
  | 'alphabetical'
  | 'createdDate'
  | 'modifiedDate';

export interface TaskFilters {
  listId?: string | null;
  tagId?: string;
  priority?: Priority;
  /** Inclusive ISO date range on dueDate. */
  fromDate?: string;
  toDate?: string;
  completed?: boolean;
}

/** Local calendar day as YYYY-MM-DD. */
export function toLocalDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Only top-level tasks (not subtasks), not archived, not deleted. */
export function isVisibleTopLevel(task: Task): boolean {
  return (
    task.parentTaskId === null &&
    !task.archived &&
    task.deletedAt === null
  );
}

export function matchesSmartList(
  task: Task,
  smartList: SmartListId,
  today: string,
): boolean {
  if (!isVisibleTopLevel(task)) return false;

  switch (smartList) {
    case SmartListId.TODAY:
      return !task.completed && task.dueDate !== null && task.dueDate <= today;
    case SmartListId.UPCOMING:
      return !task.completed && task.dueDate !== null && task.dueDate > today;
    case SmartListId.OVERDUE:
      return !task.completed && task.dueDate !== null && task.dueDate < today;
    case SmartListId.COMPLETED:
      return task.completed;
    case SmartListId.ALL:
      return !task.completed;
    case SmartListId.HIGH_PRIORITY:
      return !task.completed && task.priority === Priority.HIGH;
    case SmartListId.NO_DATE:
      return !task.completed && task.dueDate === null;
    default:
      return false;
  }
}

export function matchesFilters(task: Task, filters: TaskFilters): boolean {
  if (filters.listId !== undefined && task.listId !== filters.listId) return false;
  if (filters.tagId !== undefined && !task.tagIds.includes(filters.tagId)) return false;
  if (filters.priority !== undefined && task.priority !== filters.priority) return false;
  if (filters.completed !== undefined && task.completed !== filters.completed) return false;
  if (filters.fromDate !== undefined && (task.dueDate === null || task.dueDate < filters.fromDate))
    return false;
  if (filters.toDate !== undefined && (task.dueDate === null || task.dueDate > filters.toDate))
    return false;
  return true;
}

/**
 * Free-text search over title, description, notes, and tag names. Tag names are
 * passed in (resolved from `task.tagIds` by the caller) so this stays a pure
 * function with no dependency on the tag store.
 */
export function matchesQuery(task: Task, query: string, tagNames: string[] = []): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return (
    task.title.toLowerCase().includes(q) ||
    task.description.toLowerCase().includes(q) ||
    task.notes.toLowerCase().includes(q) ||
    tagNames.some((name) => name.toLowerCase().includes(q))
  );
}

/** Sorts after any real ISO datetime so no-date tasks land last. */
const NO_DATE_SENTINEL = '9999-12-31T99:99';

const compareByKey: Record<SortKey, (a: Task, b: Task) => number> = {
  // Tasks with no due date sort last; else ascending by date+time.
  dueDate: (a, b) => {
    const av = a.dueDate ? `${a.dueDate}T${a.dueTime ?? '99:99'}` : NO_DATE_SENTINEL;
    const bv = b.dueDate ? `${b.dueDate}T${b.dueTime ?? '99:99'}` : NO_DATE_SENTINEL;
    return av.localeCompare(bv);
  },
  // Higher priority first.
  priority: (a, b) => b.priority - a.priority,
  alphabetical: (a, b) => a.title.localeCompare(b.title),
  createdDate: (a, b) => a.createdAt.localeCompare(b.createdAt),
  modifiedDate: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
};

/** Stable sort with a deterministic tie-breaker on `order` then `id`. */
export function sortTasks(tasks: Task[], key: SortKey): Task[] {
  const primary = compareByKey[key];
  return [...tasks].sort(
    (a, b) => primary(a, b) || a.order - b.order || a.id.localeCompare(b.id),
  );
}
