import {
  pgTable,
  text,
  uuid,
  numeric,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { pk, timestamps } from './_shared';
import { contentItems } from './contentItems';

export const translationStatuses = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
] as const;
export type TranslationStatus = (typeof translationStatuses)[number];

export const contentTranslations = pgTable(
  'content_translations',
  {
    id: pk(),
    content_item_id: uuid('content_item_id')
      .notNull()
      .references(() => contentItems.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    translated_title: text('translated_title'),
    translated_description: text('translated_description'),
    translated_summary: text('translated_summary'),
    translated_transcript: text('translated_transcript'),
    quality_score: numeric('quality_score', { precision: 3, scale: 2 }),
    model_used: text('model_used').notNull().default('ollama/llama3.2'),
    translation_status: text('translation_status', {
      enum: translationStatuses,
    })
      .notNull()
      .default('PENDING'),
    ...timestamps,
  },
  (t) => ({
    item_locale_unique: unique('ct_item_locale_uq').on(
      t.content_item_id,
      t.locale
    ),
    locale_idx: index('ct_locale_idx').on(t.locale),
    status_idx: index('ct_status_idx').on(t.translation_status),
  })
);

export type ContentTranslation = typeof contentTranslations.$inferSelect;
export type NewContentTranslation = typeof contentTranslations.$inferInsert;
