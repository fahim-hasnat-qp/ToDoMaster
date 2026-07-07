import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toSharedTask } from './tasks.mapper';
import type { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

const INCLUDE_TAGS = { taskTags: true } satisfies Prisma.TaskInclude;

/** `undefined` = leave the column untouched (update only); `null` = clear it. */
function toRecurrenceJson(
  recurrence: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (recurrence === undefined) return undefined;
  if (recurrence === null) return Prisma.JsonNull;
  return recurrence as Prisma.InputJsonValue;
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const rows = await this.prisma.task.findMany({
      where: { userId, deletedAt: null },
      include: INCLUDE_TAGS,
      orderBy: { order: 'asc' },
    });
    return rows.map(toSharedTask);
  }

  async findOne(userId: string, id: string) {
    const row = await this.prisma.task.findFirst({
      where: { id, userId, deletedAt: null },
      include: INCLUDE_TAGS,
    });
    if (!row) throw new NotFoundException('Task not found');
    return toSharedTask(row);
  }

  async create(userId: string, dto: CreateTaskDto) {
    const { tagIds, recurrence, checklist, reminders, ...rest } = dto;
    const row = await this.prisma.task.create({
      data: {
        ...rest,
        userId,
        recurrence: toRecurrenceJson(recurrence) ?? Prisma.JsonNull,
        checklist: (checklist ?? []) as Prisma.InputJsonValue,
        reminders: (reminders ?? []) as Prisma.InputJsonValue,
        taskTags: tagIds?.length
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: INCLUDE_TAGS,
    });
    return toSharedTask(row);
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    await this.assertOwnership(userId, id);
    const { tagIds, recurrence, checklist, reminders, ...rest } = dto;

    const row = await this.prisma.$transaction(async (tx) => {
      if (tagIds !== undefined) {
        await tx.taskTag.deleteMany({ where: { taskId: id } });
        if (tagIds.length > 0) {
          await tx.taskTag.createMany({
            data: tagIds.map((tagId) => ({ taskId: id, tagId })),
          });
        }
      }
      return tx.task.update({
        where: { id },
        data: {
          ...rest,
          recurrence: toRecurrenceJson(recurrence),
          checklist: checklist as Prisma.InputJsonValue | undefined,
          reminders: reminders as Prisma.InputJsonValue | undefined,
          version: { increment: 1 },
        },
        include: INCLUDE_TAGS,
      });
    });

    return toSharedTask(row);
  }

  async softDelete(userId: string, id: string): Promise<void> {
    await this.assertOwnership(userId, id);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.task.update({
        where: { id },
        data: { deletedAt: now, version: { increment: 1 } },
      }),
      // Subtasks also need their version bumped so a subsequent sync push
      // against them carries a baseVersion the server will still recognize.
      this.prisma.task.updateMany({
        where: { parentTaskId: id },
        data: { deletedAt: now, version: { increment: 1 } },
      }),
    ]);
  }

  private async assertOwnership(userId: string, id: string): Promise<void> {
    const row = await this.prisma.task.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Task not found');
  }
}
