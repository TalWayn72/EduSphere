import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://edusphere:edusphere_dev_password@localhost:5432/edusphere',
  },
  verbose: true,
  strict: true,
});
