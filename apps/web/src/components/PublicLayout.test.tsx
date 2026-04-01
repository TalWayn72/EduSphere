import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

// Mock lucide-react icons
vi.mock(
  'lucide-react',
  () =>
    new Proxy({} as Record<string, unknown>, {
      get: (_, name) => {
        if (name === '__esModule') return true;
        return function MockIcon(props: Record<string, unknown>) {
          return <span data-testid={`icon-${String(name)}`} {...props} />;
        };
      },
    })
);

// Mock child components — they have their own tests
vi.mock('@/components/PublicNav', () => ({
  PublicNav: (props: Record<string, unknown>) => (
    <nav data-testid="public-nav" data-variant={props.variant ?? 'full'} />
  ),
}));

vi.mock('@/components/landing/LandingFooter', () => ({
  LandingFooter: () => <footer data-testid="landing-footer" />,
}));

// Import after mocks
import { PublicLayout } from './PublicLayout';

function renderLayout(props: Record<string, unknown> = {}) {
  const { children = <p>Test content</p>, ...rest } = props;
  return render(
    <MemoryRouter>
      <PublicLayout {...rest}>{children as React.ReactNode}</PublicLayout>
    </MemoryRouter>
  );
}

describe('PublicLayout', () => {
  it('renders children content', () => {
    renderLayout({ children: <p>Hello World</p> });
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('renders PublicNav component', () => {
    renderLayout();
    expect(screen.getByTestId('public-nav')).toBeInTheDocument();
  });

  it('renders LandingFooter by default', () => {
    renderLayout();
    expect(screen.getByTestId('landing-footer')).toBeInTheDocument();
  });

  it('hides footer when showFooter={false}', () => {
    renderLayout({ showFooter: false });
    expect(screen.queryByTestId('landing-footer')).not.toBeInTheDocument();
  });

  it('has skip-to-content link', () => {
    renderLayout();
    const skipLink = screen.getByText(/skip to/i);
    expect(skipLink).toBeInTheDocument();
  });

  it('skip-to-content link targets #main-content', () => {
    renderLayout();
    const skipLink = screen.getByText(/skip to/i);
    expect(skipLink.closest('a')).toHaveAttribute('href', '#main-content');
  });

  it('main element has id="main-content"', () => {
    renderLayout();
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
  });

  it('has data-testid="public-layout"', () => {
    renderLayout();
    expect(screen.getByTestId('public-layout')).toBeInTheDocument();
  });

  it('passes navVariant to PublicNav', () => {
    renderLayout({ navVariant: 'minimal' });
    const nav = screen.getByTestId('public-nav');
    expect(nav).toHaveAttribute('data-variant', 'minimal');
  });

  it('passes full navVariant to PublicNav by default', () => {
    renderLayout();
    const nav = screen.getByTestId('public-nav');
    expect(nav).toHaveAttribute('data-variant', 'full');
  });
});
