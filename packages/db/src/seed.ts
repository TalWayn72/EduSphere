import { sql, type SQL } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { getOrCreatePool, closeAllPools } from './index';
import { initializeGraphOntology } from './graph';
import { seedNaharShalomCourse } from './seed/nahar-shalom-course.js';
import { seedNaharShalomSource } from './seed/nahar-shalom-source.js';
import { seedEmbeddings } from './seed/seed-embeddings.js';
import { seedEnrollments } from './seed/seed-enrollments.js';
import { seedGamification } from './seed/seed-gamification.js';
import { seedAgentTemplates } from './seed/seed-agent-templates.js';
import { seedAnnotationsDiscussions } from './seed/seed-annotations-discussions.js';
import { seedExam } from './seed/seed-exam.js';
import { seedKabbalahLesson } from './seed/seed-kabbalah-sefirat-haomer.js';
import { seedJargonKabbalah } from './seed/seed-jargon-kabbalah.js';

const { tenants, users, courses, modules, media_assets } = schema;

async function seed() {
  console.log('🌱 Seeding database...');

  // Ensure DATABASE_URL is set so helper modules (createDatabaseConnection) pick it up
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    'postgresql://edusphere:edusphere_dev_password@localhost:5432/edusphere';

  const pool = getOrCreatePool(process.env.DATABASE_URL);

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
    await db
      .delete(users)
      .where(
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
          preferences: {
            locale: 'he',
            theme: 'system',
            emailNotifications: true,
            pushNotifications: true,
            isPublicProfile: false,
          },
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

    // Initialize Apache AGE graph ontology (best-effort — AGE may not be available in CI)
    console.log('🔄 Initializing Apache AGE graph ontology...');
    try {
      await initializeGraphOntology(db);
      console.log('✅ Apache AGE graph ontology initialized');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(
        `⚠️  Apache AGE not available — skipping graph ontology: ${msg}`
      );
    }

    // Seed example course: נהר שלום — הרש"ש
    console.log('📚 Seeding example Kabbalah course: נהר שלום...');
    await seedNaharShalomCourse();

    // Attach the DOCX as a KnowledgeSource
    console.log('📎 Attaching nahar-shalom.docx as KnowledgeSource...');
    await seedNaharShalomSource();

    // Generate demo embeddings for knowledge graph concepts
    console.log('🧠 Seeding demo embeddings for knowledge concepts...');
    await seedEmbeddings();

    // Wave 4 enrichment: enrollments, gamification, agents, annotations, exam
    console.log('📋 Seeding enrollments & progress...');
    await seedEnrollments();

    console.log('🏆 Seeding gamification data...');
    await seedGamification();

    console.log('🤖 Seeding agent templates...');
    await seedAgentTemplates();

    console.log('💬 Seeding annotations & discussions...');
    await seedAnnotationsDiscussions();

    console.log('📝 Seeding exam blueprint & items...');
    await seedExam();

    console.log(
      '🔯 Seeding Kabbalah Sefirat HaOmer lesson (YouTube 3QTC00L1x1w)...'
    );
    await seedKabbalahLesson();

    console.log('📖 Seeding Kabbalah jargon domain + 30 terms...');
    await seedJargonKabbalah();

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
    console.log(
      '   - 5 concept embeddings (768-dim, Ollama or fixture vectors)'
    );
    console.log(
      '   - 2 enrollments + ~15 progress records (student 60% complete)'
    );
    console.log('   - 5 badges, 3 user-badge awards, XP totals, 5-day streak');
    console.log('   - 4 agent templates (Chavruta, Quiz, Explain, Research)');
    console.log('   - 4 annotations, 2 discussions, 5 messages');
    console.log('   - 1 ACTIVE exam blueprint + 10 MCQ items');
    console.log(
      '   - 1 Kabbalah lesson (ספירת העומר, YouTube 3QTC00L1x1w) + 67 enriched blocks (10 summary + 54 full transcript + 3 headings)'
    );
    console.log(
      '   - 1 jargon domain (קבלה — ספירת העומר) + 30 terms + 10 occurrences'
    );
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await closeAllPools();
  }
}

seed();
