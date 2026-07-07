import { beforeEach, describe, expect, it } from 'vitest';
import { SyncEntity, SyncOp } from '@todomaster/shared';
import { TodoDatabase } from '../db/database';
import { LocalTagRepository } from './local-tag-repository';
import { LocalTaskRepository } from './local-task-repository';

let db: TodoDatabase;
let tagRepo: LocalTagRepository;
let taskRepo: LocalTaskRepository;
let counter = 0;

beforeEach(async () => {
  db = new TodoDatabase(`test-tags-${counter++}`);
  await db.open();
  tagRepo = new LocalTagRepository(db);
  taskRepo = new LocalTaskRepository(db);
});

describe('LocalTagRepository', () => {
  it('creates a tag and records an outbox UPSERT', async () => {
    const tag = await tagRepo.create({ name: 'urgent', color: '#F5716C' });
    expect(tag.name).toBe('urgent');

    const outbox = await db.outbox.toArray();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ entity: SyncEntity.TAG, op: SyncOp.UPSERT });
  });

  it('strips a deleted tag from every task that referenced it', async () => {
    const tag = await tagRepo.create({ name: 'urgent', color: '#F5716C' });
    const other = await tagRepo.create({ name: 'later', color: '#8D95A2' });
    const task = await taskRepo.create({ title: 'Fix bug', tagIds: [tag.id, other.id] });

    await tagRepo.softDelete(tag.id);

    const reloaded = await taskRepo.getById(task.id);
    expect(reloaded?.tagIds).toEqual([other.id]);

    const deletedTag = await tagRepo.getById(tag.id);
    expect(deletedTag).toBeUndefined();
  });

  it('leaves tasks without the deleted tag untouched', async () => {
    const tag = await tagRepo.create({ name: 'urgent', color: '#F5716C' });
    const untagged = await taskRepo.create({ title: 'No tags' });

    await tagRepo.softDelete(tag.id);

    const reloaded = await taskRepo.getById(untagged.id);
    expect(reloaded?.tagIds).toEqual([]);
  });
});
