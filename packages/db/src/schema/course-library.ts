import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const libraryTopicEnum = pgEnum('library_topic', [
  'GDPR',
  'SOC2',
  'HIPAA',
  'AML',
  'DEI',
  'CYBERSECURITY',
  'HARASSMENT_PREVENTION',
]);

export const libraryLicenseEnum = pgEnum('library_license', ['FREE', 'PAID']);

// Master library catalog — platform-level, not tenant-specific (no RLS)
export const libraryCourses = pgTable('library_courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  topic: libraryTopicEnum('topic').notNull(),
  scormPackageUrl: text('scorm_package_url').notNull(),
  licenseType: libraryLicenseEnum('license_type').notNull().default('FREE'),
  priceCents: integer('price_cents').notNull().default(0),
  durationMinutes: integer('duration_minutes').notNull().default(60),
  lastUpdated: timestamp('last_updated').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
});

// Which tenants have activated which courses — tenant-scoped with RLS
export const tenantLibraryActivations = pgTable(
  'tenant_library_activations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    libraryCourseId: uuid('library_course_id').notNull(),
    activatedAt: timestamp('activated_at').notNull().defaultNow(),
    activatedBy: uuid('activated_by').notNull(),
    // The resulting course inserted into tenant's catalog
    courseId: uuid('course_id'),
  },
  (t) => ({
    tenantCourseUnique: uniqueIndex('tenant_library_activations_unique').on(
      t.tenantId,
      t.libraryCourseId
    ),
    tenantIdx: index('tenant_library_activations_tenant_idx').on(t.tenantId),
  })
);

export type LibraryCourse = typeof libraryCourses.$inferSelect;
export type NewLibraryCourse = typeof libraryCourses.$inferInsert;
export type TenantLibraryActivation =
  typeof tenantLibraryActivations.$inferSelect;
export type NewTenantLibraryActivation =
  typeof tenantLibraryActivations.$inferInsert;
