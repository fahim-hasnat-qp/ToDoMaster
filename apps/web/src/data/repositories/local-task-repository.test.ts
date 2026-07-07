import { beforeEach, describe, expect, it } from 'vitest';
import { Priority, RecurrenceFreq, SyncEntity, SyncOp } from '@todomaster/shared';
import { TodoDatabase } from '../db/database';
import { LocalTaskRepository } from './local-task-repository';

let db: TodoDatabase;
let repo: LocalTaskRepository;
let counter = 0;

beforeEach(async () => {
  // Fresh, isolated DB per test (unique name avoids cross-test bleed).
  db = new TodoDatabase(`test-tasks-${counter++}`);
  await db.open();
  repo = new LocalTaskRepository(db);
});

describe('LocalTaskRepository — offline write path', () => {
  it('creates a task and records an UPSERT in the outbox atomically', async () => {
    const task = await repo.create({ title: 'Write tests', priority: Priority.HIGH });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Write tests');
    expect(task.priority).toBe(Priority.HIGH);
    expect(task.version).toBe(0);

    const outbox = await db.outbox.toArray();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({
      entity: SyncEntity.TASK,
      entityId: task.id,
      op: SyncOp.UPSERT,
      baseVersion: 0,
    });

    // Stored row is flagged dirty for the sync engine.
    const row = await db.tasks.get(task.id);
    expect(row?.dirty).toBe(true);
  });

  it('getAll excludes soft-deleted tasks', async () => {
    const a = await repo.create({ title: 'A' });
    await repo.create({ title: 'B' });
    await repo.softDelete(a.id);

    const all = await repo.getAll();
    expect(all.map((t) => t.title)).toEqual(['B']);
  });

  it('updates a task and records a new outbox entry with the prior version', async () => {
    const task = await repo.create({ title: 'Old' });
    const updated = await repo.update(task.id, { title: 'New' });

    expect(updated.title).toBe('New');
    const outbox = await db.outbox.toArray();
    expect(outbox).toHaveLength(2); // create + update
    expect(outbox[1]).toMatchObject({ op: SyncOp.UPSERT, baseVersion: 0 });
  });

  it('soft-deletes a task and its subtasks with DELETE outbox entries', async () => {
    const parent = await repo.create({ title: 'Parent' });
    await repo.create({ title: 'Child', parentTaskId: parent.id });

    await repo.softDelete(parent.id);

    const all = await repo.getAll();
    expect(all).toHaveLength(0); // both tombstoned

    const deletes = (await db.outbox.toArray()).filter((c) => c.op === SyncOp.DELETE);
    expect(deletes).toHaveLength(2); // parent + child
  });

  it('duplicates a task as a fresh, uncompleted copy with subtasks', async () => {
    const parent = await repo.create({
      title: 'Report',
      completed: true,
      priority: Priority.MEDIUM,
    });
    await repo.create({ title: 'Section 1', parentTaskId: parent.id });

    const copy = await repo.duplicate(parent.id);

    expect(copy.title).toBe('Report (copy)');
    expect(copy.completed).toBe(false);
    expect(copy.priority).toBe(Priority.MEDIUM);

    const all = await repo.getAll();
    const childrenOfCopy = all.filter((t) => t.parentTaskId === copy.id);
    expect(childrenOfCopy).toHaveLength(1);
    expect(childrenOfCopy[0]?.title).toBe('Section 1');
  });

  it('duplicates a checklist with fresh item ids and resets done state', async () => {
    const original = await repo.create({
      title: 'Packing list',
      checklist: [
        { id: crypto.randomUUID(), text: 'Passport', done: true, order: 0 },
        { id: crypto.randomUUID(), text: 'Charger', done: false, order: 1 },
      ],
    });

    const copy = await repo.duplicate(original.id);

    expect(copy.checklist).toHaveLength(2);
    expect(copy.checklist.every((item) => !item.done)).toBe(true);
    expect(copy.checklist.map((item) => item.text)).toEqual(['Passport', 'Charger']);
    const originalIds = new Set(original.checklist.map((item) => item.id));
    expect(copy.checklist.every((item) => !originalIds.has(item.id))).toBe(true);
  });

  it('persists recurrence rule and rolls dueDate/recurrenceCount on update', async () => {
    const task = await repo.create({
      title: 'Standup',
      dueDate: '2026-07-06',
      recurrence: { freq: RecurrenceFreq.DAILY, interval: 1 },
    });
    expect(task.recurrenceCount).toBe(0);

    const rolled = await repo.update(task.id, {
      dueDate: '2026-07-07',
      recurrenceCount: 1,
    });

    expect(rolled.completed).toBe(false); // rolling never marks it complete
    expect(rolled.dueDate).toBe('2026-07-07');
    expect(rolled.recurrenceCount).toBe(1);
    expect(rolled.recurrence).toEqual({ freq: RecurrenceFreq.DAILY, interval: 1 });
  });

  it('duplicating a recurring task resets recurrenceCount to 0', async () => {
    const original = await repo.create({
      title: 'Weekly review',
      dueDate: '2026-07-06',
      recurrence: { freq: RecurrenceFreq.WEEKLY, interval: 1 },
    });
    await repo.update(original.id, { recurrenceCount: 4 });

    const copy = await repo.duplicate(original.id);

    expect(copy.recurrenceCount).toBe(0);
    expect(copy.recurrence).toEqual({ freq: RecurrenceFreq.WEEKLY, interval: 1 });
  });
});
