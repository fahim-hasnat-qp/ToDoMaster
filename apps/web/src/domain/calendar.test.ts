import { describe, expect, it } from 'vitest';
import { taskSchema, type Task } from '@todomaster/shared';
import { buildAgenda, buildMonthGrid, buildWeekGrid } from './calendar';

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

// July 2026: Jul 1 is a Wednesday, Jul 31 is a Friday.
const JULY_ANCHOR = new Date(2026, 6, 15);
const TODAY = new Date(2026, 6, 5); // Sunday

describe('buildMonthGrid', () => {
  it('produces full weeks (multiple of 7) covering the whole month', () => {
    const days = buildMonthGrid(JULY_ANCHOR, [], TODAY);
    expect(days.length % 7).toBe(0);
    expect(days[0]).toBeDefined();
    expect(days.at(-1)).toBeDefined();
    expect(days[0]?.date.localeCompare('2026-07-01')).toBeLessThanOrEqual(0);
    expect(days.at(-1)?.date.localeCompare('2026-07-31')).toBeGreaterThanOrEqual(0);
  });

  it('marks days outside the anchor month as not current', () => {
    const days = buildMonthGrid(JULY_ANCHOR, [], TODAY);
    const juneDay = days.find((d) => d.date < '2026-07-01');
    const julyDay = days.find((d) => d.date === '2026-07-15');
    expect(juneDay?.isCurrentMonth).toBe(false);
    expect(julyDay?.isCurrentMonth).toBe(true);
  });

  it('marks exactly the today date as isToday', () => {
    const days = buildMonthGrid(JULY_ANCHOR, [], TODAY);
    const flagged = days.filter((d) => d.isToday);
    expect(flagged).toHaveLength(1);
    expect(flagged[0]?.date).toBe('2026-07-05');
  });

  it('buckets tasks under their due date', () => {
    const task = makeTask({ dueDate: '2026-07-10' });
    const days = buildMonthGrid(JULY_ANCHOR, [task], TODAY);
    const day = days.find((d) => d.date === '2026-07-10');
    expect(day?.tasks.map((t) => t.id)).toEqual([task.id]);
  });

  it('excludes subtasks, archived, deleted, and no-date tasks', () => {
    const parent = makeTask({ dueDate: '2026-07-10' });
    const tasks = [
      makeTask({ dueDate: '2026-07-10', parentTaskId: parent.id }),
      makeTask({ dueDate: '2026-07-10', archived: true }),
      makeTask({ dueDate: null }),
    ];
    const days = buildMonthGrid(JULY_ANCHOR, tasks, TODAY);
    const day = days.find((d) => d.date === '2026-07-10');
    expect(day?.tasks).toHaveLength(0);
  });
});

describe('buildWeekGrid', () => {
  it('produces exactly 7 days, Monday through Sunday', () => {
    const days = buildWeekGrid(JULY_ANCHOR, [], TODAY);
    expect(days).toHaveLength(7);
    expect(days[0]?.date).toBe('2026-07-13'); // Monday of that week
    expect(days[6]?.date).toBe('2026-07-19'); // Sunday
  });

  it('buckets tasks under their due date within the week', () => {
    const task = makeTask({ dueDate: '2026-07-15' });
    const days = buildWeekGrid(JULY_ANCHOR, [task], TODAY);
    const day = days.find((d) => d.date === '2026-07-15');
    expect(day?.tasks.map((t) => t.id)).toEqual([task.id]);
  });
});

describe('buildAgenda', () => {
  it('groups incomplete tasks by date, sorted chronologically, within the window', () => {
    const tasks = [
      makeTask({ title: 'Later', dueDate: '2026-07-20' }),
      makeTask({ title: 'Sooner', dueDate: '2026-07-06' }),
      makeTask({ title: 'TooFar', dueDate: '2026-12-01' }), // beyond default 60-day window
    ];
    const groups = buildAgenda(tasks, TODAY);
    expect(groups.map((g) => g.date)).toEqual(['2026-07-06', '2026-07-20']);
  });

  it('excludes completed tasks', () => {
    const tasks = [makeTask({ dueDate: '2026-07-06', completed: true })];
    expect(buildAgenda(tasks, TODAY)).toHaveLength(0);
  });

  it('excludes dates before `from`', () => {
    const tasks = [makeTask({ dueDate: '2026-07-01' })]; // before TODAY (Jul 5)
    expect(buildAgenda(tasks, TODAY)).toHaveLength(0);
  });

  it('groups multiple tasks on the same day together', () => {
    const tasks = [
      makeTask({ title: 'A', dueDate: '2026-07-06' }),
      makeTask({ title: 'B', dueDate: '2026-07-06' }),
    ];
    const groups = buildAgenda(tasks, TODAY);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.tasks).toHaveLength(2);
  });
});
