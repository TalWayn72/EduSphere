import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PageShell } from '../PageShell';

describe('PageShell', () => {
  it('renders children', () => {
    render(<PageShell><p>Hello</p></PageShell>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('defaults to data-testid "page-shell"', () => {
    render(<PageShell>content</PageShell>);
    expect(screen.getByTestId('page-shell')).toBeInTheDocument();
  });

  it('default size is md (max-w-4xl)', () => {
    render(<PageShell>content</PageShell>);
    const el = screen.getByTestId('page-shell');
    expect(el.className).toContain('max-w-4xl');
  });

  it.each([
    ['sm', 'max-w-2xl'],
    ['md', 'max-w-4xl'],
    ['lg', 'max-w-5xl'],
    ['xl', 'max-w-6xl'],
    ['2xl', 'max-w-7xl'],
  ] as const)('size="%s" applies %s class', (size, expected) => {
    render(<PageShell size={size}>content</PageShell>);
    const el = screen.getByTestId('page-shell');
    expect(el.className).toContain(expected);
  });

  it('size="full" has no max-width class but still has spacing', () => {
    render(<PageShell size="full">content</PageShell>);
    const el = screen.getByTestId('page-shell');
    expect(el.className).not.toMatch(/max-w-/);
    expect(el.className).toContain('space-y-6');
  });

  it('size="full" does not add mx-auto or padding', () => {
    render(<PageShell size="full">content</PageShell>);
    const el = screen.getByTestId('page-shell');
    expect(el.className).not.toContain('mx-auto');
    expect(el.className).not.toContain('px-4');
  });

  it.each([
    ['compact', 'space-y-4'],
    ['normal', 'space-y-6'],
    ['relaxed', 'space-y-8'],
  ] as const)('spacing="%s" applies %s class', (spacing, expected) => {
    render(<PageShell spacing={spacing}>content</PageShell>);
    const el = screen.getByTestId('page-shell');
    expect(el.className).toContain(expected);
  });

  it('applies custom className', () => {
    render(<PageShell className="bg-red-500">content</PageShell>);
    const el = screen.getByTestId('page-shell');
    expect(el.className).toContain('bg-red-500');
  });

  it('accepts custom data-testid', () => {
    render(<PageShell data-testid="custom-shell">content</PageShell>);
    expect(screen.getByTestId('custom-shell')).toBeInTheDocument();
  });
});
