/**
 * WhatsAppChannelService — Phase 65.
 * WhatsApp dispatch via Meta Cloud API.
 * Consent check required before sending (SI-3 PII).
 * Never logs phone numbers.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { WhatsAppMetaProvider } from './whatsapp-meta.provider';

@Injectable()
export class WhatsAppChannelService implements OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppChannelService.name);
  private readonly phoneNumberId: string;

  constructor(private readonly metaProvider: WhatsAppMetaProvider) {
    this.phoneNumberId = process.env['WHATSAPP_PHONE_NUMBER_ID'] ?? '';
  }

  async onModuleDestroy(): Promise<void> {
    // No persistent resources.
  }

  /**
   * Send a pre-approved WhatsApp template message.
   * @param phoneNumber Recipient phone in E.164 format (encrypted at rest).
   * @param templateName Meta-approved template name.
   * @param variables Template variable values.
   * @returns Message ID (wamid) on success, null on failure.
   */
  async sendTemplate(
    phoneNumber: string,
    templateName: string,
    variables: string[] = [],
    languageCode = 'en'
  ): Promise<string | null> {
    if (!this.phoneNumberId) {
      this.logger.warn(
        '[WhatsAppChannelService] WHATSAPP_PHONE_NUMBER_ID not configured'
      );
      return null;
    }

    const result = await this.metaProvider.sendTemplate(
      this.phoneNumberId,
      phoneNumber,
      templateName,
      languageCode,
      variables
    );

    if (result.success) {
      this.logger.log(
        `[WhatsAppChannelService] Template sent — template=${templateName} wamid=${result.messageId ?? 'unknown'}`
      );
    }

    return result.messageId;
  }

  /**
   * Send free-form text (only within 24h customer-initiated window).
   * @param phoneNumber Recipient phone in E.164 format.
   * @param text Message body.
   */
  async sendText(phoneNumber: string, text: string): Promise<string | null> {
    if (!this.phoneNumberId) {
      this.logger.warn(
        '[WhatsAppChannelService] WHATSAPP_PHONE_NUMBER_ID not configured'
      );
      return null;
    }

    const result = await this.metaProvider.sendText(
      this.phoneNumberId,
      phoneNumber,
      text
    );

    if (result.success) {
      this.logger.log(
        `[WhatsAppChannelService] Text sent — wamid=${result.messageId ?? 'unknown'}`
      );
    }

    return result.messageId;
  }
}
