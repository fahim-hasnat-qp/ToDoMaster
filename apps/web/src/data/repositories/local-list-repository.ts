import { v4 as uuid } from 'uuid';
import {
  DEFAULT_LISTS,
  createListSchema,
  listSchema,
  updateListSchema,
  type CreateListInput,
  type List,
  type UpdateListInput,
} from '@todomaster/shared';
import { AppError } from '@/core/result';
import type { TodoDatabase } from '../db/database';
import type { LocalList } from '../db/schema';
import type { ListRepository } from './types';
import {
  freshMeta,
  nowIso,
  recordChange,
  SyncEntity,
  SyncOp,
} from './sync-recorder';

const toList = (row: LocalList): List => {
  const { dirty: _d, lastSyncedAt: _l, ...list } = row;
  return list;
};

export class LocalListRepository implements ListRepository {
  constructor(private readonly db: TodoDatabase) {}

  async getAll(): Promise<List[]> {
    const rows = await this.db.lists
      .filter((l) => l.deletedAt === null)
      .toArray();
    return rows.sort((a, b) => a.order - b.order).map(toList);
  }

  async getById(id: string): Promise<List | undefined> {
    const row = await this.db.lists.get(id);
    if (!row || row.deletedAt != null) return undefined;
    return toList(row);
  }

  async create(input: CreateListInput): Promise<List> {
    const parsed = createListSchema.parse(input);
    const ts = nowIso();
    const list: List = listSchema.parse({
      ...parsed,
      id: uuid(),
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
      version: 0,
    });
    const row: LocalList = { ...list, ...freshMeta() };
    await this.db.transaction('rw', this.db.lists, this.db.outbox, async () => {
      await this.db.lists.add(row);
      await recordChange(this.db, SyncEntity.LIST, list.id, SyncOp.UPSERT, 0, list);
    });
    return list;
  }

  async update(id: string, patch: UpdateListInput): Promise<List> {
    const parsedPatch = updateListSchema.parse(patch);
    let updated!: List;
    await this.db.transaction('rw', this.db.lists, this.db.outbox, async () => {
      const existing = await this.db.lists.get(id);
      if (!existing || existing.deletedAt !== null) {
        throw new AppError('NOT_FOUND', `List ${id} not found`);
      }
      const merged: LocalList = {
        ...existing,
        ...parsedPatch,
        updatedAt: nowIso(),
        dirty: true,
      };
      updated = toList(merged);
      await this.db.lists.put(merged);
      await recordChange(
        this.db,
        SyncEntity.LIST,
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
      this.db.lists,
      this.db.tasks,
      this.db.outbox,
      async () => {
        const existing = await this.db.lists.get(id);
        if (!existing) return;
        const ts = nowIso();
        await this.db.lists.put({ ...existing, deletedAt: ts, updatedAt: ts, dirty: true });
        await recordChange(this.db, SyncEntity.LIST, id, SyncOp.DELETE, existing.version);

        // Orphaned tasks move to "no list" rather than vanishing from list-scoped views.
        const orphaned = await this.db.tasks.where('listId').equals(id).toArray();
        for (const task of orphaned) {
          await this.db.tasks.put({ ...task, listId: null, updatedAt: ts, dirty: true });
          await recordChange(
            this.db,
            SyncEntity.TASK,
            task.id,
            SyncOp.UPSERT,
            task.version,
            { ...task, listId: null, updatedAt: ts },
          );
        }
      },
    );
  }

  /**
   * Idempotent even under concurrent calls (e.g. React StrictMode's double-
   * invoked effects, or two tabs opened at once on first launch). The
   * check-then-seed is wrapped in one 'rw' transaction on `lists` so a second
   * concurrent call queues behind the first and then correctly sees count > 0
   * — without this, both calls could read count === 0 before either had
   * written, seeding the four default lists twice.
   */
  async ensureDefaults(): Promise<void> {
    await this.db.transaction('rw', this.db.lists, this.db.outbox, async () => {
      const count = await this.db.lists.filter((l) => l.deletedAt === null).count();
      if (count > 0) return;

      for (const def of DEFAULT_LISTS) {
        const ts = nowIso();
        const list: List = listSchema.parse({
          ...createListSchema.parse(def),
          id: uuid(),
          createdAt: ts,
          updatedAt: ts,
          deletedAt: null,
          version: 0,
        });
        const finalList: List = { ...list, isDefault: true };
        const row: LocalList = { ...finalList, ...freshMeta() };
        await this.db.lists.add(row);
        await recordChange(this.db, SyncEntity.LIST, finalList.id, SyncOp.UPSERT, 0, finalList);
      }
    });
  }
}
