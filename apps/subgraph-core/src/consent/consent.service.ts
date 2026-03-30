import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  and,
  eq,
  createDatabaseConnection,
  schema,
  closeAllPools,
  withTenantContext,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export type ConsentType =
  | 'ESSENTIAL'
  | 'ANALYTICS'
  | 'AI_PROCESSING'
  | 'THIRD_PARTY_LLM'
  | 'MARKETING'
  | 'RESEARCH';

@Injectable()
export class ConsentService implements OnModuleDestroy {
  private readonly logger = new Logger(ConsentService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[ConsentService] onModuleDestroy: DB pools closed');
  }

  async hasConsent(
    userId: string,
    tenantId: string,
    consentType: ConsentType
  ): Promise<boolean> {
    if (consentType === 'ESSENTIAL') return true; // No consent required

    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const rows = await withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .select()
        .from(schema.userConsents)
        .where(
          and(
            eq(schema.userConsents.userId, userId),
            eq(schema.userConsents.consentType, consentType),
            eq(schema.userConsents.given, true)
          )
        );
    });

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
    const ctx: TenantContext = {
      tenantId: params.tenantId,
      userId: params.userId,
      userRole: 'STUDENT',
    };

    await withTenantContext(this.db, ctx, async (tx) => {
      await tx
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
    });

    // Write audit log entry directly (GDPR Art.7 proof of consent)
    await this.writeAuditLog(params.tenantId, params.userId, {
      action: params.given ? 'CONSENT_GIVEN' : 'CONSENT_WITHDRAWN',
      consentType: params.consentType,
      consentVersion: params.consentVersion ?? '1.0',
    });

    this.logger.log(
      {
        userId: params.userId,
        consentType: params.consentType,
        given: params.given,
      },
      'Consent updated'
    );
  }

  async getUserConsents(
    userId: string,
    tenantId: string
  ): Promise<(typeof schema.userConsents.$inferSelect)[]> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    return withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .select()
        .from(schema.userConsents)
        .where(eq(schema.userConsents.userId, userId));
    });
  }

  private async writeAuditLog(
    tenantId: string,
    userId: string,
    entry: {
      action: string;
      consentType: string;
      consentVersion: string;
    }
  ): Promise<void> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    try {
      await withTenantContext(this.db, ctx, async (tx) => {
        await tx.insert(schema.auditLog).values({
          tenantId,
          userId,
          action: entry.action,
          resourceType: 'CONSENT',
          status: 'SUCCESS',
          metadata: {
            consentType: entry.consentType,
            consentVersion: entry.consentVersion,
            gdprArticle: '7',
          },
        });
      });
    } catch (err) {
      // Audit failures must not block consent operations
      this.logger.error({ err, entry }, 'Failed to write consent audit log');
    }
  }
}
