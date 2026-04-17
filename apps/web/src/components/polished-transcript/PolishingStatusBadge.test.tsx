/**
 * Unit tests for PolishingStatusBadge.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'polishedTranscript.processing': `AI polishing... ${opts?.progress ?? 0}%`,
        'polishedTranscript.status.draft': 'Draft',
        'polishedTranscript.status.approved': 'Approved',
        'polishedTranscript.status.published': 'Published',
        'polishedTranscript.status.processing': 'Processing',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
    className,
    'data-testid': testId,
  }: {
    children: React.ReactNode;
    variant?: string;
    className?: string;
    'data-testid'?: string;
  }) => (
    <span
      data-testid={testId ?? 'badge'}
      data-variant={variant}
      className={className}
    >
      {children}
    </span>
  ),
}));

import { PolishingStatusBadge } from './PolishingStatusBadge';

describe('PolishingStatusBadge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders processing state with spinner', () => {
    render(<PolishingStatusBadge status="PROCESSING" progress={42} />);
    expect(screen.getByTestId('polishing-status-badge')).toBeInTheDocument();
    expect(screen.getByText('AI polishing... 42%')).toBeInTheDocument();
  });

  it('renders DRAFT badge', () => {
    render(<PolishingStatusBadge status="DRAFT" />);
    expect(screen.getByTestId('polishing-status-badge')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders APPROVED badge', () => {
    render(<PolishingStatusBadge status="APPROVED" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('renders PUBLISHED badge', () => {
    render(<PolishingStatusBadge status="PUBLISHED" />);
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('processing badge has aria-live="polite"', () => {
    render(<PolishingStatusBadge status="PROCESSING" progress={10} />);
    const el = screen.getByTestId('polishing-status-badge');
    expect(el).toHaveAttribute('aria-live', 'polite');
  });

  it('defaults progress to 0 when undefined', () => {
    render(<PolishingStatusBadge status="PROCESSING" />);
    expect(screen.getByText('AI polishing... 0%')).toBeInTheDocument();
  });
});
