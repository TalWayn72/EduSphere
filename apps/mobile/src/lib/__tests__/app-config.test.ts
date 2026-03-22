/**
 * app-config.test.ts — Unit tests for dynamic app.config.js.
 * Pure logic tests: verifies bundle ID generation and dynamic config.
 */

// ── Inline the pure function from app.config.js ─────────────────────────────

function slugToBundleSegment(slug: string): string {
  return slug.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function buildBundleId(orgSlug: string | undefined, appVariant: string | undefined): string {
  const isOrgBuild = Boolean(orgSlug && appVariant === 'org');
  return isOrgBuild
    ? `com.${slugToBundleSegment(orgSlug!)}.learning`
    : 'com.edusphere.app';
}

function buildAppName(orgName: string | undefined, orgSlug: string | undefined, appVariant: string | undefined): string {
  const isOrgBuild = Boolean(orgSlug && appVariant === 'org');
  return isOrgBuild && orgName ? orgName : 'EduSphere';
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('app.config — slugToBundleSegment', () => {
  it('removes hyphens', () => {
    expect(slugToBundleSegment('acme-corp')).toBe('acmecorp');
  });

  it('removes special characters', () => {
    expect(slugToBundleSegment('org@#$')).toBe('org');
  });

  it('converts to lowercase', () => {
    expect(slugToBundleSegment('AcmeCorp')).toBe('acmecorp');
  });

  it('preserves alphanumeric', () => {
    expect(slugToBundleSegment('org123')).toBe('org123');
  });

  it('removes spaces', () => {
    expect(slugToBundleSegment('my org')).toBe('myorg');
  });

  it('removes underscores', () => {
    expect(slugToBundleSegment('my_org')).toBe('myorg');
  });
});

describe('app.config — buildBundleId', () => {
  it('returns default bundle ID when no org slug', () => {
    expect(buildBundleId(undefined, undefined)).toBe('com.edusphere.app');
  });

  it('returns default bundle ID when org slug set but variant is not org', () => {
    expect(buildBundleId('acme', undefined)).toBe('com.edusphere.app');
    expect(buildBundleId('acme', 'default')).toBe('com.edusphere.app');
  });

  it('returns custom bundle ID when org slug + variant=org', () => {
    expect(buildBundleId('acme-corp', 'org')).toBe('com.acmecorp.learning');
  });

  it('returns custom bundle ID with sanitized slug', () => {
    expect(buildBundleId('My Org!', 'org')).toBe('com.myorg.learning');
  });
});

describe('app.config — buildAppName', () => {
  it('returns EduSphere when no org config', () => {
    expect(buildAppName(undefined, undefined, undefined)).toBe('EduSphere');
  });

  it('returns org name when org build', () => {
    expect(buildAppName('Acme Learning', 'acme', 'org')).toBe('Acme Learning');
  });

  it('returns EduSphere when org build but no org name', () => {
    expect(buildAppName(undefined, 'acme', 'org')).toBe('EduSphere');
  });

  it('returns EduSphere when org name set but variant not org', () => {
    expect(buildAppName('Acme', 'acme', 'default')).toBe('EduSphere');
  });
});
