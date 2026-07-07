import { v4 as uuid } from 'uuid';
import {
  createTagSchema,
  tagSchema,
  updateTagSchema,
  type CreateTagInput,
  type Tag,
  type UpdateTagInput,
} from '@todomaster/shared';
import { AppError } from '@/core/result';
import type { TodoDatabase } from '../db/database';
import type { LocalTag } from '../db/schema';
import type { TagRepository } from './types';
import {
  freshMeta,
  nowIso,
  recordChange,
  SyncEntity,
  SyncOp,
} from './sync-recorder';

const toTag = (row: LocalTag): Tag => {
  const { dirty: _d, lastSyncedAt: _l, ...tag } = row;
  return tag;
};

export class LocalTagRepository implements TagRepository {
  constructor(private readonly db: TodoDatabase) {}

  async getAll(): Promise<Tag[]> {
    const rows = await this.db.tags
      .filter((t) => t.deletedAt === null)
      .toArray();
    return rows.map(toTag);
  }

  async getById(id: string): Promise<Tag | undefined> {
    const row = await this.db.tags.get(id);
    if (!row || row.deletedAt !== null) return undefined;
    return toTag(row);
  }

  async create(input: CreateTagInput): Promise<Tag> {
    const parsed = createTagSchema.parse(input);
    const ts = nowIso();
    const tag: Tag = tagSchema.parse({
      ...parsed,
      id: uuid(),
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
      version: 0,
    });
    const row: LocalTag = { ...tag, ...freshMeta() };
    await this.db.transaction('rw', this.db.tags, this.db.outbox, async () => {
      await this.db.tags.add(row);
      await recordChange(this.db, SyncEntity.TAG, tag.id, SyncOp.UPSERT, 0, tag);
    });
    return tag;
  }

  async update(id: string, patch: UpdateTagInput): Promise<Tag> {
    const parsedPatch = updateTagSchema.parse(patch);
    let updated!: Tag;
    await this.db.transaction('rw', this.db.tags, this.db.outbox, async () => {
      const existing = await this.db.tags.get(id);
      if (!existing || existing.deletedAt !== null) {
        throw new AppError('NOT_FOUND', `Tag ${id} not found`);
      }
      const merged: LocalTag = {
        ...existing,
        ...parsedPatch,
        updatedAt: nowIso(),
        dirty: true,
      };
      updated = toTag(merged);
      await this.db.tags.put(merged);
      await recordChange(
        this.db,
        SyncEntity.TAG,
        id,
        SyncOp.UPSERT,
        existing.version,
        updated,
      );
    });
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.db.transaction(
      'rw',
      this.db.tags,
      this.db.tasks,
      this.db.outbox,
      async () => {
        const existing = await this.db.tags.get(id);
        if (!existing) return;
        const ts = nowIso();
        await this.db.tags.put({ ...existing, deletedAt: ts, updatedAt: ts, dirty: true });
        await recordChange(this.db, SyncEntity.TAG, id, SyncOp.DELETE, existing.version);

        // Strip the deleted tag from every task that referenced it.
        const tagged = await this.db.tasks.where('tagIds').equals(id).toArray();
        for (const task of tagged) {
          const tagIds = task.tagIds.filter((t) => t !== id);
          await this.db.tasks.put({ ...task, tagIds, updatedAt: ts, dirty: true });
          await recordChange(
            this.db,
            SyncEntity.TASK,
            task.id,
            SyncOp.UPSERT,
            task.version,
            { ...task, tagIds, updatedAt: ts },
          );
        }
      },
    );
  }
}
