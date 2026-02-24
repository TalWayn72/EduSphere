import { pgTable, text, uuid, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId, timestamps } from './_shared';
import { tenants } from './tenants';
import { users } from './core';
import { courses } from './content';

export const certificates = pgTable(
  'certificates',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    course_id: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    issued_at: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    verification_code: uuid('verification_code').notNull().unique().defaultRandom(),
    pdf_url: text('pdf_url'),
    metadata: jsonb('metadata').notNull().default({}),
    ...timestamps,
  },
  (table) => ({
    tenantIdx: index('idx_certificates_tenant').on(table.tenant_id),
    tenantUserIdx: index('idx_certificates_tenant_user').on(table.tenant_id, table.user_id),
    verificationCodeIdx: index('idx_certificates_verification_code').on(table.verification_code),
  }),
);

export const certificatesRLS = sql`
CREATE POLICY certificates_tenant_isolation ON certificates
  USING (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND (
      user_id::text = current_setting('app.current_user_id', TRUE)
      OR current_setting('app.current_user_role', TRUE) IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
  );

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
`;

export type Certificate = typeof certificates.$inferSelect;
export type NewCertificate = typeof certificates.$inferInsert;
