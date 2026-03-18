/**
 * EmailChannelService — Phase 65.
 * Central email dispatch that delegates to the active provider (Resend or SMTP).
 * Never logs email content (SI-3 PII compliance).
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EmailResendProvider } from './email-resend.provider';
import { EmailSmtpProvider } from './email-smtp.provider';

/** Common interface for email providers. */
export interface EmailProvider {
  send(to: string, subject: string, html: string): Promise<string | null>;
}

interface EmailOptions {
  replyTo?: string;
  cc?: string[];
}

@Injectable()
export class EmailChannelService implements OnModuleDestroy {
  private readonly logger = new Logger(EmailChannelService.name);
  private readonly provider: EmailProvider;

  constructor() {
    // Select provider based on environment configuration.
    const useResend = !!process.env['RESEND_API_KEY'];
    this.provider = useResend ? new EmailResendProvider() : new EmailSmtpProvider();
    this.logger.log(
      `[EmailChannelService] Using provider: ${useResend ? 'Resend' : 'SMTP'}`
    );
  }

  async onModuleDestroy(): Promise<void> {
    // No persistent resources to clean up.
  }

  /**
   * Send an email via the active provider.
   * @returns External message ID on success, null on failure.
   */
  async send(
    to: string,
    subject: string,
    html: string,
    _options?: EmailOptions
  ): Promise<string | null> {
    try {
      const messageId = await Promise.race([
        this.provider.send(to, subject, html),
        this.timeout(15_000),
      ]);

      this.logger.log(
        `[EmailChannelService] Email sent — to=<redacted> subject="${subject}" messageId=${messageId ?? 'unknown'}`
      );
      return messageId;
    } catch (err) {
      this.logger.error(
        `[EmailChannelService] Email send failed — subject="${subject}"`,
        err
      );
      return null;
    }
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Email send timed out after ${ms.toString()}ms`)),
        ms
      )
    );
  }
}
