import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MailerModule } from './modules/mailer/mailer.module';
import { AuthModule } from './modules/auth/auth.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ListsModule } from './modules/lists/lists.module';
import { TagsModule } from './modules/tags/tags.module';
import { SyncModule } from './modules/sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailerModule,
    AuthModule,
    TasksModule,
    ListsModule,
    TagsModule,
    SyncModule,
  ],
})
export class AppModule {}
