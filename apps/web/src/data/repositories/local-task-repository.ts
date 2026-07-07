import { v4 as uuid } from 'uuid';
import {
  createTaskSchema,
  taskSchema,
  updateTaskSchema,
  type CreateTaskInput,
  type Task,
  type UpdateTaskInput,
  type ChecklistItem,
} from '@todomaster/shared';
import { AppError } from '@/core/result';
import type { TodoDatabase } from '../db/database';
import type { LocalTask } from '../db/schema';
import type { TaskRepository } from './types';
import {
  freshMeta,
  nowIso,
  recordChange,
  SyncEntity,
  SyncOp,
} from './sync-recorder';

/** Strips local-only fields before exposing a Task to upper layers. */
const toTask = (row: LocalTask): Task => {
  const { dirty: _d, lastSyncedAt: _l, ...task } = row;
  return task;
};

export class LocalTaskRepository implements TaskRepository {
  constructor(private readonly db: TodoDatabase) {}

  async getAll(): Promise<Task[]> {
    const rows = await this.db.tasks
      .filter((t) => t.deletedAt === null)
      .toArray();
    return rows.map(toTask);
  }

  async getById(id: string): Promise<Task | undefined> {
    const row = await this.db.tasks.get(id);
    if (!row || row.deletedAt !== null) return undefined;
    return toTask(row);
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const parsed = createTaskSchema.parse(input);
    const ts = nowIso();
    // Build a fully-defaulted Task via the schema (fills defaults for omitted fields).
    const task: Task = taskSchema.parse({
      ...parsed,
      id: uuid(),
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
      version: 0,
      completedAt: null,
    });
    const row: LocalTask = { ...task, ...freshMeta() };

    await this.db.transaction('rw', this.db.tasks, this.db.outbox, async () => {
      await this.db.tasks.add(row);
      await recordChange(
        this.db,
        SyncEntity.TASK,
        task.id,
        SyncOp.UPSERT,
        task.version,
        task,
      );
    });
    return task;
  }

  async update(id: string, patch: UpdateTaskInput): Promise<Task> {
    const parsedPatch = updateTaskSchema.parse(patch);
    let updated!: Task;

    await this.db.transaction('rw', this.db.tasks, this.db.outbox, async () => {
      const existing = await this.db.tasks.get(id);
      if (!existing || existing.deletedAt !== null) {
        throw new AppError('NOT_FOUND', `Task ${id} not found`);
      }
      const merged: LocalTask = {
        ...existing,
        ...parsedPatch,
        updatedAt: nowIso(),
        dirty: true,
      };
      updated = toTask(merged);
      await this.db.tasks.put(merged);
      await recordChange(
        this.db,
        SyncEntity.TASK,
        id,
        SyncOp.UPSERT,
        existing.version,
        updated,
      );
    });
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.tasks, this.db.outbox, async () => {
      const existing = await this.db.tasks.get(id);
      if (!existing) return;
      const ts = nowIso();
      const tombstone: LocalTask = {
        ...existing,
        deletedAt: ts,
        updatedAt: ts,
        dirty: true,
      };
      await this.db.tasks.put(tombstone);
      // Also tombstone direct subtasks so they don't orphan.
      const subtasks = await this.db.tasks
        .where('parentTaskId')
        .equals(id)
        .toArray();
      for (const sub of subtasks) {
        await this.db.tasks.put({ ...sub, deletedAt: ts, updatedAt: ts, dirty: true });
        await recordChange(this.db, SyncEntity.TASK, sub.id, SyncOp.DELETE, sub.version);
      }
      await recordChange(this.db, SyncEntity.TASK, id, SyncOp.DELETE, existing.version);
    });
  }

  async duplicate(id: string): Promise<Task> {
    const original = await this.getById(id);
    if (!original) throw new AppError('NOT_FOUND', `Task ${id} not found`);

    const copy = await this.create({
      ...stripForDuplicate(original),
      title: `${original.title} (copy)`,
    });

    // Recreate subtasks pointing at the new parent.
    const subtasks = (await this.getAll()).filter((t) => t.parentTaskId === id);
    for (const sub of subtasks) {
      await this.create({
        ...stripForDuplicate(sub),
        parentTaskId: copy.id,
      });
    }
    return copy;
  }
}

/** Reset completion + freshly clone checklist item ids for a duplicate. */
function stripForDuplicate(task: Task): CreateTaskInput {
  const checklist: ChecklistItem[] = task.checklist.map((item) => ({
    ...item,
    id: uuid(),
    done: false,
  }));
  return {
    title: task.title,
    description: task.description,
    notes: task.notes,
    listId: task.listId,
    priority: task.priority,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    recurrence: task.recurrence,
    parentTaskId: task.parentTaskId,
    order: task.order,
    tagIds: [...task.tagIds],
    checklist,
    reminders: [],
    completed: false,
    archived: false,
  };
}
