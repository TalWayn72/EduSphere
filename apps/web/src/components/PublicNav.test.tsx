import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

// Mock lucide-react icons
vi.mock('lucide-react', () =>
  new Proxy({} as Record<string, unknown>, {
    get: (_, name) => {
      if (name === '__esModule') return true;
      return function MockIcon(props: Record<string, unknown>) {
        return <span data-testid={`icon-${String(name)}`} {...props} />;
      };
    },
  })
);

// Mock Logo — it has its own tests
vi.mock('@/components/Logo', () => ({
  Logo: (props: Record<string, unknown>) => (
    <div data-testid="logo" {...props}>
      EduSphere
    </div>
  ),
}));

// Import after mocks
import { PublicNav } from './PublicNav';

function renderNav(props: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter>
      <PublicNav {...props} />
    </MemoryRouter>
  );
}

describe('PublicNav', () => {
  it('renders with data-testid="public-nav"', () => {
    renderNav();
    expect(screen.getByTestId('public-nav')).toBeInTheDocument();
  });

  describe('full variant (default)', () => {
    it('shows Features link', () => {
      renderNav();
      expect(screen.getByText('Features')).toBeInTheDocument();
    });

    it('shows Pricing link', () => {
      renderNav();
      expect(screen.getByText('Pricing')).toBeInTheDocument();
    });

    it('shows Compliance link', () => {
      renderNav();
      expect(screen.getByText('Compliance')).toBeInTheDocument();
    });

    it('shows Pilot link', () => {
      renderNav();
      expect(screen.getByText('Pilot')).toBeInTheDocument();
    });

    it('shows "Log In" button', () => {
      renderNav();
      expect(screen.getByText('Log In')).toBeInTheDocument();
    });

    it('shows "Start Free Pilot" button', () => {
      renderNav();
      expect(screen.getByText('Start Free Pilot')).toBeInTheDocument();
    });
  });

  describe('minimal variant', () => {
    it('shows Logo', () => {
      renderNav({ variant: 'minimal' });
      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('shows "Log In" button', () => {
      renderNav({ variant: 'minimal' });
      expect(screen.getByText('Log In')).toBeInTheDocument();
    });

    it('does NOT show Features link', () => {
      renderNav({ variant: 'minimal' });
      expect(screen.queryByText('Features')).not.toBeInTheDocument();
    });

    it('does NOT show Pricing link', () => {
      renderNav({ variant: 'minimal' });
      expect(screen.queryByText('Pricing')).not.toBeInTheDocument();
    });

    it('does NOT show Compliance link', () => {
      renderNav({ variant: 'minimal' });
      expect(screen.queryByText('Compliance')).not.toBeInTheDocument();
    });
  });

  it('renders Logo component inside nav', () => {
    renderNav();
    const nav = screen.getByTestId('public-nav');
    expect(within(nav).getByTestId('logo')).toBeInTheDocument();
  });

  it('has proper sticky positioning class', () => {
    renderNav();
    const nav = screen.getByTestId('public-nav');
    // PublicNav should be sticky or fixed at the top
    expect(
      nav.className.includes('sticky') || nav.className.includes('fixed')
    ).toBe(true);
  });

  it('renders mobile hamburger menu button', () => {
    renderNav();
    // The hamburger button should exist in the DOM (visible on small screens)
    const menuButton = screen.getByRole('button', { name: /menu/i });
    expect(menuButton).toBeInTheDocument();
  });
});
