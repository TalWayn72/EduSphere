/**
 * anonymize.helper.ts — F-20: GDPR ANONYMIZE mode implementation.
 *
 * One-way SHA-256 hash for PII fields (irreversible per GDPR Art.17).
 * Cascades across users table + creates audit log entries.
 */
import { Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { lt, eq } from 'drizzle-orm';
import { db, schema } from '@edusphere/db';

const logger = new Logger('AnonymizeHelper');

/**
 * SHA-256 hash for PII anonymization (irreversible, truncated to 32 chars).
 */
export function hashPii(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

/**
 * Anonymize users whose records are past the retention cutoff.
 * Replaces PII (email, display_name, first/last name) with hashed values.
 * Creates audit_log entries for GDPR compliance evidence.
 */
export async function anonymizeUsers(
  entityType: string,
  cutoff: Date
): Promise<{ deletedCount: number; mode: string }> {
  if (entityType !== 'USER_PROGRESS' && entityType !== 'ANNOTATIONS') {
    logger.warn(
      { entityType },
      'ANONYMIZE not applicable for this entity — skipping'
    );
    return { deletedCount: 0, mode: 'ANONYMIZE_SKIPPED' };
  }

  const staleRows = await db
    .select({ userId: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .where(lt(schema.users.updated_at, cutoff))
    .limit(1000);

  let anonymizedCount = 0;
  for (const row of staleRows) {
    const hashedEmail = hashPii(row.email);
    const hashedName = hashPii(row.userId);

    await db
      .update(schema.users)
      .set({
        email: hashedEmail,
        display_name: hashedName,
        first_name: 'ANONYMIZED',
        last_name: 'ANONYMIZED',
        avatar_url: null,
      })
      .where(eq(schema.users.id, row.userId));

    await db.insert(schema.auditLog).values({
      tenantId: '00000000-0000-0000-0000-000000000000',
      userId: row.userId,
      action: 'GDPR_ANONYMIZE',
      resourceType: 'USER',
      resourceId: row.userId,
      metadata: {
        gdprArticle: '17',
        entityType,
        cutoffDate: cutoff.toISOString(),
      },
      status: 'SUCCESS',
    });

    anonymizedCount++;
  }

  logger.log(
    { entityType, anonymizedCount, cutoff: cutoff.toISOString() },
    '[AnonymizeHelper] ANONYMIZE completed'
  );

  return { deletedCount: anonymizedCount, mode: 'ANONYMIZE' };
}
