import { createDatabaseConnection } from './index';
import { users } from './schema';

async function seed() {
  console.log('🌱 Seeding database...');

  const db = createDatabaseConnection();

  try {
    // Seed demo users matching Keycloak realm
    await db.insert(users).values([
      {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'super.admin@edusphere.dev',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        tenantId: '00000000-0000-0000-0000-000000000000',
      },
      {
        id: '11111111-1111-1111-1111-111111111101',
        email: 'org.admin@example.com',
        firstName: 'Org',
        lastName: 'Admin',
        role: 'ORG_ADMIN',
        tenantId: '11111111-1111-1111-1111-111111111111',
      },
      {
        id: '11111111-1111-1111-1111-111111111102',
        email: 'instructor@example.com',
        firstName: 'John',
        lastName: 'Instructor',
        role: 'INSTRUCTOR',
        tenantId: '11111111-1111-1111-1111-111111111111',
      },
      {
        id: '11111111-1111-1111-1111-111111111103',
        email: 'student@example.com',
        firstName: 'Jane',
        lastName: 'Student',
        role: 'STUDENT',
        tenantId: '11111111-1111-1111-1111-111111111111',
      },
      {
        id: '11111111-1111-1111-1111-111111111104',
        email: 'researcher@example.com',
        firstName: 'Bob',
        lastName: 'Researcher',
        role: 'RESEARCHER',
        tenantId: '11111111-1111-1111-1111-111111111111',
      },
    ]).onConflictDoNothing();

    console.log('✅ Seed completed - 5 demo users created');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
