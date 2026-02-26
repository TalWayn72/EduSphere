/**
 * LTI 1.3 Provider tables — F-018
 * lti_platforms: registered LMS platforms (Canvas, Moodle, Blackboard)
 * lti_launches: audit log of LTI launches
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId, timestamps } from './_shared';

export const ltiPlatforms = pgTable('lti_platforms', {
  id: pk(),
  tenant_id: tenantId(),
  platform_name: text('platform_name').notNull(),
  platform_url: text('platform_url').notNull(),
  client_id: text('client_id').notNull(),
  auth_login_url: text('auth_login_url').notNull(),
  auth_token_url: text('auth_token_url').notNull(),
  key_set_url: text('key_set_url').notNull(),
  deployment_id: text('deployment_id').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  ...timestamps,
});

export const ltiLaunches = pgTable(
  'lti_launches',
  {
    id: pk(),
    tenant_id: tenantId(),
    platform_id: uuid('platform_id')
      .notNull()
      .references(() => ltiPlatforms.id, { onDelete: 'cascade' }),
    user_id: uuid('user_id').notNull(),
    course_id: uuid('course_id'),
    launch_nonce: text('launch_nonce').notNull(),
    launch_data: jsonb('launch_data').notNull(),
    launched_at: timestamps.created_at,
  },
  (t) => [unique('lti_launches_nonce_unique').on(t.launch_nonce)]
);

export const ltiPlatformsRLS = sql`
ALTER TABLE lti_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY lti_platforms_tenant_isolation ON lti_platforms
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));
`;

export const ltiLaunchesRLS = sql`
ALTER TABLE lti_launches ENABLE ROW LEVEL SECURITY;

CREATE POLICY lti_launches_tenant_isolation ON lti_launches
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));
`;

export const ltiIndexes = sql`
CREATE INDEX idx_lti_platforms_tenant ON lti_platforms(tenant_id);
CREATE INDEX idx_lti_platforms_iss ON lti_platforms(platform_url);
CREATE INDEX idx_lti_launches_platform ON lti_launches(platform_id);
CREATE INDEX idx_lti_launches_tenant ON lti_launches(tenant_id);
CREATE INDEX idx_lti_launches_user ON lti_launches(user_id);
`;

export type LtiPlatform = typeof ltiPlatforms.$inferSelect;
export type NewLtiPlatform = typeof ltiPlatforms.$inferInsert;
export type LtiLaunch = typeof ltiLaunches.$inferSelect;
export type NewLtiLaunch = typeof ltiLaunches.$inferInsert;
