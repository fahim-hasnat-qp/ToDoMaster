import { Global, Module } from '@nestjs/common';
import { MailerService } from './mailer.service';

/** Global so AuthService (and future features — password reset, digests) can inject it directly. */
@Global()
@Module({
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
