import { z } from 'zod';

/**
 * Sync protocol contracts shared by the web Sync Engine and the api Sync module.
 * See ARCHITECTURE.md §7.
 */

export const SyncEntity = {
  TASK: 'task',
  LIST: 'list',
  TAG: 'tag',
} as const;
export type SyncEntity = (typeof SyncEntity)[keyof typeof SyncEntity];

export const SyncOp = {
  UPSERT: 'upsert',
  DELETE: 'delete',
} as const;
export type SyncOp = (typeof SyncOp)[keyof typeof SyncOp];

/** A single durable outbox change produced by an optimistic local write. */
export const changeSchema = z.object({
  /** Client-generated, idempotency key. Server dedupes on this. */
  opId: z.string().uuid(),
  entity: z.nativeEnum(SyncEntity),
  entityId: z.string().uuid(),
  op: z.nativeEnum(SyncOp),
  /** Full entity snapshot for UPSERT; omitted for DELETE. */
  payload: z.record(z.unknown()).optional(),
  /** The version the client believed it was editing (conflict guard). */
  baseVersion: z.number().int().nonnegative(),
  /** Client clock at time of edit (ISO). Tie-breaker / audit only. */
  clientTs: z.string().datetime(),
});
export type Change = z.infer<typeof changeSchema>;

export const pushRequestSchema = z.object({
  changes: z.array(changeSchema).max(500),
});
export type PushRequest = z.infer<typeof pushRequestSchema>;

export const changeOutcomeSchema = z.object({
  opId: z.string().uuid(),
  entityId: z.string().uuid(),
  status: z.enum(['applied', 'conflict-merged', 'conflict-lost', 'deduped']),
  /** Authoritative server row after applying (for the client to overwrite local). */
  serverRow: z.record(z.unknown()).optional(),
  newVersion: z.number().int().nonnegative().optional(),
});
export type ChangeOutcome = z.infer<typeof changeOutcomeSchema>;

export const pushResponseSchema = z.object({
  outcomes: z.array(changeOutcomeSchema),
  /** High-watermark cursor after this push. */
  cursor: z.string().datetime(),
});
export type PushResponse = z.infer<typeof pushResponseSchema>;

export const pullRequestSchema = z.object({
  /** ISO timestamp; null/absent = full sync. */
  since: z.string().datetime().nullable().optional(),
  limit: z.number().int().min(1).max(1000).default(500),
});
export type PullRequest = z.infer<typeof pullRequestSchema>;

/** A changed row (including tombstones — deletedAt set). */
export const pulledRowSchema = z.object({
  entity: z.nativeEnum(SyncEntity),
  row: z.record(z.unknown()),
});
export type PulledRow = z.infer<typeof pulledRowSchema>;

export const pullResponseSchema = z.object({
  rows: z.array(pulledRowSchema),
  /** New cursor to persist; pass back as `since` next time. */
  cursor: z.string().datetime(),
  /** True if more rows remain beyond `limit` (client should pull again). */
  hasMore: z.boolean(),
});
export type PullResponse = z.infer<typeof pullResponseSchema>;
