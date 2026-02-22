import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { connect, StringCodec } from 'nats';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext, ContentTranslation } from '@edusphere/db';

const sc = StringCodec();

@Injectable()
export class TranslationService implements OnModuleDestroy {
  private readonly logger = new Logger(TranslationService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async findTranslation(
    contentItemId: string,
    locale: string,
    ctx: TenantContext,
  ): Promise<ContentTranslation | null> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const [row] = await tx
        .select()
        .from(schema.contentTranslations)
        .where(
          and(
            eq(schema.contentTranslations.content_item_id, contentItemId),
            eq(schema.contentTranslations.locale, locale),
          ),
        )
        .limit(1);
      return row ?? null;
    });
  }

  async requestTranslation(
    contentItemId: string,
    targetLocale: string,
    ctx: TenantContext,
  ): Promise<ContentTranslation> {
    return withTenantContext(this.db, ctx, async (tx) => {
      // Return existing COMPLETED or PROCESSING row without re-queuing
      const [existing] = await tx
        .select()
        .from(schema.contentTranslations)
        .where(
          and(
            eq(schema.contentTranslations.content_item_id, contentItemId),
            eq(schema.contentTranslations.locale, targetLocale),
          ),
        )
        .limit(1);

      if (
        existing &&
        (existing.translation_status === 'COMPLETED' ||
          existing.translation_status === 'PROCESSING')
      ) {
        this.logger.debug(
          `Translation already ${existing.translation_status}: item=${contentItemId} locale=${targetLocale}`,
        );
        return existing;
      }

      // Upsert with PROCESSING status
      const [row] = await tx
        .insert(schema.contentTranslations)
        .values({
          content_item_id: contentItemId,
          locale: targetLocale,
          translation_status: 'PROCESSING',
          model_used: process.env.TRANSLATION_MODEL ?? 'ollama/llama3.2',
        })
        .onConflictDoUpdate({
          target: [
            schema.contentTranslations.content_item_id,
            schema.contentTranslations.locale,
          ],
          set: { translation_status: 'PROCESSING' },
        })
        .returning();

      if (!row) throw new Error('Failed to upsert translation record');

      this.logger.log(
        `Translation requested: item=${contentItemId} locale=${targetLocale} id=${row.id}`,
      );

      await this.publishTranslationRequested({ contentItemId, targetLocale, translationId: row.id });

      return row;
    });
  }

  private async publishTranslationRequested(payload: {
    contentItemId: string;
    targetLocale: string;
    translationId: string;
  }): Promise<void> {
    const natsUrl = process.env.NATS_URL ?? 'nats://localhost:4222';
    let nc;
    try {
      nc = await connect({ servers: natsUrl });
      nc.publish('content.translate.requested', sc.encode(JSON.stringify(payload)));
      await nc.flush();
      this.logger.debug(`Published content.translate.requested: id=${payload.translationId}`);
    } catch (err) {
      this.logger.warn('Failed to publish content.translate.requested — NATS unavailable', err);
    } finally {
      if (nc) await nc.close().catch(() => undefined);
    }
  }
}
