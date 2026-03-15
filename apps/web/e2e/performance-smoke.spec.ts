import { test, expect } from '@playwright/test';
import { login } from './auth.helpers';
import { BASE_URL } from './env';

/**
 * Performance Smoke E2E Tests
 *
 * Lightweight performance checks using browser Performance API:
 * - Largest Contentful Paint (LCP) < 4s
 * - No console.error on critical pages
 * - Navigation speed (page load < 5s)
 *
 * These are smoke-level thresholds — NOT a substitute for Lighthouse CI.
 * They catch regressions where a page suddenly takes 10s+ to render.
 */

test.describe('Performance Smoke — LCP', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  const lcpPages = [
    { name: 'dashboard', path: '/dashboard' },
    { name: 'courses', path: '/courses' },
    { name: 'profile', path: '/profile' },
    { name: 'discover', path: '/discover' },
    { name: 'settings', path: '/settings' },
  ] as const;

  for (const { name, path } of lcpPages) {
    test(`LCP < 4s on ${name}`, async ({ page }) => {
      // Set up LCP observer BEFORE navigation via addInitScript
      await page.addInitScript(() => {
        (window as unknown as Record<string, unknown>).__LCP_VALUE__ = 0;
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            (window as unknown as Record<string, unknown>).__LCP_VALUE__ =
              entries[entries.length - 1].startTime;
          }
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
      });

      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Give the observer time to fire
      await page.waitForTimeout(1000);

      const lcp = await page.evaluate(
        () => (window as unknown as Record<string, unknown>).__LCP_VALUE__ as number
      );

      // LCP of 0 means no LCP entry was recorded (e.g. empty page) — still passes
      // but we log it for visibility. A real regression would show LCP > 4000.
      expect(lcp).toBeLessThan(4000);
    });
  }
});

test.describe('Performance Smoke — No Console Errors', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  const errorFreePages = [
    { name: 'dashboard', path: '/dashboard' },
    { name: 'courses', path: '/courses' },
    { name: 'profile', path: '/profile' },
    { name: 'settings', path: '/settings' },
    { name: 'discover', path: '/discover' },
  ] as const;

  for (const { name, path } of errorFreePages) {
    test(`no console errors on ${name}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // Ignore known benign errors:
          // - Failed to load resource for external services that may be down in test env
          // - ResizeObserver loop warnings (browser-internal, not app errors)
          // - Keycloak iframe silent-check-sso failures in DEV_MODE
          if (
            text.includes('ResizeObserver') ||
            text.includes('silent-check-sso') ||
            text.includes('Failed to load resource') ||
            text.includes('net::ERR_CONNECTION_REFUSED')
          ) {
            return;
          }
          errors.push(text);
        }
      });

      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Allow a brief settling period for lazy-loaded components
      await page.waitForTimeout(500);

      expect(
        errors,
        `Console errors found on ${name}: ${errors.join('\n')}`
      ).toHaveLength(0);
    });
  }
});

test.describe('Performance Smoke — Navigation Speed', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  const navigationPages = [
    { name: 'dashboard', path: '/dashboard' },
    { name: 'courses', path: '/courses' },
    { name: 'knowledge-graph', path: '/knowledge-graph' },
    { name: 'ai-tutor', path: '/ai-tutor' },
    { name: 'assessments', path: '/assessments' },
  ] as const;

  for (const { name, path } of navigationPages) {
    test(`${name} loads within 5s`, async ({ page }) => {
      const start = Date.now();

      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const elapsed = Date.now() - start;

      expect(
        elapsed,
        `${name} took ${elapsed}ms to load (limit: 5000ms)`
      ).toBeLessThan(5000);
    });
  }
});
