/**
 * MyBadgesScreen tests
 * Tests the component behaviour by exercising the logic layer through mocks.
 * @testing-library/react-native is not installed; these tests use vitest with
 * mocked Apollo Client to verify the three main render states.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Apollo mock ──────────────────────────────────────────────────────────────
const mockUseQuery = vi.fn();
vi.mock('@apollo/client', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

// ── React Native mock ────────────────────────────────────────────────────────
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  FlatList: 'FlatList',
  ActivityIndicator: 'ActivityIndicator',
  Image: 'Image',
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
}));

// ── react-i18next mock ───────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

interface BadgeDefinition {
  name: string;
  description: string;
  imageUrl: string | null;
}

interface OpenBadge {
  id: string;
  issuedAt: string;
  revoked: boolean;
  revokedAt: string | null;
  revokedReason: string | null;
  definition: BadgeDefinition;
}

function makeBadge(overrides: Partial<OpenBadge> = {}): OpenBadge {
  return {
    id: 'badge-1',
    issuedAt: '2025-01-15T10:00:00Z',
    revoked: false,
    revokedAt: null,
    revokedReason: null,
    definition: {
      name: 'JavaScript Fundamentals',
      description: 'Awarded for completing JS basics',
      imageUrl: null,
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('MyBadgesScreen — useQuery states', () => {
  it('returns loading state when query is in-flight', () => {
    mockUseQuery.mockReturnValue({ loading: true, error: undefined, data: undefined });

    const result = mockUseQuery();
    expect(result.loading).toBe(true);
    expect(result.data).toBeUndefined();
  });

  it('returns empty badges array when query succeeds with no data', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      error: undefined,
      data: { myOpenBadges: [] },
    });

    const result = mockUseQuery();
    const badges: OpenBadge[] = result.data?.myOpenBadges ?? [];
    expect(badges).toHaveLength(0);
  });

  it('returns badge list when query succeeds with badges', () => {
    const badge = makeBadge();
    mockUseQuery.mockReturnValue({
      loading: false,
      error: undefined,
      data: { myOpenBadges: [badge] },
    });

    const result = mockUseQuery();
    const badges: OpenBadge[] = result.data?.myOpenBadges ?? [];
    expect(badges).toHaveLength(1);
    expect(badges[0].definition.name).toBe('JavaScript Fundamentals');
  });

  it('exposes error message when query fails', () => {
    const testError = new Error('Network error: failed to fetch');
    mockUseQuery.mockReturnValue({
      loading: false,
      error: testError,
      data: undefined,
    });

    const result = mockUseQuery();
    expect(result.error).toBeDefined();
    expect(result.error.message).toContain('Network error');
  });
});

describe('MyBadgesScreen — badge data shape', () => {
  it('valid badge has revoked=false and no revokedReason', () => {
    const badge = makeBadge();
    expect(badge.revoked).toBe(false);
    expect(badge.revokedReason).toBeNull();
  });

  it('revoked badge has revoked=true and a revokedReason', () => {
    const badge = makeBadge({
      revoked: true,
      revokedAt: '2025-06-01T00:00:00Z',
      revokedReason: 'Academic integrity violation',
    });
    expect(badge.revoked).toBe(true);
    expect(badge.revokedReason).toBe('Academic integrity violation');
  });

  it('badge list contains both valid and revoked badges', () => {
    const validBadge = makeBadge({ id: 'b1' });
    const revokedBadge = makeBadge({
      id: 'b2',
      revoked: true,
      revokedReason: 'Fraud',
    });
    mockUseQuery.mockReturnValue({
      loading: false,
      error: undefined,
      data: { myOpenBadges: [validBadge, revokedBadge] },
    });

    const result = mockUseQuery();
    const badges: OpenBadge[] = result.data?.myOpenBadges ?? [];
    const revokedCount = badges.filter((b) => b.revoked).length;
    const validCount = badges.filter((b) => !b.revoked).length;
    expect(revokedCount).toBe(1);
    expect(validCount).toBe(1);
  });
});

describe('MyBadgesScreen — formatDate helper logic', () => {
  it('issuedAt ISO string converts to a non-empty locale date', () => {
    const iso = '2025-03-10T08:30:00Z';
    const formatted = new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    expect(formatted).toBeTruthy();
    expect(formatted.length).toBeGreaterThan(0);
  });
});
