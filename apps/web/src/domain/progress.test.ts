import { describe, expect, it } from 'vitest';
import { taskSchema, type ChecklistItem, type Task } from '@todomaster/shared';
import { checklistProgress, subtaskProgress } from './progress';

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

function makeItem(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return { id: crypto.randomUUID(), text: 'Item', done: false, order: 0, ...overrides };
}

describe('checklistProgress', () => {
  it('returns 0/0 with ratio 0 for an empty checklist', () => {
    expect(checklistProgress([])).toEqual({ done: 0, total: 0, ratio: 0 });
  });

  it('counts done items and computes the ratio', () => {
    const items = [makeItem({ done: true }), makeItem({ done: true }), makeItem({ done: false })];
    expect(checklistProgress(items)).toEqual({ done: 2, total: 3, ratio: 2 / 3 });
  });
});

describe('subtaskProgress', () => {
  it('returns 0/0 when the task has no subtasks', () => {
    const parent = makeTask();
    expect(subtaskProgress([parent], parent.id)).toEqual({ done: 0, total: 0, ratio: 0 });
  });

  it('counts only direct, non-deleted subtasks of the given parent', () => {
    const parent = makeTask();
    const other = makeTask();
    const subA = makeTask({ parentTaskId: parent.id, completed: true });
    const subB = makeTask({ parentTaskId: parent.id, completed: false });
    const subOfOther = makeTask({ parentTaskId: other.id, completed: true });
    const deletedSub = makeTask({
      parentTaskId: parent.id,
      completed: true,
      deletedAt: '2026-01-02T00:00:00.000Z',
    });

    const result = subtaskProgress(
      [parent, other, subA, subB, subOfOther, deletedSub],
      parent.id,
    );
    expect(result).toEqual({ done: 1, total: 2, ratio: 0.5 });
  });
});
