import { z } from 'zod';

/**
 * Sync metadata carried by every syncable entity.
 * - `updatedAt` / `deletedAt` are ISO strings (portable across api ↔ IndexedDB).
 * - `version` is a monotonic integer the server owns; used for conflict guards.
 */
export const syncMetaSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().default(null),
  version: z.number().int().nonnegative().default(0),
});

export type SyncMeta = z.infer<typeof syncMetaSchema>;

/** Fields the client manages locally but never sends to the server as-is. */
export const localSyncFields = ['dirty', 'lastSyncedAt'] as const;

export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, 'Must be a #RRGGBB hex color');
