import Dexie, { type Table } from 'dexie';
import type {
  LocalList,
  LocalTag,
  LocalTask,
  OutboxEntry,
  SyncStateRow,
} from './schema';

/**
 * The offline-first source of truth. Indexes are chosen for the hot queries
 * (by list, by due date, by completion, by parent, and `dirty` for the outbox
 * sweep). IndexedDB has no joins, so we index the fields we filter/sort on.
 *
 * Multi-valued index `*tagIds` lets us query tasks by tag efficiently.
 */
export class TodoDatabase extends Dexie {
  tasks!: Table<LocalTask, string>;
  lists!: Table<LocalList, string>;
  tags!: Table<LocalTag, string>;
  outbox!: Table<OutboxEntry, number>;
  syncState!: Table<SyncStateRow, string>;

  constructor(name = 'todomaster') {
    super(name);
    this.version(1).stores({
      tasks:
        'id, listId, parentTaskId, dueDate, completed, archived, priority, order, updatedAt, dirty, *tagIds',
      lists: 'id, order, isDefault, updatedAt, dirty',
      tags: 'id, name, updatedAt, dirty',
      outbox: '++seq, opId, entity, entityId',
      syncState: 'key',
    });
  }
}

/** Default app-wide instance. Tests construct their own with a unique name. */
export const db = new TodoDatabase();
