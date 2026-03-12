/**
 * prerender.ts — AEO Phase 2 Static Pre-rendering (Phase 56).
 *
 * Pre-renders public routes to static HTML for SEO/AEO crawler ingestion.
 * Designed to run as a build-time step: `pnpm prerender`
 *
 * Routes: /landing, /pricing, /pilot, /accessibility, /faq, /features, /glossary
 *
 * Strategy: Playwright headless Chromium → capture full HTML → write to dist/
 * Bot detection: Nginx/CDN serves pre-rendered HTML when User-Agent is a crawler.
 *
 * Usage:
 *   pnpm --filter @edusphere/web prerender
 *   (requires `pnpm build` to have run first so dist/ exists)
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const ROUTES = [
  '/landing',
  '/pricing',
  '/pilot',
  '/accessibility',
  '/faq',
  '/features',
  '/glossary',
] as const;

const BASE_URL = process.env['PRERENDER_BASE_URL'] ?? 'http://localhost:5173';
const DIST_DIR = join(process.cwd(), 'dist');
const PRERENDER_DIR = join(DIST_DIR, 'prerender');

async function prerender(): Promise<void> {
  if (!existsSync(DIST_DIR)) {
    console.error('[prerender] dist/ not found — run `pnpm build` first');
    process.exit(1);
  }

  mkdirSync(PRERENDER_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'EduSphere-Prerenderer/1.0 (compatible; Googlebot)',
  });

  const page = await context.newPage();
  const results: { route: string; ok: boolean }[] = [];

  for (const route of ROUTES) {
    const url = `${BASE_URL}${route}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
      // Wait for main content to be rendered
      await page.waitForSelector('main, [role="main"], #root > *', { timeout: 10_000 });
      const html = await page.content();
      const fileName = route === '/' ? 'index.html' : `${route.slice(1).replace(/\//g, '-')}.html`;
      writeFileSync(join(PRERENDER_DIR, fileName), html, 'utf-8');
      console.log(`[prerender] ✅ ${route} → prerender/${fileName}`);
      results.push({ route, ok: true });
    } catch (err) {
      console.error(`[prerender] ❌ ${route} failed:`, err);
      results.push({ route, ok: false });
    }
  }

  await browser.close();

  const failed = results.filter(r => !r.ok);
  if (failed.length > 0) {
    console.error(`[prerender] ${failed.length} routes failed: ${failed.map(r => r.route).join(', ')}`);
    process.exit(1);
  }

  console.log(`[prerender] Done — ${results.length} routes pre-rendered to dist/prerender/`);
}

prerender().catch((err: unknown) => {
  console.error('[prerender] Fatal error:', err);
  process.exit(1);
});
