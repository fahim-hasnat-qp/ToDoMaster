import { describe, expect, it } from 'vitest';
import { createTaskSchema, taskSchema, updateTaskSchema } from './task.js';
import { Priority } from '../domain/enums.js';

describe('taskSchema', () => {
  it('applies defaults for omitted optional fields', () => {
    const task = taskSchema.parse({
      id: crypto.randomUUID(),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      title: 'Test',
    });
    expect(task.description).toBe('');
    expect(task.priority).toBe(Priority.NONE);
    expect(task.completed).toBe(false);
    expect(task.tagIds).toEqual([]);
    expect(task.dueDate).toBeNull();
    expect(task.deletedAt).toBeNull();
  });

  it('rejects an empty title', () => {
    expect(() => createTaskSchema.parse({ title: '' })).toThrow();
  });

  it('rejects an invalid dueTime format', () => {
    expect(() => createTaskSchema.parse({ title: 'x', dueTime: '25:00' })).toThrow();
    expect(createTaskSchema.parse({ title: 'x', dueTime: '09:30' }).dueTime).toBe('09:30');
  });

  it('updateTaskSchema allows setting completedAt', () => {
    const patch = updateTaskSchema.parse({
      completed: true,
      completedAt: '2026-07-05T10:00:00.000Z',
    });
    expect(patch.completedAt).toBe('2026-07-05T10:00:00.000Z');
  });
});
