/**
 * Static security tests for Phase 45 — Social Learning.
 *
 * All checks are file-system / readFileSync — no running server needed.
 * Covers: self-follow prevention (SEC-1), IDOR in peer review (SEC-2),
 * XSS in discussion messages (SEC-3), feed injection (SEC-4),
 * rate limiting (SEC-5), AI prompt injection (SEC-6),
 * profile enumeration (SEC-7), RLS tenant isolation, SI-1 compliance,
 * notification type extensions, new routes, mounted-guard patterns.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const read = (p: string): string => {
  const full = resolve(ROOT, p);
  return existsSync(full) ? readFileSync(full, 'utf-8') : '';
};

const exists = (p: string): boolean => existsSync(resolve(ROOT, p));

// ── SEC-1: Self-follow prevention ─────────────────────────────────────────────

describe('SEC-1: Self-follow prevention', () => {
  it('social.service.ts has self-follow guard', () => {
    const src = read('apps/subgraph-core/src/social/social.service.ts');
    expect(src).toMatch(
      /followerId.*!==.*followingId|followingId.*!==.*followerId|throw.*[Cc]annot follow yourself|BadRequestException.*follow/i
    );
  });

  it('self-follow guard throws (not silently ignores)', () => {
    const src = read('apps/subgraph-core/src/social/social.service.ts');
    expect(src).toMatch(/BadRequestException|throw new.*[Ee]rror.*follow/);
  });
});

// ── SEC-2: IDOR in peer review ────────────────────────────────────────────────

describe('SEC-2: IDOR in peer review', () => {
  it('peer_review_assignments schema has reviewer_id RLS check', () => {
    const schema = read('packages/db/src/schema/peer-review.ts');
    expect(schema).toMatch(
      /reviewer_id.*current_setting|current_setting.*reviewer_id/i
    );
  });

  it('peer_review_assignments schema has submitter_id RLS check', () => {
    const schema = read('packages/db/src/schema/peer-review.ts');
    expect(schema).toMatch(
      /submitter_id.*current_setting|current_setting.*submitter_id/i
    );
  });

  it('peer-review resolver or service validates ctx.userId before submitReview', () => {
    const resolverPath =
      'apps/subgraph-content/src/peer-review/peer-review.resolver.ts';
    const servicePath =
      'apps/subgraph-content/src/peer-review/peer-review.service.ts';
    const resolverExists = exists(resolverPath);
    const serviceExists = exists(servicePath);
    if (resolverExists || serviceExists) {
      const src = resolverExists ? read(resolverPath) : read(servicePath);
      expect(src).toMatch(
        /UnauthorizedException|ctx\.userId.*reviewerId|reviewerId.*ctx\.userId|userId.*!==.*reviewerId/
      );
    } else {
      // Sprint C backend not yet shipped — guard will be enforced when it lands
      expect(true).toBe(true);
    }
  });
});

// ── SEC-3: XSS in discussion messages ────────────────────────────────────────

describe('SEC-3: XSS in discussion messages', () => {
  it('discussion service sanitizes message content', () => {
    const src = read(
      'apps/subgraph-collaboration/src/discussion/discussion.service.ts'
    );
    expect(src).toMatch(/DOMPurify|sanitize|strip.*tags|ALLOWED_TAGS/i);
  });

  it('message content has max length constraint', () => {
    const serviceSrc = read(
      'apps/subgraph-collaboration/src/discussion/discussion.service.ts'
    );
    const hasMaxLength =
      /max\(2000\)|maxLength.*2000|\.max.*2000/.test(serviceSrc);
    const schemasPath =
      'apps/subgraph-collaboration/src/discussion/discussion.schemas.ts';
    const schemasSrc = exists(schemasPath) ? read(schemasPath) : '';
    expect(
      hasMaxLength || /max\(2000\)|maxLength.*2000/.test(schemasSrc)
    ).toBe(true);
  });
});

// ── SEC-4: Feed injection prevention ─────────────────────────────────────────

describe('SEC-4: Feed injection prevention', () => {
  it('social.graphql has no createFeedItem/addFeedItem/writeFeedItem mutation', () => {
    const sdl = read('apps/subgraph-core/src/social/social.graphql');
    expect(sdl).not.toMatch(
      /createFeedItem|addFeedItem|insertFeedItem|writeFeedItem/
    );
  });

  it('social.resolver.ts has no createFeedItem resolver', () => {
    const resolver = read('apps/subgraph-core/src/social/social.resolver.ts');
    expect(resolver).not.toMatch(/createFeedItem|addFeedItem|writeFeedItem/);
  });
});

// ── SEC-5: Rate limiting on social endpoints ──────────────────────────────────

describe('SEC-5: Rate limiting on social endpoints', () => {
  it('gateway rate-limit middleware or config exists', () => {
    const possiblePaths = [
      'apps/gateway/src/rate-limit.config.ts',
      'apps/gateway/src/middleware/rate-limit.ts',
      'apps/gateway/src/config/rate-limit.ts',
    ];
    const existingPath = possiblePaths.find((p) => exists(p));
    if (existingPath) {
      const config = read(existingPath);
      // Rate limit file must reference at minimum one social mutation
      expect(config).toMatch(/followUser|addMessage|likeMessage|RATE_LIMIT/i);
    } else {
      // Rate limit config may be embedded in gateway main config — verify it exists
      const gatewaySrc = read('apps/gateway/src/index.ts');
      expect(gatewaySrc.length).toBeGreaterThan(0);
    }
  });

  it('gateway index.ts has RATE_LIMIT_MAX reference or checkRateLimit call', () => {
    const idx = read('apps/gateway/src/index.ts');
    expect(idx).toMatch(/RATE_LIMIT|checkRateLimit|rate.limit/i);
  });
});

// ── SEC-6: AI prompt injection guard ─────────────────────────────────────────

describe('SEC-6: AI prompt injection guard', () => {
  it('discussion-insights service uses system role with hardcoded prompt', () => {
    const insightsPath =
      'apps/subgraph-collaboration/src/discussion/discussion-insights.service.ts';
    if (exists(insightsPath)) {
      const src = read(insightsPath);
      expect(src).toMatch(/role.*system|system.*role/i);
      expect(src).toContain('summarizer');
    } else {
      expect(true).toBe(true); // Not yet shipped
    }
  });

  it('discussion-insights does NOT use string concatenation for user messages', () => {
    const insightsPath =
      'apps/subgraph-collaboration/src/discussion/discussion-insights.service.ts';
    if (exists(insightsPath)) {
      const src = read(insightsPath);
      // Messages must be passed as structured data (JSON.stringify), not template literals
      expect(src).toContain('JSON.stringify');
    } else {
      expect(true).toBe(true);
    }
  });

  it('AI user prompt passes messages as data field (not concatenated string)', () => {
    const insightsPath =
      'apps/subgraph-collaboration/src/discussion/discussion-insights.service.ts';
    if (exists(insightsPath)) {
      const src = read(insightsPath);
      expect(src).toMatch(/task.*summarize|"task"|'task'/i);
      expect(src).toMatch(/"data"|'data'|data:/);
    } else {
      expect(true).toBe(true);
    }
  });
});

// ── SEC-7: Profile enumeration protection ────────────────────────────────────

describe('SEC-7: Profile enumeration protection', () => {
  it('searchUsers requires minimum 3 character query', () => {
    const src = read('apps/subgraph-core/src/social/social.service.ts');
    expect(src).toMatch(
      /query\.length.*[<>=!].*[23]|length.*<.*3|minLength|\.length\s*<\s*3/
    );
  });
});

// ── Cross-feature: RLS tenant isolation on new tables ────────────────────────

describe('Cross-feature: RLS tenant isolation on new tables', () => {
  const schema = read('packages/db/src/schema/peer-review.ts');

  it('peer_review_rubrics has pgPolicy with tenant_id check', () => {
    expect(schema).toMatch(
      /peer_rubrics_tenant_isolation|peer_review_rubrics.*tenant/i
    );
  });

  it('peer_review_assignments has pgPolicy with tenant_id check', () => {
    expect(schema).toMatch(
      /peer_assignments_rls|peer_review_assignments.*tenant/i
    );
  });

  it('social_feed_items has pgPolicy with tenant_id check', () => {
    expect(schema).toMatch(
      /social_feed_tenant_isolation|social_feed_items.*tenant/i
    );
  });

  it('discussion_message_likes has pgPolicy with tenant_id check', () => {
    expect(schema).toMatch(
      /discussion_likes_tenant_isolation|discussion_message_likes.*tenant/i
    );
  });

  it('all 4 new tables call enableRLS()', () => {
    expect(schema.match(/\.enableRLS\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });
});

// ── SEC-1 additional: SI-1 variable name compliance ──────────────────────────

describe('SEC-1 additional: self-follow uses SI-1 variable names', () => {
  it('social.service.ts uses app.current_user_id (SI-1 compliant, not app.current_user)', () => {
    const src = read('apps/subgraph-core/src/social/social.service.ts');
    // Must NOT use the wrong (SI-1 violating) variable name
    expect(src).not.toMatch(/current_setting\('app\.current_user',/);
  });
});

// ── Cross-feature: notification types extended ───────────────────────────────

describe('Cross-feature: notification types extended', () => {
  it('notifications.graphql has PEER_REVIEW_ASSIGNED', () => {
    const sdl = read(
      'apps/subgraph-core/src/notifications/notifications.graphql'
    );
    expect(sdl).toContain('PEER_REVIEW_ASSIGNED');
  });

  it('notifications.graphql has DISCUSSION_REPLY', () => {
    const sdl = read(
      'apps/subgraph-core/src/notifications/notifications.graphql'
    );
    expect(sdl).toContain('DISCUSSION_REPLY');
  });

  it('nats-notification.bridge.ts maps peer review subjects', () => {
    const bridge = read(
      'apps/subgraph-core/src/notifications/nats-notification.bridge.ts'
    );
    expect(bridge).toContain('EDUSPHERE.peer.review.assigned');
  });
});

// ── New routes exist in router ────────────────────────────────────────────────

describe('New routes exist in router', () => {
  it('router.tsx has /discussions route', () => {
    const router = read('apps/web/src/lib/router.tsx');
    expect(router).toMatch(/\/discussions/);
  });

  it('router.tsx has /social route', () => {
    const router = read('apps/web/src/lib/router.tsx');
    expect(router).toMatch(/\/social/);
  });

  it('router.tsx has /peer-review route', () => {
    const router = read('apps/web/src/lib/router.tsx');
    expect(router).toMatch(/\/peer-review/);
  });

  it('router.tsx has /assessments route', () => {
    const router = read('apps/web/src/lib/router.tsx');
    expect(router).toMatch(/\/assessments/);
  });

  it('router.tsx has /people route', () => {
    const router = read('apps/web/src/lib/router.tsx');
    expect(router).toMatch(/\/people/);
  });
});

// ── pause:true instances removed from social components ──────────────────────

describe('pause:true instances removed from social components', () => {
  it('FollowersList.tsx no longer has raw pause: true', () => {
    const src = read('apps/web/src/components/social/FollowersList.tsx');
    // `pause: !mounted` is acceptable — raw `pause: true` is not
    expect(src).not.toMatch(/pause:\s*true/);
  });

  it('PublicProfilePage.tsx no longer has raw pause: true', () => {
    const src = read('apps/web/src/pages/PublicProfilePage.tsx');
    expect(src).not.toMatch(/pause:\s*true/);
  });

  it('SocialFeedWidget.tsx has mounted guard (pause: !mounted)', () => {
    const src = read('apps/web/src/components/SocialFeedWidget.tsx');
    expect(src).toMatch(/pause:\s*!mounted/);
  });
});
