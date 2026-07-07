import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateListDto, UpdateListDto } from './dto/list.dto';

@Injectable()
export class ListsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.list.findMany({
      where: { userId, deletedAt: null },
      orderBy: { order: 'asc' },
    });
  }

  async create(userId: string, dto: CreateListDto) {
    return this.prisma.list.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateListDto) {
    await this.assertOwnership(userId, id);
    return this.prisma.list.update({
      where: { id },
      data: { ...dto, version: { increment: 1 } },
    });
  }

  /**
   * Soft-deletes the list and reassigns its tasks to "no list" (listId: null)
   * in the same transaction — mirrors the client's LocalListRepository behavior
   * (see docs/features/002-lists-and-tags.md) so the invariant holds identically
   * offline and online: a deleted list never orphans references to it.
   */
  async softDelete(userId: string, id: string): Promise<void> {
    const list = await this.assertOwnership(userId, id);
    if (list.isDefault) {
      throw new BadRequestException('Default lists cannot be deleted');
    }
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.list.update({
        where: { id },
        data: { deletedAt: now, version: { increment: 1 } },
      }),
      this.prisma.task.updateMany({
        where: { listId: id },
        data: { listId: null, version: { increment: 1 } },
      }),
    ]);
  }

  private async assertOwnership(userId: string, id: string) {
    const row = await this.prisma.list.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('List not found');
    return row;
  }
}
