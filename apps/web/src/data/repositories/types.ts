import type {
  CreateListInput,
  CreateTagInput,
  CreateTaskInput,
  List,
  Tag,
  Task,
  UpdateListInput,
  UpdateTagInput,
  UpdateTaskInput,
} from '@todomaster/shared';

/**
 * Repository ports. The UI and domain layers depend ONLY on these interfaces,
 * never on Dexie or HTTP. The local (Dexie) and future remote (HTTP) impls both
 * satisfy them, so DI can swap or compose them. (Dependency Inversion.)
 */

export interface TaskRepository {
  getAll(): Promise<Task[]>;
  getById(id: string): Promise<Task | undefined>;
  create(input: CreateTaskInput): Promise<Task>;
  update(id: string, patch: UpdateTaskInput): Promise<Task>;
  /** Soft delete (tombstone) so it can propagate across devices. */
  softDelete(id: string): Promise<void>;
  /** Duplicate a task (and its subtasks) as fresh, uncompleted copies. */
  duplicate(id: string): Promise<Task>;
}

export interface ListRepository {
  getAll(): Promise<List[]>;
  getById(id: string): Promise<List | undefined>;
  create(input: CreateListInput): Promise<List>;
  update(id: string, patch: UpdateListInput): Promise<List>;
  softDelete(id: string): Promise<void>;
  /** Idempotently create the four default lists if none exist. */
  ensureDefaults(): Promise<void>;
}

export interface TagRepository {
  getAll(): Promise<Tag[]>;
  getById(id: string): Promise<Tag | undefined>;
  create(input: CreateTagInput): Promise<Tag>;
  update(id: string, patch: UpdateTagInput): Promise<Tag>;
  softDelete(id: string): Promise<void>;
}
