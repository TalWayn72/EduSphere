/**
 * EmailResendProvider — Phase 65.
 * Wraps the Resend SDK for transactional email delivery.
 * Reads RESEND_API_KEY and EMAIL_FROM from process.env.
 */
import { Injectable, Logger } from '@nestjs/common';
import type { EmailProvider } from './email-channel.service';

interface ResendSendResponse {
  id: string;
}

interface ResendClient {
  emails: {
    send: (params: {
      from: string;
      to: string;
      subject: string;
      html: string;
    }) => Promise<{
      data: ResendSendResponse | null;
      error: { message: string } | null;
    }>;
  };
}

@Injectable()
export class EmailResendProvider implements EmailProvider {
  private readonly logger = new Logger(EmailResendProvider.name);
  private client: ResendClient | null = null;

  /** Lazy-init the Resend client (optional peer dependency). */
  private getClient(): ResendClient {
    if (this.client) return this.client;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Resend } = require('resend') as {
        Resend: new (key: string) => ResendClient;
      };
      this.client = new Resend(process.env['RESEND_API_KEY'] ?? '');
      return this.client;
    } catch {
      throw new Error('resend package not installed — run: pnpm add resend');
    }
  }

  async send(
    to: string,
    subject: string,
    html: string
  ): Promise<string | null> {
    const from =
      process.env['EMAIL_FROM'] ?? 'EduSphere <noreply@edusphere.dev>';
    const client = this.getClient();

    const { data, error } = await client.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      this.logger.error(
        `[EmailResendProvider] Resend API error: ${error.message}`
      );
      return null;
    }

    return data?.id ?? null;
  }
}
