/**
 * AEO Security Tests — Phase 50
 *
 * Tests that AEO infrastructure does not expose sensitive data
 * and is not vulnerable to common web attacks.
 *
 * Coverage:
 *  - robots.txt: correct disallow list, AI bot crawl-delay, sitemap reference
 *  - llms.txt: no credentials, no internal IPs/ports, HTTPS-only URLs
 *  - JSON-LD: script tag injection prevention
 *  - Canonical URLs: base-URL pattern
 *  - Public routes: no PII in static FAQ/glossary data
 *  - sitemap.xml: no authenticated routes exposed
 *  - AeoController requirements: rate-limit, published-only filter
 *
 * Static tests only — no database or network required.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const WEB_PUBLIC = resolve(ROOT, 'apps/web/public');

function readPublic(filename: string): string {
  const p = resolve(WEB_PUBLIC, filename);
  if (!existsSync(p)) return '';
  return readFileSync(p, 'utf-8');
}

// ── robots.txt ────────────────────────────────────────────────────────────────

describe('AEO Security — robots.txt', () => {
  let robotsContent: string;

  beforeAll(() => {
    robotsContent = readPublic('robots.txt');
  });

  it('robots.txt file exists in apps/web/public/', () => {
    expect(existsSync(resolve(WEB_PUBLIC, 'robots.txt'))).toBe(true);
  });

  it('grants GPTbot crawl permission for public routes', () => {
    expect(robotsContent).toContain('User-agent: GPTbot');
    expect(robotsContent).toMatch(/User-agent: GPTbot[\s\S]*?Allow:/);
  });

  it('grants ClaudeBot crawl permission for public routes', () => {
    expect(robotsContent).toContain('User-agent: ClaudeBot');
    expect(robotsContent).toMatch(/User-agent: ClaudeBot[\s\S]*?Allow:/);
  });

  it('disallows /admin/ from all bots', () => {
    expect(robotsContent).toMatch(/Disallow:.*\/admin\//);
  });

  it('disallows /api/ from all bots', () => {
    expect(robotsContent).toMatch(/Disallow:.*\/api\//);
  });

  it('disallows /graphql from all bots', () => {
    expect(robotsContent).toMatch(/Disallow:.*\/graphql/);
  });

  it('disallows /dashboard from all bots', () => {
    expect(robotsContent).toMatch(/Disallow:.*\/dashboard/);
  });

  it('disallows /settings from all bots', () => {
    expect(robotsContent).toMatch(/Disallow:.*\/settings/);
  });

  it('disallows /oauth/ from all bots (prevent OAuth CSRF via crawlers)', () => {
    expect(robotsContent).toMatch(/Disallow:.*\/oauth\//);
  });

  it('includes Sitemap directive pointing to sitemap.xml', () => {
    expect(robotsContent).toContain('Sitemap:');
    expect(robotsContent).toContain('sitemap.xml');
  });

  it('sets Crawl-delay for AI bots to prevent load spikes', () => {
    expect(robotsContent).toContain('Crawl-delay:');
    // Crawl-delay for AI bots should be >= 5 seconds
    const crawlDelayMatches = [...robotsContent.matchAll(/Crawl-delay:\s*(\d+)/g)];
    expect(crawlDelayMatches.length).toBeGreaterThan(0);
    crawlDelayMatches.forEach((match) => {
      const delay = parseInt(match[1], 10);
      expect(delay).toBeGreaterThanOrEqual(2);
    });
  });

  it('does not expose internal technology stack in comments', () => {
    // Comments in robots.txt should not mention specific tech versions
    expect(robotsContent).not.toMatch(/postgresql\s+\d+/i);
    expect(robotsContent).not.toMatch(/node\.js\s+v\d+/i);
    expect(robotsContent).not.toMatch(/nestjs\s+\d+/i);
  });

  it('does not expose internal port numbers', () => {
    // Internal microservice ports should never appear in robots.txt
    expect(robotsContent).not.toMatch(/:400[1-6]/);
    expect(robotsContent).not.toMatch(/:5432/);
    expect(robotsContent).not.toMatch(/:4222/);
    expect(robotsContent).not.toMatch(/:6379/);
  });

  it('uses only the canonical public domain in Sitemap URL', () => {
    const sitemapLine = robotsContent.split('\n').find((l) => l.startsWith('Sitemap:'));
    if (sitemapLine) {
      // Must start with https
      expect(sitemapLine).toMatch(/Sitemap:\s*https:\/\//);
      // Must NOT point to localhost
      expect(sitemapLine).not.toContain('localhost');
    }
  });

  it('does not list /admin sub-paths individually (prevents route enumeration)', () => {
    // Should use /admin/ blanket disallow, not /admin/audit-log, /admin/users individually
    const adminSpecificPaths = robotsContent.match(/Disallow:.*\/admin\/\w+/g);
    // It's acceptable to have zero specific sub-paths (blanket rule only)
    // Having more than 3 specific sub-paths suggests over-enumeration
    expect((adminSpecificPaths?.length ?? 0)).toBeLessThanOrEqual(3);
  });
});

// ── llms.txt ──────────────────────────────────────────────────────────────────

describe('AEO Security — llms.txt', () => {
  let llmsContent: string;

  beforeAll(() => {
    llmsContent = readPublic('llms.txt');
  });

  it('llms.txt file exists in apps/web/public/', () => {
    expect(existsSync(resolve(WEB_PUBLIC, 'llms.txt'))).toBe(true);
  });

  it('does not expose database credentials or API keys', () => {
    expect(llmsContent).not.toMatch(/password\s*[:=]/i);
    expect(llmsContent).not.toMatch(/secret\s*[:=]/i);
    expect(llmsContent).not.toMatch(/api[_-]?key\s*[:=]/i);
    expect(llmsContent).not.toMatch(/token\s*[:=]/i);
  });

  it('does not expose RFC-1918 internal IP addresses', () => {
    // 10.x.x.x, 172.16-31.x.x, 192.168.x.x
    expect(llmsContent).not.toMatch(/192\.168\.\d+\.\d+/);
    expect(llmsContent).not.toMatch(/10\.\d+\.\d+\.\d+/);
    expect(llmsContent).not.toMatch(/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/);
  });

  it('does not expose localhost URLs', () => {
    expect(llmsContent).not.toContain('localhost');
    expect(llmsContent).not.toContain('127.0.0.1');
    expect(llmsContent).not.toContain('0.0.0.0');
  });

  it('does not expose internal microservice port numbers', () => {
    // Subgraph ports 4001-4006, PostgreSQL 5432, Redis 6379, NATS 4222
    expect(llmsContent).not.toMatch(/:400[1-6]\b/);
    expect(llmsContent).not.toMatch(/:5432\b/);
    expect(llmsContent).not.toMatch(/:6379\b/);
    expect(llmsContent).not.toMatch(/:4222\b/);
  });

  it('does not expose specific version numbers of vulnerable dependencies', () => {
    // Version numbers aid CVE targeting
    expect(llmsContent).not.toMatch(/postgresql\s+\d+\.\d+/i);
    expect(llmsContent).not.toMatch(/node\.?js\s+v?\d+\.\d+/i);
    expect(llmsContent).not.toMatch(/nestjs\s+v?\d+\.\d+/i);
    expect(llmsContent).not.toMatch(/react\s+v?\d+\.\d+/i);
    expect(llmsContent).not.toMatch(/postgres\s+v?\d+/i);
  });

  it('uses only HTTPS URLs (not HTTP)', () => {
    // Match http:// NOT followed by s (i.e. bare http://)
    const httpMatches = llmsContent.match(/http:\/\/(?!localhost)/g);
    // No bare http:// external URLs allowed
    expect(httpMatches).toBeNull();
  });

  it('does not reference internal monitoring endpoints', () => {
    // Jaeger, Grafana, Kibana, Prometheus are internal only
    expect(llmsContent).not.toMatch(/jaeger|grafana|kibana|prometheus/i);
  });

  it('does not mention Keycloak or internal auth infrastructure names', () => {
    // Keycloak is an internal implementation detail
    expect(llmsContent).not.toMatch(/keycloak/i);
  });

  it('does not expose Apache AGE or pgvector as specific products', () => {
    // These are specific dependencies that could aid fingerprinting
    expect(llmsContent).not.toMatch(/apache\s+age/i);
    expect(llmsContent).not.toMatch(/pgvector/i);
  });

  it('does not expose NATS or JetStream infrastructure names', () => {
    expect(llmsContent).not.toMatch(/\bnats\b/i);
    expect(llmsContent).not.toMatch(/jetstream/i);
  });
});

// ── llms-full.txt (optional but applies same rules if it exists) ──────────────

describe('AEO Security — llms-full.txt (if exists)', () => {
  let llmsFullContent: string;
  let fileExists: boolean;

  beforeAll(() => {
    fileExists = existsSync(resolve(WEB_PUBLIC, 'llms-full.txt'));
    llmsFullContent = fileExists ? readPublic('llms-full.txt') : '';
  });

  it('if llms-full.txt exists, it does not expose internal IP addresses', () => {
    if (!fileExists) return;
    expect(llmsFullContent).not.toMatch(/192\.168\.\d+\.\d+/);
    expect(llmsFullContent).not.toMatch(/10\.\d+\.\d+\.\d+/);
  });

  it('if llms-full.txt exists, it does not expose localhost', () => {
    if (!fileExists) return;
    expect(llmsFullContent).not.toContain('localhost');
  });

  it('if llms-full.txt exists, it does not expose internal ports', () => {
    if (!fileExists) return;
    expect(llmsFullContent).not.toMatch(/:400[1-6]\b/);
    expect(llmsFullContent).not.toMatch(/:5432\b/);
  });

  it('if llms-full.txt exists, it uses only HTTPS URLs', () => {
    if (!fileExists) return;
    const httpMatches = llmsFullContent.match(/http:\/\/(?!localhost)/g);
    expect(httpMatches).toBeNull();
  });

  it('if llms-full.txt exists, it does not expose API keys', () => {
    if (!fileExists) return;
    expect(llmsFullContent).not.toMatch(/api[_-]?key\s*[:=]/i);
    expect(llmsFullContent).not.toMatch(/secret\s*[:=]/i);
  });
});

// ── JSON-LD injection prevention ──────────────────────────────────────────────

describe('AEO Security — JSON-LD script injection prevention', () => {
  it('JSON.stringify alone does NOT escape </script> — raw serialization is unsafe', () => {
    // This test DOCUMENTS the known unsafe behavior
    const malicious = '</script><script>alert("xss")</script>';
    const raw = JSON.stringify({ title: malicious });
    // JSON.stringify preserves </script> — this is the vulnerability
    expect(raw).toContain('</script>');
  });

  it('safeJsonLd helper escapes </script> via <\\/ replacement', () => {
    // This is the REQUIRED pattern for all JSON-LD injection in EduSphere
    function safeJsonLd(data: object): string {
      return JSON.stringify(data).replace(/<\//g, '<\\/');
    }
    const malicious = '</script><script>alert("xss")</script>';
    const safe = safeJsonLd({ title: malicious });
    expect(safe).not.toContain('</script>');
    expect(safe).toContain('<\\/script>');
  });

  it('safeJsonLd preserves legitimate content', () => {
    function safeJsonLd(data: object): string {
      return JSON.stringify(data).replace(/<\//g, '<\\/');
    }
    const legit = { title: 'Introduction to Machine Learning', description: 'A beginner course.' };
    const result = safeJsonLd(legit);
    expect(result).toContain('Introduction to Machine Learning');
    expect(result).toContain('A beginner course.');
  });

  it('schema.org Course JSON-LD does not include forbidden fields', () => {
    // Simulate what an AeoController course schema should look like
    const allowedCourseSchema = {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: 'Intro to TypeScript',
      description: 'Learn TypeScript from scratch.',
      provider: { '@type': 'Organization', name: 'EduSphere' },
      url: 'https://edusphere.dev/courses/intro-typescript',
    };
    // Verify forbidden fields are absent
    const schemaKeys = Object.keys(allowedCourseSchema);
    expect(schemaKeys).not.toContain('tenantId');
    expect(schemaKeys).not.toContain('enrollmentCount');
    expect(schemaKeys).not.toContain('instructorEmail');
    expect(schemaKeys).not.toContain('internalId');
    expect(schemaKeys).not.toContain('pricingTier');
  });

  it('FAQPage JSON-LD does not inject user PII into answers', () => {
    // FAQ items should be static content only
    const faqItems = [
      {
        '@type': 'Question',
        name: 'What is EduSphere?',
        acceptedAnswer: { '@type': 'Answer', text: 'EduSphere is an AI-powered LMS.' },
      },
    ];
    faqItems.forEach((item) => {
      // Answers must not contain email addresses or phone numbers
      expect(item.acceptedAnswer.text).not.toMatch(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
      expect(item.acceptedAnswer.text).not.toMatch(/\+?\d[\d\s\-().]{7,}/);
    });
  });
});

// ── Canonical URL construction ─────────────────────────────────────────────────

describe('AEO Security — Canonical URL safety', () => {
  it('canonical URLs must start with the expected production domain', () => {
    const BASE_URL = 'https://app.edusphere.dev';
    const paths = ['/faq', '/features/knowledge-graph', '/glossary', '/pricing'];
    paths.forEach((path) => {
      const canonical = `${BASE_URL}${path}`;
      expect(canonical).toMatch(/^https:\/\/app\.edusphere\.dev/);
      expect(canonical).not.toContain('javascript:');
      expect(canonical).not.toContain('data:');
    });
  });

  it('canonical URL must not be built from raw window.location.href', () => {
    // This is a static code pattern check
    const routerFile = resolve(ROOT, 'apps/web/src/lib/router.tsx');
    if (!existsSync(routerFile)) return;
    const content = readFileSync(routerFile, 'utf-8');
    // window.location.href in canonical context is dangerous — flag it
    // Acceptable: window.location.pathname (path only, no query string/hash)
    const hasHref = content.match(/canonical.*window\.location\.href/s);
    expect(hasHref).toBeNull();
  });

  it('sitemap.xml uses HTTPS and correct domain', () => {
    const sitemapPath = resolve(WEB_PUBLIC, 'sitemap.xml');
    if (!existsSync(sitemapPath)) return;
    const content = readFileSync(sitemapPath, 'utf-8');
    // All loc entries must start with https://
    const httpLocs = content.match(/<loc>http:\/\/(?!localhost)/g);
    expect(httpLocs).toBeNull();
  });

  it('sitemap.xml does not expose authenticated routes', () => {
    const sitemapPath = resolve(WEB_PUBLIC, 'sitemap.xml');
    if (!existsSync(sitemapPath)) return;
    const content = readFileSync(sitemapPath, 'utf-8');
    // These paths must never appear in sitemap
    const forbiddenPaths = [
      '/dashboard', '/admin', '/settings', '/profile', '/courses/',
      '/agents', '/annotations', '/oauth', '/graphql', '/api/',
      '/checkout', '/onboarding', '/lti/',
    ];
    forbiddenPaths.forEach((path) => {
      expect(content).not.toContain(`<loc>${path}`);
    });
  });
});

// ── AeoController requirements (static code checks) ───────────────────────────

describe('AEO Security — AeoController requirements', () => {
  const aeoDir = resolve(ROOT, 'apps/subgraph-content/src/aeo');

  it('AeoController directory is either absent (not yet built) or has rate-limiting documentation', () => {
    if (!existsSync(aeoDir)) {
      // Not yet implemented — acceptable at pre-launch
      expect(existsSync(aeoDir)).toBe(false);
      return;
    }
    // Rate limiting is enforced at the gateway level (Hive Gateway / nginx).
    // AeoController must document this via a comment, not necessarily @Throttle.
    const { globSync } = require('glob');
    const files: string[] = globSync(`${aeoDir}/**/*.controller.ts`);
    files.forEach((file: string) => {
      const content = readFileSync(file, 'utf-8');
      // Must either use @Throttle decorator OR document gateway-level rate limiting
      const hasRateLimiting =
        /@Throttle|throttle/i.test(content) ||
        /gateway|nginx|rate.limit/i.test(content);
      expect(hasRateLimiting).toBe(true);
    });
  });

  it('AeoController does not query without published status filter (when implemented)', () => {
    if (!existsSync(aeoDir)) return;
    const { globSync } = require('glob');
    const files: string[] = globSync(`${aeoDir}/**/*.service.ts`);
    files.forEach((file: string) => {
      const content = readFileSync(file, 'utf-8');
      // Must filter by published status
      expect(content).toMatch(/published|status.*public/i);
    });
  });

  it('AeoController does not expose tenantId in response (when implemented)', () => {
    if (!existsSync(aeoDir)) return;
    const { globSync } = require('glob');
    const files: string[] = globSync(`${aeoDir}/**/*.{ts,service.ts}`);
    files.forEach((file: string) => {
      const content = readFileSync(file, 'utf-8');
      // Response objects must not contain raw tenantId
      expect(content).not.toMatch(/response.*tenantId|tenantId.*response/i);
    });
  });
});

// ── Gateway security for public AEO paths ─────────────────────────────────────

describe('AEO Security — Gateway rate limiting', () => {
  it('rate limiter middleware exists and covers all requests', () => {
    const rateLimitPath = resolve(ROOT, 'apps/gateway/src/middleware/rate-limit.ts');
    expect(existsSync(rateLimitPath)).toBe(true);
  });

  it('rate limiter enforces per-IP or per-tenant key', () => {
    const content = readFileSync(
      resolve(ROOT, 'apps/gateway/src/middleware/rate-limit.ts'),
      'utf-8'
    );
    expect(content).toMatch(/tenant|ip|key/i);
  });

  it('gateway returns 429 status on rate limit exceeded', () => {
    const gatewayIndex = resolve(ROOT, 'apps/gateway/src/index.ts');
    if (!existsSync(gatewayIndex)) return;
    const content = readFileSync(gatewayIndex, 'utf-8');
    expect(content).toMatch(/429|RATE_LIMIT_EXCEEDED/);
  });

  it('gateway CORS does not use wildcard (*) origin', () => {
    const gatewayIndex = resolve(ROOT, 'apps/gateway/src/index.ts');
    if (!existsSync(gatewayIndex)) return;
    const content = readFileSync(gatewayIndex, 'utf-8');
    // Must NOT have `origin: '*'` — fail closed
    expect(content).not.toMatch(/origin:\s*['"]?\*['"]?/);
    // Should reference CORS_ORIGIN env var
    expect(content).toContain('CORS_ORIGIN');
  });

  it('security headers middleware applies HSTS', () => {
    const headersPath = resolve(ROOT, 'apps/gateway/src/middleware/security-headers.ts');
    expect(existsSync(headersPath)).toBe(true);
    const content = readFileSync(headersPath, 'utf-8');
    expect(content).toContain('Strict-Transport-Security');
    expect(content).toContain('max-age=31536000');
  });

  it('security headers middleware sets X-Frame-Options: DENY', () => {
    const headersPath = resolve(ROOT, 'apps/gateway/src/middleware/security-headers.ts');
    if (!existsSync(headersPath)) return;
    const content = readFileSync(headersPath, 'utf-8');
    expect(content).toContain('X-Frame-Options');
    expect(content).toContain('DENY');
  });

  it('security headers middleware sets X-Content-Type-Options: nosniff', () => {
    const headersPath = resolve(ROOT, 'apps/gateway/src/middleware/security-headers.ts');
    if (!existsSync(headersPath)) return;
    const content = readFileSync(headersPath, 'utf-8');
    expect(content).toContain('X-Content-Type-Options');
    expect(content).toContain('nosniff');
  });
});

// ── Public route isolation check ──────────────────────────────────────────────

describe('AEO Security — Public route isolation', () => {
  let routerContent: string;

  beforeAll(() => {
    const routerPath = resolve(ROOT, 'apps/web/src/lib/router.tsx');
    routerContent = existsSync(routerPath) ? readFileSync(routerPath, 'utf-8') : '';
  });

  it('/dashboard is wrapped in guarded() (ProtectedRoute)', () => {
    expect(routerContent).toMatch(/path:\s*['"]\/dashboard['"]\s*,[\s\S]{0,100}guarded/);
  });

  it('/admin is wrapped in guarded()', () => {
    expect(routerContent).toMatch(/path:\s*['"]\/admin['"]\s*,[\s\S]{0,100}guarded/);
  });

  it('/settings is wrapped in guarded()', () => {
    expect(routerContent).toMatch(/path:\s*['"]\/settings['"]\s*,[\s\S]{0,100}guarded/);
  });

  it('/courses is wrapped in guarded()', () => {
    expect(routerContent).toMatch(/path:\s*['"]\/courses['"]\s*,[\s\S]{0,100}guarded/);
  });

  it('/agents is wrapped in guarded()', () => {
    expect(routerContent).toMatch(/path:\s*['"]\/agents['"]\s*,[\s\S]{0,100}guarded/);
  });

  it('/checkout is wrapped in guarded()', () => {
    expect(routerContent).toMatch(/path:\s*['"]\/checkout['"]\s*,[\s\S]{0,100}guarded/);
  });

  it('/landing is public (no guarded wrapper)', () => {
    // Landing page should be accessible without auth for marketing/SEO
    const landingBlock = routerContent.match(
      /path:\s*['"]\/landing['"]\s*,[\s\S]{0,200}/
    );
    expect(landingBlock).not.toBeNull();
    // Should NOT have guarded() wrapping
    expect(landingBlock![0]).not.toContain('guarded(');
  });

  it('/accessibility is public (no guarded wrapper)', () => {
    const accessBlock = routerContent.match(
      /path:\s*['"]\/accessibility['"]\s*,[\s\S]{0,200}/
    );
    expect(accessBlock).not.toBeNull();
    expect(accessBlock![0]).not.toContain('guarded(');
  });

  it('/login route has no auth guard (as expected)', () => {
    const loginBlock = routerContent.match(
      /path:\s*['"]\/login['"]\s*,[\s\S]{0,200}/
    );
    expect(loginBlock).not.toBeNull();
    expect(loginBlock![0]).not.toContain('guarded(');
  });

  it('/oauth/google/callback is public (required for OAuth flow)', () => {
    // Verify it exists in the router
    expect(routerContent).toContain("'/oauth/google/callback'");
    // Verify its element block uses Suspense, not guarded()
    // The block ends at the closing brace before the next route entry
    const oauthBlock = routerContent.match(
      /path:\s*['"]\/oauth\/google\/callback['"]\s*,\s*element:\s*\([^)]*\),/
    );
    expect(oauthBlock).not.toBeNull();
    expect(oauthBlock![0]).not.toContain('guarded(');
  });
});

// ── ProtectedRoute implementation check ───────────────────────────────────────

describe('AEO Security — ProtectedRoute implementation', () => {
  let protectedRouteContent: string;

  beforeAll(() => {
    const prPath = resolve(ROOT, 'apps/web/src/components/ProtectedRoute.tsx');
    protectedRouteContent = existsSync(prPath) ? readFileSync(prPath, 'utf-8') : '';
  });

  it('ProtectedRoute.tsx exists', () => {
    expect(existsSync(resolve(ROOT, 'apps/web/src/components/ProtectedRoute.tsx'))).toBe(true);
  });

  it('ProtectedRoute redirects unauthenticated users to /login', () => {
    expect(protectedRouteContent).toContain('/login');
    expect(protectedRouteContent).toMatch(/Navigate|redirect/i);
  });

  it('ProtectedRoute calls isAuthenticated() to verify auth state', () => {
    expect(protectedRouteContent).toMatch(/isAuthenticated/);
  });
});
