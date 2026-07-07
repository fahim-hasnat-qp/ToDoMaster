/**
 * Conflict resolution per ARCHITECTURE.md §7 (see that doc's "Revision of the
 * original design" note for the full reasoning):
 *
 *   - baseVersion === currentVersion -> no conflict, apply directly.
 *   - Mismatch -> conflict, resolved as WHOLE-ROW last-writer-wins by comparing
 *     `clientTs` (when the client made its edit) against the server row's
 *     `updatedAt` (when the conflicting server-side change landed).
 *   - This is whole-row, not field-level: the outbox's `Change.payload` is a
 *     full entity snapshot, not a per-field diff, so the server has no way to
 *     tell "which fields did the client actually change" versus "which fields
 *     were merely present at their old value in this snapshot". Field-level
 *     merge needs diffs in the outbox — a documented future upgrade, not
 *     implemented here to avoid guessing at intent from a full snapshot.
 *   - Deletes always win over edits regardless of clock — there's nothing to
 *     merge into a tombstoned row.
 */

export type ConflictStatus = 'applied' | 'conflict-merged' | 'conflict-lost';

export interface ResolveInput {
  baseVersion: number;
  currentVersion: number;
  currentUpdatedAt: Date;
  clientTs: Date;
  incomingOp: 'upsert' | 'delete';
  currentDeletedAt: Date | null;
}

export interface ResolveResult {
  status: ConflictStatus;
  /** Whether the incoming change should actually be written. */
  shouldApply: boolean;
}

export function resolveConflict(input: ResolveInput): ResolveResult {
  // A prior delete always wins over any later edit, regardless of clocks —
  // there's nothing to "merge" into a tombstoned row.
  if (input.currentDeletedAt !== null && input.incomingOp !== 'delete') {
    return { status: 'conflict-lost', shouldApply: false };
  }

  // No conflict: the client was editing the version the server still has.
  if (input.baseVersion === input.currentVersion) {
    return { status: 'applied', shouldApply: true };
  }

  // A delete always applies regardless of version drift — deleting a row that
  // changed since your last sync is still a valid delete.
  if (input.incomingOp === 'delete') {
    return { status: 'applied', shouldApply: true };
  }

  // Whole-row LWW (see file header for why this isn't field-level yet).
  if (input.clientTs.getTime() >= input.currentUpdatedAt.getTime()) {
    return { status: 'conflict-merged', shouldApply: true };
  }
  return { status: 'conflict-lost', shouldApply: false };
}
