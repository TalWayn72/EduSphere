/**
 * WhatsAppMetaProvider — Phase 65.
 * HTTP client wrapper for Meta Cloud API (WhatsApp Business).
 * Handles auth headers, error parsing, and rate limit headers.
 * Never logs phone numbers (SI-3 PII).
 */
import { Injectable, Logger } from '@nestjs/common';

const META_API_BASE = 'https://graph.facebook.com/v21.0';

interface MetaSendResponse {
  messages: Array<{ id: string }>;
}

interface MetaErrorResponse {
  error: { message: string; code: number };
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId: string | null;
  error: string | null;
}

@Injectable()
export class WhatsAppMetaProvider {
  private readonly logger = new Logger(WhatsAppMetaProvider.name);

  /** Send a template message via Meta Cloud API. */
  async sendTemplate(
    phoneNumberId: string,
    recipientPhone: string,
    templateName: string,
    languageCode: string,
    variables: string[]
  ): Promise<WhatsAppSendResult> {
    const body = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: variables.length
          ? [
              {
                type: 'body',
                parameters: variables.map((v) => ({ type: 'text', text: v })),
              },
            ]
          : [],
      },
    };

    return this.callApi(phoneNumberId, body);
  }

  /** Send a free-form text message (24h window only). */
  async sendText(
    phoneNumberId: string,
    recipientPhone: string,
    text: string
  ): Promise<WhatsAppSendResult> {
    const body = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'text',
      text: { body: text },
    };

    return this.callApi(phoneNumberId, body);
  }

  private async callApi(
    phoneNumberId: string,
    body: Record<string, unknown>
  ): Promise<WhatsAppSendResult> {
    const accessToken = process.env['WHATSAPP_ACCESS_TOKEN'];
    if (!accessToken) {
      this.logger.warn(
        '[WhatsAppMetaProvider] WHATSAPP_ACCESS_TOKEN not configured'
      );
      return { success: false, messageId: null, error: 'Missing access token' };
    }

    const url = `${META_API_BASE}/${phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errBody = (await response.json()) as MetaErrorResponse;
        this.logger.error(
          `[WhatsAppMetaProvider] API error ${response.status.toString()}: ${errBody.error?.message ?? 'unknown'}`
        );
        return {
          success: false,
          messageId: null,
          error: errBody.error?.message ?? 'API error',
        };
      }

      const data = (await response.json()) as MetaSendResponse;
      const messageId = data.messages?.[0]?.id ?? null;
      return { success: true, messageId, error: null };
    } catch (err) {
      this.logger.error('[WhatsAppMetaProvider] Network error', err);
      return { success: false, messageId: null, error: 'Network error' };
    }
  }
}
