import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for EduSphere web app.
 *
 * Test suites (all inside ./e2e/):
 *   smoke.spec.ts        — fast page-load smoke tests
 *   auth.spec.ts         — authentication flows
 *   courses.spec.ts      — course list + content viewer
 *   search.spec.ts       — semantic search page
 *   agents.spec.ts       — AI agent chat interface
 *   full-flow.spec.ts    — complete learning loop integration
 *
 * Page objects (./e2e/pages/):
 *   LoginPage.ts, CoursePage.ts, SearchPage.ts
 *
 * Environment:
 *   VITE_DEV_MODE=true   — required for mock data (no backend needed)
 *   E2E_BASE_URL         — override base URL (default: http://localhost:5173)
 */
export default defineConfig({
  testDir: './e2e',

  /* Run tests in parallel for speed — tests are isolated per page fixture */
  fullyParallel: true,

  /* Fail the build in CI if test.only() was accidentally committed */
  forbidOnly: !!process.env.CI,

  /**
   * Retry flaky tests.
   * CI: 2 retries to handle timing-sensitive streaming assertions.
   * Local: 0 retries for immediate failure feedback.
   */
  retries: process.env.CI ? 2 : 0,

  /**
   * Worker concurrency.
   * CI: single worker to avoid resource contention on shared runners.
   * Local: use half the CPU cores (Playwright default) for parallel speed.
   */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter — GitHub annotations in CI, rich HTML report locally */
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',

  use: {
    /* Base URL — override with E2E_BASE_URL env var for staging/prod */
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',

    /**
     * Traces: collect on first retry so failures include a timeline.
     * Use `playwright show-trace trace.zip` to inspect.
     */
    trace: 'on-first-retry',

    /**
     * Screenshots: capture on test failure for visual debugging.
     * Stored in test-results/<test-name>/screenshot.png
     */
    screenshot: 'only-on-failure',

    /**
     * Video recording: disabled when ffmpeg is unavailable (corporate proxy).
     * Enable in CI where playwright install runs fully.
     */
    video: process.env.CI ? 'retain-on-failure' : 'off',

    /**
     * Global timeout per action (click, fill, expect, etc.).
     * 10s is generous for DEV_MODE mock data which is synchronous.
     * Increase to 20s if backend is connected and GraphQL latency is expected.
     */
    actionTimeout: 10_000,

    /**
     * Navigation timeout — how long to wait for page.goto() / waitForURL().
     * 30s covers slow CI environments and Vite cold-start HMR delay.
     */
    navigationTimeout: 30_000,
  },

  /**
   * Per-test timeout.
   * - Smoke tests: ~3–5s
   * - Auth/courses/search: ~10–20s
   * - Agents (streaming): ~15–25s (600ms delay + streaming animation)
   * - Full flow: ~40–60s (covers all pages)
   * 90s gives comfortable headroom for the slowest tests.
   */
  timeout: 90_000,

  /* Browser projects */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use installed system Chrome when Playwright's own Chromium binary
        // is unavailable (e.g. corporate proxy blocks playwright.dev downloads).
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
    */
  ],

  /**
   * Dev server configuration.
   * - reuseExistingServer: true locally (don't restart if already running)
   * - reuseExistingServer: false in CI (always start fresh)
   * - VITE_DEV_MODE=true ensures mock data is used (no backend required)
   */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_DEV_MODE: process.env.VITE_DEV_MODE ?? 'true',
    },
    /**
     * Wait up to 120s for the dev server to be ready.
     * Vite cold start + TypeScript compilation can be slow on first run.
     */
    timeout: 120_000,
  },
});
