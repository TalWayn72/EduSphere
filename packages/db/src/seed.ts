import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { initializeGraphOntology } from './graph';

const { tenants, users, courses, modules, media_assets } = schema;

async function seed() {
  console.log('🌱 Seeding database...');

  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://edusphere:edusphere_dev_password@localhost:5432/edusphere',
  });

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

    // Create users
    await db
      .insert(users)
      .values([
        {
          id: '00000000-0000-0000-0000-000000000001',
          tenant_id:
            defaultTenant?.id || '00000000-0000-0000-0000-000000000000',
          email: 'super.admin@edusphere.dev',
          display_name: 'Super Admin',
          role: 'SUPER_ADMIN',
        },
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

    console.log('✅ Created 5 demo users');

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

    console.log('✅ Seed completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log('   - 2 tenants');
    console.log(
      '   - 5 users (1 super admin, 1 org admin, 1 instructor, 2 students)'
    );
    console.log('   - 1 course with 2 modules');
    console.log('   - Apache AGE graph initialized');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
