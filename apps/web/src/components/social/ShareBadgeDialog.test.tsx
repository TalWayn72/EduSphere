import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ShareBadgeDialog } from './ShareBadgeDialog';

vi.mock(
  'lucide-react',
  () =>
    new Proxy(
      {},
      {
        get: (_, name) => {
          if (name === '__esModule') return true;
          return function MockIcon(props: Record<string, unknown>) {
            return <span data-testid={`icon-${String(name)}`} {...props} />;
          };
        },
      }
    )
);

const MOCK_BADGE = {
  name: 'TypeScript Expert',
  description: 'Demonstrated advanced TypeScript skills',
  imageUrl: 'https://example.com/badge.png',
  shareUrl: 'https://example.com/badges/123',
  issuerName: 'EduSphere Academy',
};

describe('ShareBadgeDialog', () => {
  it('renders badge info when open', () => {
    render(
      <ShareBadgeDialog open={true} onOpenChange={vi.fn()} badge={MOCK_BADGE} />
    );
    expect(screen.getByText('TypeScript Expert')).toBeInTheDocument();
    expect(
      screen.getByText('Demonstrated advanced TypeScript skills')
    ).toBeInTheDocument();
    expect(screen.getByText(/EduSphere Academy/)).toBeInTheDocument();
  });

  it('renders badge image when imageUrl provided', () => {
    render(
      <ShareBadgeDialog open={true} onOpenChange={vi.fn()} badge={MOCK_BADGE} />
    );
    const img = screen.getByAltText('TypeScript Expert');
    expect(img).toHaveAttribute('src', 'https://example.com/badge.png');
  });

  it('renders without image when imageUrl not provided', () => {
    const badgeNoImg = { ...MOCK_BADGE, imageUrl: undefined };
    render(
      <ShareBadgeDialog open={true} onOpenChange={vi.fn()} badge={badgeNoImg} />
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders share and download buttons', () => {
    render(
      <ShareBadgeDialog open={true} onOpenChange={vi.fn()} badge={MOCK_BADGE} />
    );
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/download credential/i)).toBeInTheDocument();
  });

  it('download link points to VC JSON URL', () => {
    render(
      <ShareBadgeDialog open={true} onOpenChange={vi.fn()} badge={MOCK_BADGE} />
    );
    const link = screen.getByLabelText(/download credential/i);
    expect(link).toHaveAttribute('href', 'https://example.com/badges/123.json');
  });

  it('does not render content when closed', () => {
    render(
      <ShareBadgeDialog
        open={false}
        onOpenChange={vi.fn()}
        badge={MOCK_BADGE}
      />
    );
    expect(screen.queryByText('TypeScript Expert')).not.toBeInTheDocument();
  });

  it('has dialog title and description for accessibility', () => {
    render(
      <ShareBadgeDialog open={true} onOpenChange={vi.fn()} badge={MOCK_BADGE} />
    );
    expect(screen.getByText('Share Badge')).toBeInTheDocument();
    expect(screen.getByText(/share your achievement/i)).toBeInTheDocument();
  });
});
