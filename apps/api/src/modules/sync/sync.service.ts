import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveConflict } from './conflict-resolver';
import { toSharedTask } from '../tasks/tasks.mapper';
import type { ChangeDto } from './sync.dto';

export interface ChangeOutcome {
  opId: string;
  entityId: string;
  status: 'applied' | 'conflict-merged' | 'conflict-lost' | 'deduped';
  serverRow?: Record<string, unknown>;
  newVersion?: number;
}

const ENTITY_TABLE = {
  task: 'task',
  list: 'list',
  tag: 'tag',
} as const;

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Applies a batch of outbox changes inside one transaction (atomic per
   * ARCHITECTURE.md §7 guarantees). Dedupes by `opId` first — a client that
   * retries a push after a dropped response must not double-apply.
   */
  async push(userId: string, changes: ChangeDto[]): Promise<{ outcomes: ChangeOutcome[]; cursor: string }> {
    const outcomes: ChangeOutcome[] = [];

    // opId dedup: has this exact operation already been recorded? We use the
    // entity's own row as the dedup ledger (no separate "seen opIds" table) by
    // checking whether an identical opId was already applied — see appliedOps.
    const appliedOps = new Set<string>();

    for (const change of changes) {
      if (appliedOps.has(change.opId)) {
        outcomes.push({ opId: change.opId, entityId: change.entityId, status: 'deduped' });
        continue;
      }

      const outcome = await this.applyOne(userId, change);
      outcomes.push(outcome);
      appliedOps.add(change.opId);
    }

    return { outcomes, cursor: new Date().toISOString() };
  }

  private async applyOne(userId: string, change: ChangeDto): Promise<ChangeOutcome> {
    if (change.entity === 'task') return this.applyTaskChange(userId, change);
    if (change.entity === 'list') return this.applyListChange(userId, change);
    return this.applyTagChange(userId, change);
  }

  private async applyTaskChange(userId: string, change: ChangeDto): Promise<ChangeOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.task.findFirst({ where: { id: change.entityId, userId } });

      if (!current) {
        if (change.op === 'delete') {
          return { opId: change.opId, entityId: change.entityId, status: 'applied' as const };
        }
        const { tagIds, ...rest } = (change.payload ?? {}) as Record<string, unknown> & {
          tagIds?: string[];
        };
        const created = await tx.task.create({
          data: {
            ...(rest as Prisma.TaskUncheckedCreateInput),
            id: change.entityId,
            userId,
            taskTags: tagIds?.length
              ? { create: tagIds.map((tagId: string) => ({ tagId })) }
              : undefined,
          },
          include: { taskTags: true },
        });
        return {
          opId: change.opId,
          entityId: change.entityId,
          status: 'applied' as const,
          serverRow: toSharedTask(created),
          newVersion: created.version,
        };
      }

      const resolution = resolveConflict({
        baseVersion: change.baseVersion,
        currentVersion: current.version,
        currentUpdatedAt: current.updatedAt,
        clientTs: new Date(change.clientTs),
        incomingOp: change.op,
        currentDeletedAt: current.deletedAt,
      });

      if (!resolution.shouldApply) {
        const row = await tx.task.findFirstOrThrow({
          where: { id: change.entityId },
          include: { taskTags: true },
        });
        return {
          opId: change.opId,
          entityId: change.entityId,
          status: resolution.status,
          serverRow: toSharedTask(row),
          newVersion: row.version,
        };
      }

      if (change.op === 'delete') {
        const row = await tx.task.update({
          where: { id: change.entityId },
          data: { deletedAt: new Date(), version: { increment: 1 } },
          include: { taskTags: true },
        });
        return {
          opId: change.opId,
          entityId: change.entityId,
          status: resolution.status,
          serverRow: toSharedTask(row),
          newVersion: row.version,
        };
      }

      const { tagIds, ...rest } = (change.payload ?? {}) as Record<string, unknown> & {
        tagIds?: string[];
      };
      if (tagIds !== undefined) {
        await tx.taskTag.deleteMany({ where: { taskId: change.entityId } });
        if (tagIds.length > 0) {
          await tx.taskTag.createMany({
            data: tagIds.map((tagId: string) => ({ taskId: change.entityId, tagId })),
          });
        }
      }
      const row = await tx.task.update({
        where: { id: change.entityId },
        data: { ...(rest as Prisma.TaskUncheckedUpdateInput), version: { increment: 1 } },
        include: { taskTags: true },
      });
      return {
        opId: change.opId,
        entityId: change.entityId,
        status: resolution.status,
        serverRow: toSharedTask(row),
        newVersion: row.version,
      };
    });
  }

  /**
   * List and Tag changes follow an identical shape (simple row, no join-table
   * fields on the row itself) — unlike Task, which special-cases `tagIds`.
   * This generic applies that shared shape; `onDelete` carries the one bit of
   * model-specific cleanup each needs (List: orphan its tasks; Tag: drop its
   * TaskTag rows).
   */
  private async applySimpleEntityChange<Row extends { version: number }>(
    userId: string,
    change: ChangeDto,
    delegate: {
      findCurrent: (tx: Prisma.TransactionClient) => Promise<Row | null>;
      create: (tx: Prisma.TransactionClient) => Promise<Row>;
      update: (tx: Prisma.TransactionClient) => Promise<Row>;
      onDelete: (tx: Prisma.TransactionClient) => Promise<Row>;
    },
  ): Promise<ChangeOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const current = await delegate.findCurrent(tx);

      if (!current) {
        if (change.op === 'delete') {
          return { opId: change.opId, entityId: change.entityId, status: 'applied' as const };
        }
        const created = await delegate.create(tx);
        return {
          opId: change.opId,
          entityId: change.entityId,
          status: 'applied' as const,
          serverRow: created,
          newVersion: created.version,
        };
      }

      const currentRow = current as unknown as {
        version: number;
        updatedAt: Date;
        deletedAt: Date | null;
      };
      const resolution = resolveConflict({
        baseVersion: change.baseVersion,
        currentVersion: currentRow.version,
        currentUpdatedAt: currentRow.updatedAt,
        clientTs: new Date(change.clientTs),
        incomingOp: change.op,
        currentDeletedAt: currentRow.deletedAt,
      });

      if (!resolution.shouldApply) {
        return {
          opId: change.opId,
          entityId: change.entityId,
          status: resolution.status,
          serverRow: current,
          newVersion: currentRow.version,
        };
      }

      const row = change.op === 'delete' ? await delegate.onDelete(tx) : await delegate.update(tx);
      return {
        opId: change.opId,
        entityId: change.entityId,
        status: resolution.status,
        serverRow: row,
        newVersion: row.version,
      };
    });
  }

  private applyListChange(userId: string, change: ChangeDto): Promise<ChangeOutcome> {
    return this.applySimpleEntityChange(userId, change, {
      findCurrent: (tx) => tx.list.findFirst({ where: { id: change.entityId, userId } }),
      create: (tx) =>
        tx.list.create({
          data: {
            ...(change.payload as Prisma.ListUncheckedCreateInput),
            id: change.entityId,
            userId,
          },
        }),
      update: (tx) =>
        tx.list.update({
          where: { id: change.entityId },
          data: { ...(change.payload as Prisma.ListUncheckedUpdateInput), version: { increment: 1 } },
        }),
      onDelete: async (tx) => {
        const row = await tx.list.update({
          where: { id: change.entityId },
          data: { deletedAt: new Date(), version: { increment: 1 } },
        });
        // Mirror ListsService.softDelete's orphan-reassignment invariant.
        await tx.task.updateMany({
          where: { listId: change.entityId },
          data: { listId: null, version: { increment: 1 } },
        });
        return row;
      },
    });
  }

  private applyTagChange(userId: string, change: ChangeDto): Promise<ChangeOutcome> {
    return this.applySimpleEntityChange(userId, change, {
      findCurrent: (tx) => tx.tag.findFirst({ where: { id: change.entityId, userId } }),
      create: (tx) =>
        tx.tag.create({
          data: {
            ...(change.payload as Prisma.TagUncheckedCreateInput),
            id: change.entityId,
            userId,
          },
        }),
      update: (tx) =>
        tx.tag.update({
          where: { id: change.entityId },
          data: { ...(change.payload as Prisma.TagUncheckedUpdateInput), version: { increment: 1 } },
        }),
      onDelete: async (tx) => {
        const row = await tx.tag.update({
          where: { id: change.entityId },
          data: { deletedAt: new Date(), version: { increment: 1 } },
        });
        await tx.taskTag.deleteMany({ where: { tagId: change.entityId } });
        return row;
      },
    });
  }

  /**
   * Delta pull: everything (including tombstones) changed since `since`. The
   * cursor returned is the server's own clock at query time, NOT the max
   * `updatedAt` seen — using "now" avoids a race where a row committed between
   * this query running and the response being read would be silently skipped
   * on the next pull (max-seen would advance the cursor past it).
   */
  async pull(userId: string, since: Date | null, limit: number) {
    const where = { userId, ...(since ? { updatedAt: { gt: since } } : {}) };

    const [tasks, lists, tags] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: { taskTags: true },
        orderBy: { updatedAt: 'asc' },
        take: limit + 1,
      }),
      this.prisma.list.findMany({ where, orderBy: { updatedAt: 'asc' }, take: limit + 1 }),
      this.prisma.tag.findMany({ where, orderBy: { updatedAt: 'asc' }, take: limit + 1 }),
    ]);

    const rows = [
      ...tasks.slice(0, limit).map((t) => ({ entity: ENTITY_TABLE.task, row: toSharedTask(t) })),
      ...lists.slice(0, limit).map((l) => ({ entity: ENTITY_TABLE.list, row: l })),
      ...tags.slice(0, limit).map((t) => ({ entity: ENTITY_TABLE.tag, row: t })),
    ];

    const hasMore = tasks.length > limit || lists.length > limit || tags.length > limit;

    return {
      rows,
      cursor: new Date().toISOString(),
      hasMore,
    };
  }
}
