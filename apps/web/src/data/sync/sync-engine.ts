import { SyncEntity, taskSchema, listSchema, tagSchema } from '@todomaster/shared';
import type { TodoDatabase } from '@/data/db/database';
import type { LocalMeta, OutboxEntry } from '@/data/db/schema';
import { logger } from '@/core/logger';
import { nowIso } from '@/data/repositories/sync-recorder';
import { syncApi } from './sync-api';

/**
 * The client half of the sync protocol designed in ARCHITECTURE.md §7. Runs
 * push-then-pull on each cycle: push drains the durable outbox (so offline
 * writes always go out first), pull then reconciles anything that changed on
 * the server (including from OTHER devices) since our last cursor.
 *
 * This engine ONLY touches Dexie directly (never the Zustand stores) — it's a
 * data-layer concern. Stores re-`load()` after a sync cycle to pick up changes;
 * see SyncProvider for that wiring.
 */

const PUSH_BATCH_SIZE = 200;
const CURSOR_KEY = 'lastSyncCursor';

export class SyncEngine {
  constructor(private readonly db: TodoDatabase) {}

  async runCycle(): Promise<void> {
    await this.push();
    await this.pull();
  }

  /** Drains the outbox in FIFO batches, applying each batch's server response locally. */
  private async push(): Promise<void> {
    let batch = await this.db.outbox.orderBy('seq').limit(PUSH_BATCH_SIZE).toArray();

    while (batch.length > 0) {
      let response;
      try {
        response = await syncApi.push(batch);
      } catch (error) {
        logger.warn('Sync push failed — will retry next cycle', { error });
        return; // leave the outbox intact; next cycle retries from the start
      }

      for (const outcome of response.outcomes) {
        if (outcome.serverRow) {
          await this.applyServerRow(entityOfOutboxEntry(batch, outcome.entityId), outcome.serverRow);
        }
      }

      const seqs = batch.map((b) => b.seq).filter((s): s is number => s !== undefined);
      await this.db.outbox.bulkDelete(seqs);

      batch = await this.db.outbox.orderBy('seq').limit(PUSH_BATCH_SIZE).toArray();
    }
  }

  /** Delta-pulls everything changed since the last cursor and merges it in. */
  private async pull(): Promise<void> {
    let since = await this.getCursor();
    let hasMore = true;

    while (hasMore) {
      let response;
      try {
        response = await syncApi.pull(since);
      } catch (error) {
        logger.warn('Sync pull failed — will retry next cycle', { error });
        return;
      }

      for (const { entity, row } of response.rows) {
        await this.applyServerRow(entity, row);
      }

      since = response.cursor;
      hasMore = response.hasMore;
      await this.setCursor(since);
    }
  }

  /**
   * Writes an authoritative server row into Dexie, clearing `dirty`. A row
   * with `deletedAt` set is a tombstone — stored as-is (getAll()/getById()
   * already filter deletedAt !== null), not physically removed, so a
   * concurrent local edit racing this pull still resolves deterministically
   * on the next push (the local outbox entry, if any, will conflict cleanly
   * against the now-current server version rather than vanishing silently).
   */
  private async applyServerRow(entity: SyncEntity, row: Record<string, unknown>): Promise<void> {
    switch (entity) {
      case SyncEntity.TASK: {
        const parsed = safeParse(taskSchema, row);
        if (!parsed) return;
        await this.db.tasks.put(toLocalRow(parsed));
        return;
      }
      case SyncEntity.LIST: {
        const parsed = safeParse(listSchema, row);
        if (!parsed) return;
        await this.db.lists.put(toLocalRow(parsed));
        return;
      }
      case SyncEntity.TAG: {
        const parsed = safeParse(tagSchema, row);
        if (!parsed) return;
        await this.db.tags.put(toLocalRow(parsed));
        return;
      }
    }
  }

  private async getCursor(): Promise<string | null> {
    const row = await this.db.syncState.get(CURSOR_KEY);
    return typeof row?.value === 'string' ? row.value : null;
  }

  private async setCursor(cursor: string): Promise<void> {
    await this.db.syncState.put({ key: CURSOR_KEY, value: cursor });
  }
}

function toLocalRow<T extends object>(entity: T): T & LocalMeta {
  return { ...entity, dirty: false, lastSyncedAt: nowIso() };
}

function safeParse<T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }, row: unknown): T | null {
  const result = schema.safeParse(row);
  if (!result.success) {
    logger.warn('Dropped a pulled row that failed schema validation', { row });
    return null;
  }
  return result.data ?? null;
}

/** The outbox batch doesn't carry entity type on the outcome, so look it up from the original change. */
function entityOfOutboxEntry(batch: OutboxEntry[], entityId: string): SyncEntity {
  const match = batch.find((c) => c.entityId === entityId);
  return match?.entity ?? SyncEntity.TASK;
}
