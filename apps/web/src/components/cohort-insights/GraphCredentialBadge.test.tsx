import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraphCredentialBadge } from './GraphCredentialBadge';

describe('GraphCredentialBadge', () => {
  it('renders the credential label', () => {
    render(
      <GraphCredentialBadge label="Graph Expert — Algorithms" conceptCount={14} />,
    );
    expect(screen.getByText('Graph Expert — Algorithms')).toBeInTheDocument();
  });

  it('renders concept count with plural label', () => {
    render(
      <GraphCredentialBadge label="Knowledge Master" conceptCount={5} />,
    );
    expect(screen.getByText('5 concepts')).toBeInTheDocument();
    expect(screen.queryByText('5 concept')).not.toBeInTheDocument();
  });

  it('renders concept count with singular label when count is 1', () => {
    render(
      <GraphCredentialBadge label="Intro Badge" conceptCount={1} />,
    );
    expect(screen.getByText('1 concept')).toBeInTheDocument();
    expect(screen.queryByText('1 concepts')).not.toBeInTheDocument();
  });

  it('renders as a span (not a link) when no verifyUrl provided', () => {
    render(
      <GraphCredentialBadge label="No Link Badge" conceptCount={3} />,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /Graph credential: No Link Badge/i }),
    ).toBeInTheDocument();
  });

  it('renders as an anchor with correct href when verifyUrl is provided', () => {
    render(
      <GraphCredentialBadge
        label="Verifiable Badge"
        conceptCount={7}
        verifyUrl="https://example.com/verify/abc123"
      />,
    );
    const link = screen.getByRole('link', { name: /Verify graph credential: Verifiable Badge/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com/verify/abc123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
