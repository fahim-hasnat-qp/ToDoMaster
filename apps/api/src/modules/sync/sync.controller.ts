import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload';
import { SyncService } from './sync.service';
import { PullQueryDto, PushRequestDto } from './sync.dto';

@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('push')
  push(@CurrentUser() user: JwtPayload, @Body() dto: PushRequestDto) {
    return this.sync.push(user.sub, dto.changes);
  }

  @Get('pull')
  pull(@CurrentUser() user: JwtPayload, @Query() query: PullQueryDto) {
    const since = query.since ? new Date(query.since) : null;
    return this.sync.pull(user.sub, since, query.limit ?? 500);
  }
}
