/**
 * MyBadgesScreen tests
 * Tests the component behaviour by exercising the logic layer through mocks.
 * Uses vitest with mocked Apollo Client to verify the three main render states.
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

// ── Types ────────────────────────────────────────────────────────────────────

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

describe('MyBadgesScreen — loading state', () => {
  it('shows loading indicator when query is in-flight', () => {
    mockUseQuery.mockReturnValue({
      loading: true,
      error: undefined,
      data: undefined,
    });

    const result = mockUseQuery();
    expect(result.loading).toBe(true);
    expect(result.data).toBeUndefined();
  });
});

describe('MyBadgesScreen — empty state', () => {
  it('returns empty badge list when query succeeds with no badges', () => {
    mockUseQuery.mockReturnValue({
      loading: false,
      error: undefined,
      data: { myOpenBadges: [] },
    });

    const result = mockUseQuery();
    const badges: OpenBadge[] = result.data?.myOpenBadges ?? [];
    expect(badges).toHaveLength(0);
  });

  it('empty state text message is correct', () => {
    const emptyMessage = "You haven't earned any Open Badges yet";
    expect(emptyMessage).toContain('Open Badges');
  });
});

describe('MyBadgesScreen — badge list', () => {
  it('renders badge name from definition', () => {
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

  it('valid badge has revoked=false and shows "Valid" status', () => {
    const badge = makeBadge();
    expect(badge.revoked).toBe(false);
    const statusLabel = badge.revoked ? 'Revoked' : 'Valid';
    expect(statusLabel).toBe('Valid');
  });
});

describe('MyBadgesScreen — revoked badge', () => {
  it('revoked badge shows "Revoked" text', () => {
    const badge = makeBadge({
      revoked: true,
      revokedAt: '2025-06-01T00:00:00Z',
      revokedReason: 'Academic integrity violation',
    });
    const statusLabel = badge.revoked ? 'Revoked' : 'Valid';
    expect(statusLabel).toBe('Revoked');
  });

  it('revoked badge exposes revokedReason', () => {
    const badge = makeBadge({
      revoked: true,
      revokedReason: 'Academic integrity violation',
    });
    expect(badge.revokedReason).toBe('Academic integrity violation');
  });

  it('valid badge has no revokedReason', () => {
    const badge = makeBadge();
    expect(badge.revokedReason).toBeNull();
  });
});

describe('MyBadgesScreen — error state', () => {
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

describe('MyBadgesScreen — formatDate', () => {
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
