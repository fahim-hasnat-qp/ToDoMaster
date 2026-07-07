import { describe, expect, it } from 'vitest';
import { ReminderType, taskSchema, type Reminder, type Task } from '@todomaster/shared';
import { collectDueReminders, resolveReminderTime, summarizeForDailyDigest } from './reminders';

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

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: crypto.randomUUID(),
    type: ReminderType.DUE,
    remindAt: new Date(0).toISOString(),
    offsetMinutes: 0,
    ...overrides,
  };
}

describe('resolveReminderTime', () => {
  it('resolves a DUE reminder from dueDate + dueTime minus the offset', () => {
    const task = makeTask({ dueDate: '2026-07-05', dueTime: '17:00' });
    const reminder = makeReminder({ offsetMinutes: 30 });
    const result = resolveReminderTime(task, reminder);
    expect(result?.getHours()).toBe(16);
    expect(result?.getMinutes()).toBe(30);
  });

  it('defaults an all-day (no dueTime) DUE reminder to 9am local', () => {
    const task = makeTask({ dueDate: '2026-07-05', dueTime: null });
    const reminder = makeReminder({ offsetMinutes: 0 });
    const result = resolveReminderTime(task, reminder);
    expect(result?.getHours()).toBe(9);
    expect(result?.getMinutes()).toBe(0);
  });

  it('returns null for a DUE reminder when the task has no due date', () => {
    const task = makeTask({ dueDate: null });
    expect(resolveReminderTime(task, makeReminder())).toBeNull();
  });

  it('resolves a CUSTOM reminder from its own absolute remindAt', () => {
    const task = makeTask({ dueDate: null });
    const reminder = makeReminder({
      type: ReminderType.CUSTOM,
      remindAt: '2026-07-05T12:00:00.000Z',
    });
    const result = resolveReminderTime(task, reminder);
    expect(result?.toISOString()).toBe('2026-07-05T12:00:00.000Z');
  });
});

describe('collectDueReminders', () => {
  it('includes reminders whose fire time falls within [from, to)', () => {
    const task = makeTask({ dueDate: '2026-07-05', dueTime: '10:00' });
    const reminder = makeReminder({ offsetMinutes: 0 });
    const withReminder = { ...task, reminders: [reminder] };

    const from = new Date(2026, 6, 5, 9, 0);
    const to = new Date(2026, 6, 5, 11, 0);
    const result = collectDueReminders([withReminder], from, to);

    expect(result).toHaveLength(1);
    expect(result[0]?.reminder.id).toBe(reminder.id);
  });

  it('excludes reminders outside the window', () => {
    const task = makeTask({ dueDate: '2026-07-05', dueTime: '10:00' });
    const withReminder = { ...task, reminders: [makeReminder()] };

    const from = new Date(2026, 6, 5, 11, 0);
    const to = new Date(2026, 6, 5, 12, 0);
    expect(collectDueReminders([withReminder], from, to)).toHaveLength(0);
  });

  it('excludes reminders on completed, archived, or deleted tasks', () => {
    const base = makeTask({ dueDate: '2026-07-05', dueTime: '10:00' });
    const reminder = makeReminder();
    const from = new Date(2026, 6, 5, 9, 0);
    const to = new Date(2026, 6, 5, 11, 0);

    expect(
      collectDueReminders([{ ...base, completed: true, reminders: [reminder] }], from, to),
    ).toHaveLength(0);
    expect(
      collectDueReminders([{ ...base, archived: true, reminders: [reminder] }], from, to),
    ).toHaveLength(0);
    expect(
      collectDueReminders(
        [{ ...base, deletedAt: '2026-01-01T00:00:00.000Z', reminders: [reminder] }],
        from,
        to,
      ),
    ).toHaveLength(0);
  });

  it('sorts results by fire time ascending', () => {
    const early = { ...makeTask({ dueDate: '2026-07-05', dueTime: '09:00' }), reminders: [makeReminder()] };
    const late = { ...makeTask({ dueDate: '2026-07-05', dueTime: '18:00' }), reminders: [makeReminder()] };

    const from = new Date(2026, 6, 5, 0, 0);
    const to = new Date(2026, 6, 5, 23, 59);
    const result = collectDueReminders([late, early], from, to);

    expect(result[0]?.task.id).toBe(early.id);
    expect(result[1]?.task.id).toBe(late.id);
  });
});

describe('summarizeForDailyDigest', () => {
  const today = '2026-07-05';

  it('reports all caught up when nothing is due', () => {
    expect(summarizeForDailyDigest([], today)).toMatch(/all caught up/i);
  });

  it('reports a single due task by name', () => {
    const task = makeTask({ title: 'Water plants', dueDate: today });
    expect(summarizeForDailyDigest([task], today)).toBe('1 task due: Water plants');
  });

  it('reports a count for multiple due tasks including overdue', () => {
    const tasks = [
      makeTask({ title: 'A', dueDate: today }),
      makeTask({ title: 'B', dueDate: '2026-07-01' }), // overdue, still counted
    ];
    expect(summarizeForDailyDigest(tasks, today)).toMatch(/^2 tasks due today/);
  });

  it('excludes completed, archived, future-dated, no-date, and subtask entries', () => {
    const parent = makeTask({ dueDate: today });
    const tasks = [
      makeTask({ completed: true, dueDate: today }),
      makeTask({ archived: true, dueDate: today }),
      makeTask({ dueDate: '2026-07-10' }), // future
      makeTask({ dueDate: null }),
      makeTask({ dueDate: today, parentTaskId: parent.id }),
    ];
    expect(summarizeForDailyDigest(tasks, today)).toMatch(/all caught up/i);
  });
});
