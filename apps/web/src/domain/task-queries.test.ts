import { describe, expect, it } from 'vitest';
import { Priority, SmartListId, taskSchema, type Task } from '@todomaster/shared';
import {
  matchesFilters,
  matchesQuery,
  matchesSmartList,
  sortTasks,
  toLocalDay,
} from './task-queries';

/** Builds a valid Task with overrides via the shared schema (fills defaults). */
function makeTask(overrides: Partial<Task> = {}): Task {
  return taskSchema.parse({
    id: crypto.randomUUID(),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    version: 0,
    completedAt: null,
    title: 'Task',
    ...overrides,
  });
}

const TODAY = '2026-07-05';

describe('toLocalDay', () => {
  it('formats a date to YYYY-MM-DD in local time', () => {
    expect(toLocalDay(new Date(2026, 6, 5))).toBe('2026-07-05');
    expect(toLocalDay(new Date(2026, 0, 9))).toBe('2026-01-09');
  });
});

describe('matchesSmartList', () => {
  it('TODAY includes tasks due today and overdue, excludes future and completed', () => {
    const list = SmartListId.TODAY;
    expect(matchesSmartList(makeTask({ dueDate: TODAY }), list, TODAY)).toBe(true);
    expect(matchesSmartList(makeTask({ dueDate: '2026-07-01' }), list, TODAY)).toBe(true);
    expect(matchesSmartList(makeTask({ dueDate: '2026-07-10' }), list, TODAY)).toBe(false);
    expect(
      matchesSmartList(makeTask({ dueDate: TODAY, completed: true }), list, TODAY),
    ).toBe(false);
  });

  it('UPCOMING is strictly future incomplete tasks', () => {
    const list = SmartListId.UPCOMING;
    expect(matchesSmartList(makeTask({ dueDate: '2026-07-10' }), list, TODAY)).toBe(true);
    expect(matchesSmartList(makeTask({ dueDate: TODAY }), list, TODAY)).toBe(false);
  });

  it('OVERDUE is strictly past incomplete tasks', () => {
    const list = SmartListId.OVERDUE;
    expect(matchesSmartList(makeTask({ dueDate: '2026-07-01' }), list, TODAY)).toBe(true);
    expect(matchesSmartList(makeTask({ dueDate: TODAY }), list, TODAY)).toBe(false);
  });

  it('COMPLETED includes only completed tasks', () => {
    const list = SmartListId.COMPLETED;
    expect(matchesSmartList(makeTask({ completed: true }), list, TODAY)).toBe(true);
    expect(matchesSmartList(makeTask({ completed: false }), list, TODAY)).toBe(false);
  });

  it('HIGH_PRIORITY includes only incomplete high-priority tasks', () => {
    const list = SmartListId.HIGH_PRIORITY;
    expect(matchesSmartList(makeTask({ priority: Priority.HIGH }), list, TODAY)).toBe(true);
    expect(matchesSmartList(makeTask({ priority: Priority.LOW }), list, TODAY)).toBe(false);
  });

  it('NO_DATE includes incomplete tasks without a due date', () => {
    const list = SmartListId.NO_DATE;
    expect(matchesSmartList(makeTask({ dueDate: null }), list, TODAY)).toBe(true);
    expect(matchesSmartList(makeTask({ dueDate: TODAY }), list, TODAY)).toBe(false);
  });

  it('excludes subtasks, archived, and deleted tasks from smart lists', () => {
    const list = SmartListId.ALL;
    expect(
      matchesSmartList(makeTask({ parentTaskId: crypto.randomUUID() }), list, TODAY),
    ).toBe(false);
    expect(matchesSmartList(makeTask({ archived: true }), list, TODAY)).toBe(false);
  });
});

describe('matchesFilters', () => {
  it('filters by list, priority, tag, and completion', () => {
    const listId = crypto.randomUUID();
    const otherListId = crypto.randomUUID();
    const tagId = crypto.randomUUID();
    const task = makeTask({ listId, priority: Priority.MEDIUM, tagIds: [tagId] });

    expect(matchesFilters(task, { listId })).toBe(true);
    expect(matchesFilters(task, { listId: otherListId })).toBe(false);
    expect(matchesFilters(task, { priority: Priority.MEDIUM })).toBe(true);
    expect(matchesFilters(task, { priority: Priority.HIGH })).toBe(false);
    expect(matchesFilters(task, { tagId })).toBe(true);
    expect(matchesFilters(task, { tagId: crypto.randomUUID() })).toBe(false);
  });

  it('filters by date range on dueDate', () => {
    const task = makeTask({ dueDate: '2026-07-05' });
    expect(matchesFilters(task, { fromDate: '2026-07-01', toDate: '2026-07-31' })).toBe(true);
    expect(matchesFilters(task, { fromDate: '2026-07-06' })).toBe(false);
    expect(matchesFilters(makeTask({ dueDate: null }), { fromDate: '2026-07-01' })).toBe(false);
  });
});

describe('matchesQuery', () => {
  it('matches across title, description, and notes case-insensitively', () => {
    const task = makeTask({ title: 'Buy milk', description: 'From the store', notes: 'urgent' });
    expect(matchesQuery(task, 'MILK')).toBe(true);
    expect(matchesQuery(task, 'store')).toBe(true);
    expect(matchesQuery(task, 'URGENT')).toBe(true);
    expect(matchesQuery(task, 'bread')).toBe(false);
    expect(matchesQuery(task, '   ')).toBe(true); // empty query matches all
  });

  it('matches against resolved tag names when provided', () => {
    const task = makeTask({ title: 'Task', tagIds: [crypto.randomUUID()] });
    expect(matchesQuery(task, 'urgent', ['Urgent'])).toBe(true);
    expect(matchesQuery(task, 'urgent', ['later'])).toBe(false);
    expect(matchesQuery(task, 'urgent')).toBe(false); // no tag names resolved
  });
});

describe('sortTasks', () => {
  it('sorts by priority (high first)', () => {
    const tasks = [
      makeTask({ title: 'low', priority: Priority.LOW }),
      makeTask({ title: 'high', priority: Priority.HIGH }),
      makeTask({ title: 'none', priority: Priority.NONE }),
    ];
    expect(sortTasks(tasks, 'priority').map((t) => t.title)).toEqual(['high', 'low', 'none']);
  });

  it('sorts by due date, tasks without a date last', () => {
    const tasks = [
      makeTask({ title: 'none', dueDate: null }),
      makeTask({ title: 'later', dueDate: '2026-07-10' }),
      makeTask({ title: 'sooner', dueDate: '2026-07-05' }),
    ];
    expect(sortTasks(tasks, 'dueDate').map((t) => t.title)).toEqual([
      'sooner',
      'later',
      'none',
    ]);
  });

  it('sorts alphabetically', () => {
    const tasks = [makeTask({ title: 'Banana' }), makeTask({ title: 'Apple' })];
    expect(sortTasks(tasks, 'alphabetical').map((t) => t.title)).toEqual(['Apple', 'Banana']);
  });

  it('does not mutate the input array', () => {
    const tasks = [makeTask({ title: 'b' }), makeTask({ title: 'a' })];
    const before = tasks.map((t) => t.title);
    sortTasks(tasks, 'alphabetical');
    expect(tasks.map((t) => t.title)).toEqual(before);
  });
});
