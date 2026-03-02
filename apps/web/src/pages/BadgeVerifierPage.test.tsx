import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: vi.fn(() => ({ assertionId: 'assert-abc123' })),
  };
});

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: vi.fn() };
});

vi.mock('@/lib/graphql', () => ({
  gqlClient: { request: vi.fn() },
}));

vi.mock('@/lib/graphql/badge.queries', () => ({
  VERIFY_BADGE_QUERY: 'VERIFY_BADGE_QUERY',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { BadgeVerifierPage } from './BadgeVerifierPage';
import * as tanstack from '@tanstack/react-query';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_ASSERTION = {
  id: 'assert-abc123',
  badgeName: 'First Login',
  badgeDescription: 'Logged in for the first time',
  recipientId: 'user-abc-xyz-1234',
  issuedAt: '2024-03-01T00:00:00Z',
  expiresAt: null,
  revoked: false,
  verifyUrl: 'https://example.com/verify/assert-abc123',
};

const IDLE_RESULT = {
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
};

function makeQuery(overrides: Record<string, unknown> = {}) {
  return { ...IDLE_RESULT, ...overrides } as never;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BadgeVerifierPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tanstack.useQuery).mockReturnValue(makeQuery());
  });

  it('always shows "Badge Verification" heading', () => {
    render(<BadgeVerifierPage />);
    expect(
      screen.getByRole('heading', { name: /badge verification/i })
    ).toBeInTheDocument();
  });

  it('shows the assertion ID from URL params', () => {
    render(<BadgeVerifierPage />);
    expect(screen.getByText('assert-abc123')).toBeInTheDocument();
  });

  it('shows loading indicator while verifying', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({ isLoading: true })
    );
    render(<BadgeVerifierPage />);
    expect(screen.getByText(/verifying credential/i)).toBeInTheDocument();
  });

  it('shows network error message when query errors', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(makeQuery({ isError: true }));
    render(<BadgeVerifierPage />);
    expect(
      screen.getByText(/unable to verify.*network error/i)
    ).toBeInTheDocument();
  });

  it('shows "Valid Credential" badge for a valid result', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({
        data: {
          verifyBadge: { valid: true, error: null, assertion: MOCK_ASSERTION },
        },
      })
    );
    render(<BadgeVerifierPage />);
    expect(screen.getByText('Valid Credential')).toBeInTheDocument();
  });

  it('shows badge name and description for valid assertion', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({
        data: {
          verifyBadge: { valid: true, error: null, assertion: MOCK_ASSERTION },
        },
      })
    );
    render(<BadgeVerifierPage />);
    expect(screen.getByText('First Login')).toBeInTheDocument();
    expect(
      screen.getByText('Logged in for the first time')
    ).toBeInTheDocument();
  });

  it('shows "Invalid Credential" for an invalid result', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({
        data: {
          verifyBadge: { valid: false, error: 'Revoked', assertion: null },
        },
      })
    );
    render(<BadgeVerifierPage />);
    expect(screen.getByText('Revoked')).toBeInTheDocument();
  });

  it('shows "Invalid Credential" fallback when no error message', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({
        data: { verifyBadge: { valid: false, error: null, assertion: null } },
      })
    );
    render(<BadgeVerifierPage />);
    expect(screen.getByText('Invalid Credential')).toBeInTheDocument();
  });

  it('shows anonymized recipient ID', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({
        data: {
          verifyBadge: { valid: true, error: null, assertion: MOCK_ASSERTION },
        },
      })
    );
    render(<BadgeVerifierPage />);
    // anonymizeRecipient('user-abc-xyz-1234') = 'user****1234'
    expect(screen.getByText('user****1234')).toBeInTheDocument();
  });

  it('shows "EduSphere Platform" as issuer', () => {
    vi.mocked(tanstack.useQuery).mockReturnValue(
      makeQuery({
        data: {
          verifyBadge: { valid: true, error: null, assertion: MOCK_ASSERTION },
        },
      })
    );
    render(<BadgeVerifierPage />);
    expect(screen.getByText('EduSphere Platform')).toBeInTheDocument();
  });
});
