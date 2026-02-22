import { Injectable, Logger } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { and, eq } from 'drizzle-orm';
import { db } from '@edusphere/db';

/**
 * SI-10: LLM Consent Guard — GDPR Art.6+7 + EU AI Act transparency.
 * Every external LLM call (OpenAI/Anthropic) requires explicit THIRD_PARTY_LLM consent.
 * Ollama (local) calls only require AI_PROCESSING consent.
 */
@Injectable()
export class LlmConsentGuard {
  private readonly logger = new Logger(LlmConsentGuard.name);

  /**
   * Check if user has consented to the required LLM processing.
   * Throws GraphQLError with CONSENT_REQUIRED code if not consented.
   */
  async assertConsent(
    userId: string,
    isExternalLLM: boolean,
  ): Promise<void> {
    const { userConsents } = await import('@edusphere/db/schema');

    const requiredType = isExternalLLM ? 'THIRD_PARTY_LLM' : 'AI_PROCESSING';

    const rows = await db
      .select()
      .from(userConsents)
      .where(
        and(
          eq(userConsents.userId, userId),
          eq(userConsents.consentType, requiredType),
          eq(userConsents.given, true),
        ),
      );

    if (rows.length === 0) {
      this.logger.warn({ userId, requiredType }, 'LLM call blocked — consent not given');
      throw new GraphQLError(
        isExternalLLM
          ? 'External AI service requires your explicit consent. Please update your privacy settings to enable AI assistance.'
          : 'AI processing requires your consent. Please update your privacy settings.',
        {
          extensions: {
            code: 'CONSENT_REQUIRED',
            consentType: requiredType,
            settingsUrl: '/settings/privacy',
          },
        },
      );
    }
  }

  /**
   * Check consent without throwing — returns boolean.
   */
  async hasConsent(userId: string, isExternalLLM: boolean): Promise<boolean> {
    try {
      await this.assertConsent(userId, isExternalLLM);
      return true;
    } catch {
      return false;
    }
  }
}
