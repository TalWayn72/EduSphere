#!/usr/bin/env node
/**
 * AEO Pre-render script
 * Runs after `vite build` to generate static HTML for public routes.
 * These HTML files allow AI crawlers (GPTbot, ClaudeBot, PerplexityBot)
 * to index structured data without executing JavaScript.
 *
 * Usage: node scripts/prerender.mjs
 * (called automatically via `pnpm build:aeo`)
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = 4174;

const PUBLIC_ROUTES = [
  { path: '/landing', file: 'landing/index.html' },
  { path: '/faq', file: 'faq/index.html' },
  { path: '/features', file: 'features/index.html' },
  { path: '/glossary', file: 'glossary/index.html' },
  { path: '/pricing', file: 'pricing/index.html' },
  { path: '/catalog', file: 'catalog/index.html' },
  { path: '/instructors', file: 'instructors/index.html' },
];

/**
 * Serve dist/ as a minimal static HTTP server.
 * Falls back to index.html for SPA routing (all unknown paths serve index.html).
 */
function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const urlPath = req.url?.split('?')[0] ?? '/';
      // Try exact file first, fallback to dist/index.html for SPA routing
      const candidates = [
        path.join(DIST, urlPath === '/' ? 'index.html' : urlPath),
        path.join(DIST, urlPath, 'index.html'),
        path.join(DIST, 'index.html'),
      ];

      for (const candidate of candidates) {
        try {
          await fs.access(candidate);
          const ext = path.extname(candidate);
          const contentTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.svg': 'image/svg+xml',
            '.png': 'image/png',
            '.ico': 'image/x-icon',
          };
          res.setHeader('Content-Type', contentTypes[ext] ?? 'text/plain');
          createReadStream(candidate).pipe(res);
          return;
        } catch {
          // try next candidate
        }
      }

      res.writeHead(404);
      res.end('Not found');
    });

    server.on('error', reject);
    server.listen(PORT, '127.0.0.1', () => {
      console.info(`[prerender] Static server listening on http://127.0.0.1:${PORT}`);
      resolve(server);
    });
  });
}

async function prerender() {
  // Verify dist/ exists
  try {
    await fs.access(DIST);
  } catch {
    console.error('[prerender] ERROR: dist/ not found. Run `vite build` first.');
    process.exit(1);
  }

  const server = await startStaticServer();

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  let failed = 0;

  for (const route of PUBLIC_ROUTES) {
    const url = `http://127.0.0.1:${PORT}${route.path}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

      // Wait for at least one JSON-LD script to be injected by react-helmet-async
      await page.waitForFunction(
        () => document.querySelector('script[type="application/ld+json"]') !== null,
        { timeout: 10_000 },
      );

      const html = await page.content();
      const outFile = path.join(DIST, route.file);
      await fs.mkdir(path.dirname(outFile), { recursive: true });
      await fs.writeFile(outFile, html, 'utf-8');
      console.info(`[prerender] ✓ ${route.path} → dist/${route.file}`);
    } catch (err) {
      console.error(`[prerender] ✗ ${route.path} failed:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  await browser.close();
  server.close();

  if (failed > 0) {
    console.error(`[prerender] ${failed} route(s) failed.`);
    process.exit(1);
  }

  console.info('[prerender] Done — all public routes pre-rendered.');
}

prerender().catch((err) => {
  console.error('[prerender] Fatal error:', err);
  process.exit(1);
});
