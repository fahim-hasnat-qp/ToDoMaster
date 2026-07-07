import type { List, Tag, Task } from '@todomaster/shared';
import type { Change } from '@todomaster/shared';

/**
 * Local-only fields layered onto shared entities for offline sync bookkeeping.
 * `dirty` = has unsynced local changes; `lastSyncedAt` = last server reconcile.
 */
export interface LocalMeta {
  dirty: boolean;
  lastSyncedAt: string | null;
}

export type LocalTask = Task & LocalMeta;
export type LocalList = List & LocalMeta;
export type LocalTag = Tag & LocalMeta;

/** A durable outbox row (see ARCHITECTURE.md §7). */
export interface OutboxEntry extends Change {
  /** Auto-increment PK for FIFO ordering. */
  seq?: number;
}

/** Single-row key/value store for sync cursor and misc engine state. */
export interface SyncStateRow {
  key: string;
  value: unknown;
}
