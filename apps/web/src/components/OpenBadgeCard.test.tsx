import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { OpenBadgeCard, type OpenBadgeAssertionProps } from './OpenBadgeCard';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_ASSERTION: OpenBadgeAssertionProps = {
  id: 'assert-1',
  badgeDefinitionId: 'badge-def-1',
  badgeName: 'JavaScript Expert',
  badgeDescription: 'Mastery of modern JavaScript fundamentals',
  issuedAt: '2024-03-01T00:00:00Z',
  expiresAt: null,
  evidenceUrl: null,
  revoked: false,
  verifyUrl: 'https://verify.example.com/assert-1',
  shareUrl: 'https://linkedin.com/share?badge=assert-1',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OpenBadgeCard', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the badge name', () => {
    render(<OpenBadgeCard assertion={VALID_ASSERTION} />);
    expect(screen.getByText('JavaScript Expert')).toBeInTheDocument();
  });

  it('renders the badge description', () => {
    render(<OpenBadgeCard assertion={VALID_ASSERTION} />);
    expect(
      screen.getByText('Mastery of modern JavaScript fundamentals')
    ).toBeInTheDocument();
  });

  it('shows "Valid" badge for a non-revoked, non-expired assertion', () => {
    render(<OpenBadgeCard assertion={VALID_ASSERTION} />);
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('shows "Revoked" badge when revoked is true', () => {
    render(
      <OpenBadgeCard assertion={{ ...VALID_ASSERTION, revoked: true }} />
    );
    expect(screen.getByText('Revoked')).toBeInTheDocument();
  });

  it('shows "Expired" badge when expiresAt is in the past', () => {
    render(
      <OpenBadgeCard
        assertion={{ ...VALID_ASSERTION, expiresAt: '2020-01-01T00:00:00Z' }}
      />
    );
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('shows issued date', () => {
    render(<OpenBadgeCard assertion={VALID_ASSERTION} />);
    // Matches "Issued <date>" pattern
    expect(screen.getByText(/issued/i)).toBeInTheDocument();
  });

  it('shows expiry date when expiresAt is set', () => {
    render(
      <OpenBadgeCard
        assertion={{ ...VALID_ASSERTION, expiresAt: '2030-12-31T00:00:00Z' }}
      />
    );
    expect(screen.getByText(/expires/i)).toBeInTheDocument();
  });

  it('renders "Verify" button', () => {
    render(<OpenBadgeCard assertion={VALID_ASSERTION} />);
    expect(
      screen.getByRole('button', { name: /verify badge/i })
    ).toBeInTheDocument();
  });

  it('renders "Share to LinkedIn" button for valid assertion', () => {
    render(<OpenBadgeCard assertion={VALID_ASSERTION} />);
    expect(
      screen.getByRole('button', { name: /share.*linkedin/i })
    ).toBeInTheDocument();
  });

  it('does NOT render "Share to LinkedIn" for revoked assertion', () => {
    render(
      <OpenBadgeCard assertion={{ ...VALID_ASSERTION, revoked: true }} />
    );
    expect(
      screen.queryByRole('button', { name: /share.*linkedin/i })
    ).not.toBeInTheDocument();
  });

  it('does NOT render "Share to LinkedIn" for expired assertion', () => {
    render(
      <OpenBadgeCard
        assertion={{ ...VALID_ASSERTION, expiresAt: '2020-01-01T00:00:00Z' }}
      />
    );
    expect(
      screen.queryByRole('button', { name: /share.*linkedin/i })
    ).not.toBeInTheDocument();
  });

  it('renders "Evidence" button when evidenceUrl is provided', () => {
    render(
      <OpenBadgeCard
        assertion={{ ...VALID_ASSERTION, evidenceUrl: 'https://evidence.example.com' }}
      />
    );
    expect(
      screen.getByRole('button', { name: /view evidence/i })
    ).toBeInTheDocument();
  });

  it('does NOT render "Evidence" button when evidenceUrl is null', () => {
    render(<OpenBadgeCard assertion={VALID_ASSERTION} />);
    expect(
      screen.queryByRole('button', { name: /evidence/i })
    ).not.toBeInTheDocument();
  });

  it('clicking Verify opens verifyUrl in a new tab', () => {
    render(<OpenBadgeCard assertion={VALID_ASSERTION} />);
    fireEvent.click(screen.getByRole('button', { name: /verify badge/i }));
    expect(window.open).toHaveBeenCalledWith(
      'https://verify.example.com/assert-1',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('clicking Share to LinkedIn opens shareUrl in a new tab', () => {
    render(<OpenBadgeCard assertion={VALID_ASSERTION} />);
    fireEvent.click(screen.getByRole('button', { name: /share.*linkedin/i }));
    expect(window.open).toHaveBeenCalledWith(
      'https://linkedin.com/share?badge=assert-1',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
