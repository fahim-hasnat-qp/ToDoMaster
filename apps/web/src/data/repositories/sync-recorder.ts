import { v4 as uuid } from 'uuid';
import {
  SyncEntity,
  SyncOp,
  type Change,
} from '@todomaster/shared';
import type { TodoDatabase } from '../db/database';
import type { LocalMeta } from '../db/schema';

/** ISO timestamp helper (single place to swap clock in tests). */
export const nowIso = (): string => new Date().toISOString();

export const freshMeta = (): LocalMeta => ({
  dirty: true,
  lastSyncedAt: null,
});

/**
 * Records an optimistic local write into the outbox so the Sync Engine can push
 * it later. Called inside the same Dexie transaction as the data write so the
 * write and its outbox entry commit atomically — no lost changes on reload.
 */
export async function recordChange(
  db: TodoDatabase,
  entity: SyncEntity,
  entityId: string,
  op: SyncOp,
  baseVersion: number,
  payload?: Record<string, unknown>,
): Promise<void> {
  const change: Change = {
    opId: uuid(),
    entity,
    entityId,
    op,
    payload,
    baseVersion,
    clientTs: nowIso(),
  };
  await db.outbox.add(change);
}

export { SyncEntity, SyncOp };
