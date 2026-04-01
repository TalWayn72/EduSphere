import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import { SectionHeader } from './SectionHeader';

describe('SectionHeader', () => {
  it('renders title', () => {
    render(<SectionHeader title="Settings" />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders h2 by default', () => {
    render(<SectionHeader title="Settings" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Settings'
    );
  });

  it('renders h3 when level=h3', () => {
    render(<SectionHeader title="Sub" level="h3" />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Sub');
  });

  it('renders description when provided', () => {
    render(<SectionHeader title="T" description="Some desc" />);
    expect(screen.getByText('Some desc')).toBeInTheDocument();
  });

  it('renders actions slot', () => {
    render(
      <SectionHeader
        title="T"
        actions={<button data-testid="action">Go</button>}
      />
    );
    expect(screen.getByTestId('action')).toBeInTheDocument();
  });

  it('generates id from title', () => {
    render(<SectionHeader title="My Settings" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute(
      'id',
      'my-settings'
    );
  });

  it('uses custom id', () => {
    render(<SectionHeader title="T" id="custom-id" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute(
      'id',
      'custom-id'
    );
  });

  it('applies custom className', () => {
    const { container } = render(<SectionHeader title="T" className="extra" />);
    expect(container.firstElementChild?.className).toContain('extra');
  });
});
