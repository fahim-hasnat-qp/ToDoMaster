import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateTagDto, UpdateTagDto } from './dto/tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.tag.findMany({ where: { userId, deletedAt: null } });
  }

  create(userId: string, dto: CreateTagDto) {
    return this.prisma.tag.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateTagDto) {
    await this.assertOwnership(userId, id);
    return this.prisma.tag.update({
      where: { id },
      data: { ...dto, version: { increment: 1 } },
    });
  }

  /**
   * Soft-deletes the tag and removes its TaskTag join rows in the same
   * transaction — the relational equivalent of the client's LocalTagRepository
   * stripping the tag id out of every task's `tagIds` array.
   */
  async softDelete(userId: string, id: string): Promise<void> {
    await this.assertOwnership(userId, id);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.tag.update({
        where: { id },
        data: { deletedAt: now, version: { increment: 1 } },
      }),
      this.prisma.taskTag.deleteMany({ where: { tagId: id } }),
    ]);
  }

  private async assertOwnership(userId: string, id: string): Promise<void> {
    const row = await this.prisma.tag.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Tag not found');
  }
}
