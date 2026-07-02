import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// No real SMTP credentials exist in this dev environment (.env.example
// ships blank SMTP_* values), so this degrades gracefully the same way
// PaymentsService does for Razorpay: when unconfigured, log the message
// instead of throwing, so core flows (registration, OTP delivery) still
// work end-to-end during development and testing.
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.config.get<string>('SMTP_PORT') ?? '587'),
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
    }
  }

  async send(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `SMTP not configured — logging email instead of sending.\n` +
          `To: ${to}\nSubject: ${subject}\n${text}`,
      );
      return;
    }
    const from =
      this.config.get<string>('SMTP_FROM') ?? '"AQD" <no-reply@aqd.app>';
    await this.transporter.sendMail({ from, to, subject, text });
  }
}
