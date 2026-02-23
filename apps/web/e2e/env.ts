/**
 * E2E Environment Configuration — Single Source of Truth
 *
 * All E2E test files MUST import URLs and credentials from this module.
 * Never hardcode `http://localhost:PORT` in spec files.
 *
 * ─── Environment Profiles ────────────────────────────────────────────────────
 *
 * local      (default) — VITE_DEV_MODE=true, no Keycloak, port 5174
 * staging              — VITE_DEV_MODE=false, real Keycloak, configured URLs
 * production           — VITE_DEV_MODE=false, real Keycloak, production URLs
 *
 * ─── How to Override ─────────────────────────────────────────────────────────
 *
 * Local dev (default):
 *   pnpm --filter @edusphere/web test:e2e
 *
 * Staging:
 *   E2E_ENV=staging \
 *   VITE_DEV_MODE=false \
 *   E2E_BASE_URL=https://staging.edusphere.io \
 *   E2E_KEYCLOAK_URL=https://auth.staging.edusphere.io \
 *   pnpm --filter @edusphere/web test:e2e
 *
 * Production (read-only smoke only):
 *   E2E_ENV=production \
 *   VITE_DEV_MODE=false \
 *   E2E_BASE_URL=https://app.edusphere.io \
 *   E2E_KEYCLOAK_URL=https://auth.edusphere.io \
 *   E2E_RUN_WRITE_TESTS=false \
 *   pnpm --filter @edusphere/web test:e2e --grep="smoke"
 *
 * ─── Environment Variables Reference ─────────────────────────────────────────
 *
 * E2E_ENV                   — "local" | "staging" | "production" (default: "local")
 * E2E_BASE_URL              — Web app URL (default: http://localhost:5174)
 * E2E_KEYCLOAK_URL          — Keycloak server URL (default: http://localhost:8080)
 * E2E_GRAPHQL_URL           — GraphQL gateway URL (default: http://localhost:4000/graphql)
 * VITE_DEV_MODE             — "true" | "false" (default: "true")
 * E2E_SUPER_ADMIN_EMAIL     — SuperAdmin credentials
 * E2E_SUPER_ADMIN_PASSWORD  — SuperAdmin credentials
 * E2E_STUDENT_EMAIL         — Student credentials
 * E2E_STUDENT_PASSWORD      — Student credentials
 * E2E_INSTRUCTOR_EMAIL      — Instructor credentials
 * E2E_INSTRUCTOR_PASSWORD   — Instructor credentials
 * E2E_RUN_WRITE_TESTS       — "true" | "false" — skip mutation tests in prod (default: "true")
 * E2E_SCREENSHOTS_DIR       — Screenshot output dir (default: test-results/screenshots)
 */

// ─── Environment type ────────────────────────────────────────────────────────

export type E2EProfile = 'local' | 'staging' | 'production';

// ─── Core settings ───────────────────────────────────────────────────────────

/** Current environment profile */
export const E2E_PROFILE: E2EProfile =
  (process.env.E2E_ENV as E2EProfile) ?? 'local';

/** Web application base URL — all page.goto('/path') calls are relative to this */
export const BASE_URL: string =
  process.env.E2E_BASE_URL ?? 'http://localhost:5174';

/** Keycloak OIDC server base URL */
export const KEYCLOAK_URL: string =
  process.env.E2E_KEYCLOAK_URL ?? 'http://localhost:8080';

/** Keycloak realm name */
export const KEYCLOAK_REALM: string =
  process.env.E2E_KEYCLOAK_REALM ?? 'edusphere';

/** Full Keycloak realm URL */
export const KEYCLOAK_REALM_URL = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;

/** GraphQL federation gateway URL */
export const GRAPHQL_URL: string =
  process.env.E2E_GRAPHQL_URL ?? 'http://localhost:4000/graphql';

/** Screenshot output directory */
export const SCREENSHOTS_DIR: string =
  process.env.E2E_SCREENSHOTS_DIR ?? 'test-results/screenshots';

// ─── Auth mode ───────────────────────────────────────────────────────────────

/**
 * Whether the app runs in DEV_MODE (auto-authentication, no Keycloak required).
 * true  → app auto-authenticates every visitor as SUPER_ADMIN mock user
 * false → real Keycloak OIDC login required
 */
export const IS_DEV_MODE: boolean = process.env.VITE_DEV_MODE !== 'false';

/**
 * Whether a live Keycloak backend is available.
 * Inverse of IS_DEV_MODE — used as gate for Keycloak-dependent tests.
 */
export const LIVE_BACKEND: boolean = !IS_DEV_MODE;

/** Whether we're running in CI */
export const IS_CI: boolean = !!process.env.CI;

/**
 * Whether write/mutation tests should run.
 * Set to false for production smoke-only runs.
 */
export const RUN_WRITE_TESTS: boolean =
  process.env.E2E_RUN_WRITE_TESTS !== 'false';

// ─── Test users ──────────────────────────────────────────────────────────────

export interface TestUser {
  email: string;
  password: string;
  role: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'INSTRUCTOR' | 'STUDENT';
}

export const TEST_USERS = {
  superAdmin: {
    email: process.env.E2E_SUPER_ADMIN_EMAIL ?? 'super.admin@edusphere.dev',
    password: process.env.E2E_SUPER_ADMIN_PASSWORD ?? 'SuperAdmin123!',
    role: 'SUPER_ADMIN',
  },
  instructor: {
    email: process.env.E2E_INSTRUCTOR_EMAIL ?? 'instructor@example.com',
    password: process.env.E2E_INSTRUCTOR_PASSWORD ?? 'Instructor123!',
    role: 'INSTRUCTOR',
  },
  student: {
    email: process.env.E2E_STUDENT_EMAIL ?? 'student@example.com',
    password: process.env.E2E_STUDENT_PASSWORD ?? 'Student123!',
    role: 'STUDENT',
  },
} as const satisfies Record<string, TestUser>;

// ─── Named export for ergonomic import ───────────────────────────────────────

/**
 * All E2E environment settings in one object.
 *
 * @example
 * import { E2E } from './env';
 * await page.goto(`${E2E.BASE_URL}/dashboard`);
 * test.skip(!E2E.LIVE_BACKEND, 'Requires live Keycloak');
 */
export const E2E = {
  PROFILE: E2E_PROFILE,
  BASE_URL,
  KEYCLOAK_URL,
  KEYCLOAK_REALM,
  KEYCLOAK_REALM_URL,
  GRAPHQL_URL,
  SCREENSHOTS_DIR,
  IS_DEV_MODE,
  LIVE_BACKEND,
  IS_CI,
  RUN_WRITE_TESTS,
  TEST_USERS,
} as const;

export default E2E;
