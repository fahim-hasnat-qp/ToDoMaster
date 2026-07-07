import { beforeEach, describe, expect, it } from 'vitest';
import { SyncEntity, SyncOp } from '@todomaster/shared';
import { TodoDatabase } from '../db/database';
import { LocalListRepository } from './local-list-repository';
import { LocalTaskRepository } from './local-task-repository';

let db: TodoDatabase;
let lists: LocalListRepository;
let tasks: LocalTaskRepository;
let counter = 0;

beforeEach(async () => {
  db = new TodoDatabase(`test-lists-${counter++}`);
  await db.open();
  lists = new LocalListRepository(db);
  tasks = new LocalTaskRepository(db);
});

describe('LocalListRepository', () => {
  it('creates a list and records an outbox UPSERT', async () => {
    const list = await lists.create({ name: 'Groceries', color: '#50C878' });
    expect(list.name).toBe('Groceries');
    expect(list.isDefault).toBe(false);

    const outbox = await db.outbox.toArray();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ entity: SyncEntity.LIST, op: SyncOp.UPSERT });
  });

  it('ensureDefaults seeds exactly the four default lists once', async () => {
    await lists.ensureDefaults();
    const all = await lists.getAll();
    expect(all.map((l) => l.name).sort()).toEqual(['Personal', 'Shopping', 'Study', 'Work']);
    expect(all.every((l) => l.isDefault)).toBe(true);

    await lists.ensureDefaults(); // idempotent
    expect(await lists.getAll()).toHaveLength(4);
  });

  it('does not seed duplicates when called concurrently (React StrictMode double-invoke)', async () => {
    // Regression test: StrictMode mounts effects twice in dev, so two
    // ensureDefaults() calls can race. Without the atomic transaction, both
    // could read count === 0 before either had written, seeding 8 lists.
    await Promise.all([lists.ensureDefaults(), lists.ensureDefaults()]);

    const all = await lists.getAll();
    expect(all).toHaveLength(4);
    expect(all.map((l) => l.name).sort()).toEqual(['Personal', 'Shopping', 'Study', 'Work']);
  });

  it('reassigns tasks to no-list when their list is deleted', async () => {
    const list = await lists.create({ name: 'Temp', color: '#6C8EF5' });
    const task = await tasks.create({ title: 'Do thing', listId: list.id });

    await lists.softDelete(list.id);

    const reloaded = await tasks.getById(task.id);
    expect(reloaded?.listId).toBeNull();

    const deletedList = await lists.getById(list.id);
    expect(deletedList).toBeUndefined();
  });

  it('leaves unrelated tasks untouched when a list is deleted', async () => {
    const listA = await lists.create({ name: 'A', color: '#6C8EF5' });
    const listB = await lists.create({ name: 'B', color: '#F5A623' });
    const taskA = await tasks.create({ title: 'In A', listId: listA.id });
    const taskB = await tasks.create({ title: 'In B', listId: listB.id });

    await lists.softDelete(listA.id);

    expect((await tasks.getById(taskA.id))?.listId).toBeNull();
    expect((await tasks.getById(taskB.id))?.listId).toBe(listB.id);
  });
});
