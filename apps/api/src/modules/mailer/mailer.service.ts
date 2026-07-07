import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Thin wrapper over nodemailer + Gmail SMTP.
 *
 * DEV FALLBACK: if SMTP_USER isn't set, emails are logged to the console
 * instead of sent — so registration/verification flows are fully testable
 * without a real Gmail account. Set SMTP_USER + SMTP_APP_PASSWORD (a Gmail
 * "App Password", not the account password — see .env.example) to send for real.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>('SMTP_USER', '');
    this.from = this.config.get<string>('SMTP_FROM', 'ToDoMaster <no-reply@todomaster.app>');

    if (!user) {
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.config.get<number>('SMTP_PORT', 465),
      secure: true,
      auth: { user, pass: this.config.get<string>('SMTP_APP_PASSWORD', '') },
    });
  }

  async send(input: SendEmailInput): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `SMTP not configured — logging email instead of sending.\n` +
          `To: ${input.to}\nSubject: ${input.subject}\n${input.html}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
  }
}
