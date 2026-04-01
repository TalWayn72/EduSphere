/**
 * EmailSmtpProvider — Phase 65.
 * Nodemailer SMTP fallback for air-gapped deployments.
 * Reads SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS from env.
 */
import { Injectable, Logger } from '@nestjs/common';
import type { EmailProvider } from './email-channel.service';

interface NodemailerTransporter {
  sendMail: (opts: {
    from: string;
    to: string;
    subject: string;
    html: string;
  }) => Promise<{ messageId: string }>;
  close: () => void;
}

interface NodemailerModule {
  createTransport: (opts: {
    host: string;
    port: number;
    secure: boolean;
    auth?: { user: string; pass: string };
  }) => NodemailerTransporter;
}

@Injectable()
export class EmailSmtpProvider implements EmailProvider {
  private readonly logger = new Logger(EmailSmtpProvider.name);
  private transporter: NodemailerTransporter | null = null;

  /** Lazy-init the SMTP transporter (optional peer dependency). */
  private getTransporter(): NodemailerTransporter {
    if (this.transporter) return this.transporter;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodemailer = require('nodemailer') as NodemailerModule;

      const host = process.env['SMTP_HOST'] ?? 'localhost';
      const port = parseInt(process.env['SMTP_PORT'] ?? '587', 10);
      const user = process.env['SMTP_USER'];
      const pass = process.env['SMTP_PASS'];

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });

      return this.transporter;
    } catch {
      throw new Error(
        'nodemailer package not installed — run: pnpm add nodemailer'
      );
    }
  }

  async send(
    to: string,
    subject: string,
    html: string
  ): Promise<string | null> {
    const from =
      process.env['EMAIL_FROM'] ?? 'EduSphere <noreply@edusphere.dev>';
    const transporter = this.getTransporter();

    try {
      const result = await transporter.sendMail({ from, to, subject, html });
      return result.messageId;
    } catch (err) {
      this.logger.error(
        `[EmailSmtpProvider] SMTP send failed — subject="${subject}"`,
        err
      );
      return null;
    }
  }
}
