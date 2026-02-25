import { defineConfig, devices } from '@playwright/test';

/**
 * EduSphere Playwright E2E Configuration
 *
 * ─── Environment Profiles ────────────────────────────────────────────────────
 *
 * local (default)   — VITE_DEV_MODE=true, Vite dev server on port 5174
 *                     No backend required. All E2E tests run against mock data.
 *
 * staging           — VITE_DEV_MODE=false, external app URL, real Keycloak
 *                     E2E_BASE_URL=https://staging.edusphere.io
 *                     E2E_KEYCLOAK_URL=https://auth.staging.edusphere.io
 *                     Tests that need Keycloak run; DEV_MODE-only tests skip.
 *
 * production        — Like staging but read-only (E2E_RUN_WRITE_TESTS=false).
 *                     Only smoke tests run (--grep="smoke").
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 * Local (default):
 *   pnpm --filter @edusphere/web test:e2e
 *
 * Staging:
 *   E2E_ENV=staging VITE_DEV_MODE=false \
 *   E2E_BASE_URL=https://staging.edusphere.io \
 *   E2E_KEYCLOAK_URL=https://auth.staging.edusphere.io \
 *   pnpm --filter @edusphere/web test:e2e
 *
 * Production smoke only:
 *   E2E_ENV=production VITE_DEV_MODE=false E2E_RUN_WRITE_TESTS=false \
 *   E2E_BASE_URL=https://app.edusphere.io \
 *   pnpm --filter @edusphere/web test:e2e --grep="smoke"
 *
 * ─── Test suites (./e2e/) ────────────────────────────────────────────────────
 *   smoke.spec.ts             — fast page-load smoke tests (all envs)
 *   auth.spec.ts              — auth flows (Keycloak tests skip in DEV_MODE)
 *   courses.spec.ts           — course list + content viewer
 *   search.spec.ts            — semantic search page
 *   agents.spec.ts            — AI agent chat interface
 *   full-flow.spec.ts         — complete learning loop integration
 *   i18n.spec.ts              — internationalization (LanguageSelector)
 *   dashboard.spec.ts         — dashboard stats and user profile
 *   knowledge-graph.spec.ts   — force-directed graph renderer
 *   keycloak-login.spec.ts    — full OIDC flow (skips in DEV_MODE)
 *   health-check.spec.ts      — service connectivity (all envs)
 *   visual-qa-student.spec.ts — visual QA screenshots (all pages)
 *
 * ─── Page objects (./e2e/pages/) ─────────────────────────────────────────────
 *   LoginPage.ts, CoursePage.ts, SearchPage.ts
 *
 * ─── Shared helpers (./e2e/) ─────────────────────────────────────────────────
 *   env.ts          — single source of truth for all URLs and credentials
 *   auth.helpers.ts — shared login functions (DEV_MODE + Keycloak)
 */

// ─── Resolve environment ──────────────────────────────────────────────────────

const E2E_PROFILE = process.env.E2E_ENV ?? 'local';

// When E2E_ENV is "staging" or "production" and no explicit E2E_BASE_URL is
// provided, fail loudly rather than silently hitting localhost.
const BASE_URL = (() => {
  if (process.env.E2E_BASE_URL) return process.env.E2E_BASE_URL;
  if (E2E_PROFILE !== 'local') {
    throw new Error(
      `E2E_BASE_URL must be set when E2E_ENV=${E2E_PROFILE}. ` +
        'Example: E2E_BASE_URL=https://staging.edusphere.io',
    );
  }
  return 'http://localhost:5175';
})();

// Whether a Vite dev server should be started automatically.
// In staging/production the app is already running externally.
const USE_LOCAL_SERVER = E2E_PROFILE === 'local';

// ─── Playwright config ────────────────────────────────────────────────────────

export default defineConfig({
  testDir: './e2e',

  /* Run tests in parallel — tests are isolated per page fixture */
  fullyParallel: true,

  /* Fail build in CI if test.only() was accidentally committed */
  forbidOnly: !!process.env.CI,

  /**
   * Retry flaky tests.
   * CI: 2 retries for timing-sensitive streaming assertions.
   * Local: 0 retries for immediate failure feedback.
   */
  retries: process.env.CI ? 2 : 0,

  /**
   * Worker concurrency.
   * CI: 1 worker to avoid resource contention on shared runners.
   * Local: Playwright default (50% of CPU cores) for parallel speed.
   */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter — GitHub annotations in CI, rich HTML report locally */
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]]
    : [['html'], ['json', { outputFile: 'test-results/results.json' }]],

  use: {
    /**
     * Base URL — the app origin.
     * Relative paths in page.goto('/dashboard') resolve against this.
     * All E2E tests MUST use relative paths or import BASE_URL from ./e2e/env.ts.
     */
    baseURL: BASE_URL,

    /**
     * Traces: collect on first retry so failures include a timeline.
     * Inspect with: npx playwright show-trace trace.zip
     */
    trace: 'on-first-retry',

    /**
     * Screenshots: capture on test failure for visual debugging.
     * Stored in test-results/<test-name>/screenshot.png
     */
    screenshot: 'only-on-failure',

    /**
     * Video: disabled when ffmpeg unavailable (corporate proxy).
     * Enabled in CI where playwright install runs fully.
     */
    video: process.env.CI ? 'retain-on-failure' : 'off',

    /**
     * Action timeout per click/fill/expect.
     * 10s is generous for DEV_MODE (synchronous mock data).
     * Staging/production should increase to 20s for GraphQL latency.
     */
    actionTimeout: E2E_PROFILE === 'local' ? 10_000 : 20_000,

    /**
     * Navigation timeout — page.goto() / waitForURL().
     * 30s local; 60s for staging/prod (CDN + TLS handshake latency).
     */
    navigationTimeout: E2E_PROFILE === 'local' ? 30_000 : 60_000,

    /**
     * Extra HTTP headers forwarded to all requests.
     * Used to identify E2E traffic in logs (e.g. for staging rate-limit bypass).
     */
    extraHTTPHeaders: {
      'x-e2e-run': 'true',
      'x-e2e-env': E2E_PROFILE,
    },
  },

  /**
   * Per-test timeout.
   * - Smoke tests: ~3–5s
   * - Auth/courses/search: ~10–20s
   * - Agents (streaming): ~15–25s (600ms delay + streaming animation)
   * - Full flow: ~40–60s (covers all pages)
   * - Staging/prod: add 30s for network latency
   */
  timeout: E2E_PROFILE === 'local' ? 90_000 : 120_000,

  /* Browser projects */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use installed system Chrome when Playwright's own Chromium is
        // unavailable (e.g. corporate proxy blocks playwright.dev downloads).
        channel: 'chrome',
      },
    },
    /* Uncomment to test additional browsers in CI:
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    */
  ],

  /**
   * Dev server — only started for local profile.
   *
   * Why a separate port from the developer's server (5173)?
   *   The developer's server may run with VITE_DEV_MODE=false (real Keycloak).
   *   Playwright needs VITE_DEV_MODE=true to auto-authenticate all tests.
   *   Port 5174 is the dedicated test server — it never interferes with dev work.
   *
   * In staging/production, webServer is undefined — Playwright connects to the
   * already-running app at E2E_BASE_URL.
   */
  webServer: USE_LOCAL_SERVER
    ? {
        command: 'pnpm dev --port 5175',
        url: 'http://localhost:5175',
        reuseExistingServer: false,
        env: {
          // Forward all VITE_* variables plus E2E-specific overrides
          VITE_DEV_MODE: process.env.VITE_DEV_MODE ?? 'true',
          VITE_GRAPHQL_URL: process.env.VITE_GRAPHQL_URL ?? 'http://localhost:4000/graphql',
          VITE_KEYCLOAK_URL: process.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080',
          VITE_KEYCLOAK_REALM: process.env.VITE_KEYCLOAK_REALM ?? 'edusphere',
          VITE_KEYCLOAK_CLIENT_ID: process.env.VITE_KEYCLOAK_CLIENT_ID ?? 'edusphere-app',
        },
        /** Wait up to 120s for Vite cold start + TypeScript compilation */
        timeout: 120_000,
      }
    : undefined,
});
