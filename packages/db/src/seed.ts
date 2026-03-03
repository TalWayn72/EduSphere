import { Pool } from 'pg';
import { sql, type SQL } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { initializeGraphOntology } from './graph';
import { seedNaharShalomCourse } from './seed/nahar-shalom-course.js';
import { seedNaharShalomSource } from './seed/nahar-shalom-source.js';

const { tenants, users, courses, modules, media_assets } = schema;

async function seed() {
  console.log('🌱 Seeding database...');

  // Ensure DATABASE_URL is set so helper modules (createDatabaseConnection) pick it up
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    'postgresql://edusphere:edusphere_dev_password@localhost:5432/edusphere';

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const db = drizzle(pool, { schema });

  try {
    // Create default tenant
    const [defaultTenant] = await db
      .insert(tenants)
      .values({
        id: '00000000-0000-0000-0000-000000000000',
        name: 'EduSphere Demo',
        slug: 'demo',
        plan: 'PROFESSIONAL',
        settings: { features: { ai: true, collaboration: true } },
      })
      .onConflictDoNothing()
      .returning();

    console.log('✅ Created default tenant:', defaultTenant?.name);

    // Create tenant 1
    const [tenant1] = await db
      .insert(tenants)
      .values({
        id: '11111111-1111-1111-1111-111111111111',
        name: 'University A',
        slug: 'university-a',
        plan: 'ENTERPRISE',
      })
      .onConflictDoNothing()
      .returning();

    console.log('✅ Created tenant 1:', tenant1?.name);

    // Ensure the dev super-admin user always has the hardcoded UUID.
    // A previous run or Keycloak bootstrap may have created the same email
    // with a random UUID, causing onConflictDoNothing to silently skip the
    // insert — leaving the expected ID missing. We delete any conflicting row
    // first (it has no FK dependents on a fresh seed).
    await db.delete(users).where(
      sql`email = 'super.admin@edusphere.dev' AND tenant_id = '00000000-0000-0000-0000-000000000000'::uuid AND id != '00000000-0000-0000-0000-000000000001'::uuid` as SQL
    );

    // Create users
    await db
      .insert(users)
      .values([
        // ── Dev/CI super-admin (Keycloak ID 00000000-...0001) ───────────────
        {
          id: '00000000-0000-0000-0000-000000000001',
          tenant_id:
            defaultTenant?.id || '00000000-0000-0000-0000-000000000000',
          email: 'super.admin@edusphere.dev',
          display_name: 'Super Admin',
          role: 'SUPER_ADMIN',
        },
        // ── Keycloak demo users — IDs MUST match Keycloak realm user IDs ────
        // Keycloak sub == DB users.id so `me { ... }` resolves after login.
        {
          id: '00000000-0000-0000-0000-000000000002',
          tenant_id:
            defaultTenant?.id || '00000000-0000-0000-0000-000000000000',
          email: 'instructor@example.com',
          display_name: 'Demo Instructor',
          role: 'INSTRUCTOR',
        },
        {
          id: '00000000-0000-0000-0000-000000000003',
          tenant_id:
            defaultTenant?.id || '00000000-0000-0000-0000-000000000000',
          email: 'org.admin@example.com',
          display_name: 'Demo Org Admin',
          role: 'ORG_ADMIN',
        },
        {
          id: '00000000-0000-0000-0000-000000000004',
          tenant_id:
            defaultTenant?.id || '00000000-0000-0000-0000-000000000000',
          email: 'researcher@example.com',
          display_name: 'Demo Researcher',
          role: 'RESEARCHER',
        },
        {
          id: '00000000-0000-0000-0000-000000000005',
          tenant_id:
            defaultTenant?.id || '00000000-0000-0000-0000-000000000000',
          email: 'student@example.com',
          display_name: 'Demo Student',
          role: 'STUDENT',
        },
        // ── University A demo users (legacy test data) ───────────────────────
        {
          id: '11111111-1111-1111-1111-111111111101',
          tenant_id: tenant1?.id || '11111111-1111-1111-1111-111111111111',
          email: 'admin@university-a.edu',
          display_name: 'University Admin',
          role: 'ORG_ADMIN',
        },
        {
          id: '11111111-1111-1111-1111-111111111102',
          tenant_id: tenant1?.id || '11111111-1111-1111-1111-111111111111',
          email: 'instructor@university-a.edu',
          display_name: 'Dr. Sarah Johnson',
          role: 'INSTRUCTOR',
        },
        {
          id: '11111111-1111-1111-1111-111111111103',
          tenant_id: tenant1?.id || '11111111-1111-1111-1111-111111111111',
          email: 'student1@university-a.edu',
          display_name: 'Alex Martinez',
          role: 'STUDENT',
        },
        {
          id: '11111111-1111-1111-1111-111111111104',
          tenant_id: tenant1?.id || '11111111-1111-1111-1111-111111111111',
          email: 'student2@university-a.edu',
          display_name: 'Jamie Chen',
          role: 'STUDENT',
        },
      ])
      .onConflictDoNothing();

    console.log('✅ Created 9 demo users (5 Keycloak + 4 University A legacy)');

    // Create sample course
    const [course1] = await db
      .insert(courses)
      .values({
        id: '22222222-2222-2222-2222-222222222221',
        tenant_id: tenant1?.id || '11111111-1111-1111-1111-111111111111',
        title: 'Introduction to Jewish Philosophy',
        description:
          'Explore fundamental concepts in Jewish philosophical thought',
        creator_id: '11111111-1111-1111-1111-111111111102',
        is_public: true,
        tags: ['philosophy', 'jewish-studies', 'medieval'],
      })
      .onConflictDoNothing()
      .returning();

    console.log('✅ Created sample course:', course1?.title);

    // Create modules
    await db
      .insert(modules)
      .values([
        {
          course_id: course1?.id || '22222222-2222-2222-2222-222222222221',
          title: 'Module 1: Foundations',
          description: 'Introduction to key thinkers and texts',
          order_index: 0,
        },
        {
          course_id: course1?.id || '22222222-2222-2222-2222-222222222221',
          title: 'Module 2: Divine Attributes',
          description: 'Exploring concepts of God in medieval philosophy',
          order_index: 1,
        },
      ])
      .onConflictDoNothing();

    console.log('✅ Created 2 modules');

    // Initialize Apache AGE graph ontology
    console.log('🔄 Initializing Apache AGE graph ontology...');
    await initializeGraphOntology(db);

    // Seed example course: נהר שלום — הרש"ש
    console.log('📚 Seeding example Kabbalah course: נהר שלום...');
    await seedNaharShalomCourse();

    // Attach the DOCX as a KnowledgeSource
    console.log('📎 Attaching nahar-shalom.docx as KnowledgeSource...');
    await seedNaharShalomSource();

    console.log('✅ Seed completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log('   - 2 tenants');
    console.log(
      '   - 5 users (1 super admin, 1 org admin, 1 instructor, 2 students)'
    );
    console.log('   - 1 course with 2 modules (Jewish Philosophy)');
    console.log(
      '   - 1 example course: נהר שלום (8 modules, 27 content items)'
    );
    console.log('   - 1 KnowledgeSource: נהר שלום DOCX (full text + chunks)');
    console.log(
      '   - Apache AGE graph initialized + 15 Kabbalistic concept nodes'
    );
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
