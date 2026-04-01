import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import { PageShell } from './PageShell';

describe('PageShell', () => {
  it('renders children', () => {
    render(
      <PageShell>
        <div data-testid="child">Content</div>
      </PageShell>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('uses default data-testid', () => {
    render(<PageShell>Content</PageShell>);
    expect(screen.getByTestId('page-shell')).toBeInTheDocument();
  });

  it('uses custom data-testid', () => {
    render(<PageShell data-testid="custom">Content</PageShell>);
    expect(screen.getByTestId('custom')).toBeInTheDocument();
  });

  it('applies max-w class based on size prop', () => {
    render(<PageShell size="lg">Content</PageShell>);
    expect(screen.getByTestId('page-shell').className).toContain('max-w-5xl');
  });

  it('applies spacing class based on spacing prop', () => {
    render(<PageShell spacing="relaxed">Content</PageShell>);
    expect(screen.getByTestId('page-shell').className).toContain('space-y-8');
  });

  it('full size does not add max-w or padding', () => {
    render(<PageShell size="full">Content</PageShell>);
    const el = screen.getByTestId('page-shell');
    expect(el.className).not.toContain('max-w');
    expect(el.className).not.toContain('mx-auto');
  });

  it('applies custom className', () => {
    render(<PageShell className="extra">Content</PageShell>);
    expect(screen.getByTestId('page-shell').className).toContain('extra');
  });
});
