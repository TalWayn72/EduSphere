import { Injectable, Logger } from '@nestjs/common';
import { and, eq, createDatabaseConnection, schema } from '@edusphere/db';
import type { Database } from '@edusphere/db';

export type ConsentType =
  | 'ESSENTIAL'
  | 'ANALYTICS'
  | 'AI_PROCESSING'
  | 'THIRD_PARTY_LLM'
  | 'MARKETING'
  | 'RESEARCH';

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    if (consentType === 'ESSENTIAL') return true; // No consent required

    const rows = await this.db
      .select()
      .from(schema.userConsents)
      .where(
        and(
          eq(schema.userConsents.userId, userId),
          eq(schema.userConsents.consentType, consentType),
          eq(schema.userConsents.given, true),
        ),
      );

    return rows.length > 0;
  }

  async updateConsent(params: {
    tenantId: string;
    userId: string;
    consentType: ConsentType;
    given: boolean;
    ipAddress?: string;
    userAgent?: string;
    consentVersion?: string;
    method?: string;
  }): Promise<void> {
    const now = new Date();

    await this.db
      .insert(schema.userConsents)
      .values({
        tenantId: params.tenantId,
        userId: params.userId,
        consentType: params.consentType,
        given: params.given,
        givenAt: params.given ? now : null,
        withdrawnAt: params.given ? null : now,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        consentVersion: params.consentVersion ?? '1.0',
        method: params.method ?? 'API',
      })
      .onConflictDoUpdate({
        target: [schema.userConsents.userId, schema.userConsents.consentType],
        set: {
          given: params.given,
          givenAt: params.given ? now : null,
          withdrawnAt: params.given ? null : now,
          updatedAt: now,
        },
      });

    // Write audit log entry directly (GDPR Art.7 proof of consent)
    await this.writeAuditLog({
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.given ? 'CONSENT_GIVEN' : 'CONSENT_WITHDRAWN',
      consentType: params.consentType,
      consentVersion: params.consentVersion ?? '1.0',
    });

    this.logger.log(
      { userId: params.userId, consentType: params.consentType, given: params.given },
      'Consent updated',
    );
  }

  async getUserConsents(
    userId: string,
  ): Promise<typeof schema.userConsents.$inferSelect[]> {
    return this.db
      .select()
      .from(schema.userConsents)
      .where(eq(schema.userConsents.userId, userId));
  }

  private async writeAuditLog(entry: {
    tenantId: string;
    userId: string;
    action: string;
    consentType: string;
    consentVersion: string;
  }): Promise<void> {
    try {
      await this.db.insert(schema.auditLog).values({
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        resourceType: 'CONSENT',
        status: 'SUCCESS',
        metadata: {
          consentType: entry.consentType,
          consentVersion: entry.consentVersion,
          gdprArticle: '7',
        },
      });
    } catch (err) {
      // Audit failures must not block consent operations
      this.logger.error({ err, entry }, 'Failed to write consent audit log');
    }
  }
}
