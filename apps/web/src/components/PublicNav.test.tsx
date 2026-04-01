import { render, screen, within } from '@testing-library/react';
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

function renderNav(
  props: Record<string, unknown> = {},
  initialEntries = ['/']
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
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

  describe('anchor link routing (landing vs non-landing)', () => {
    const anchorHashes = ['#features', '#pricing', '#compliance', '#pilot-cta'];

    describe.each(['/', '/landing'])('on landing page (%s)', (route) => {
      it('desktop anchor links use hash-only hrefs', () => {
        renderNav({}, [route]);
        const nav = screen.getByTestId('public-nav');
        // Desktop nav links (hidden on mobile, but in DOM)
        for (const hash of anchorHashes) {
          const links = nav.querySelectorAll<HTMLAnchorElement>(
            `a[href="${hash}"]`
          );
          expect(links.length).toBeGreaterThanOrEqual(1);
        }
      });

      it('does NOT prefix anchor links with /landing', () => {
        renderNav({}, [route]);
        const nav = screen.getByTestId('public-nav');
        for (const hash of anchorHashes) {
          const prefixed = nav.querySelectorAll(`a[href="/landing${hash}"]`);
          expect(prefixed.length).toBe(0);
        }
      });
    });

    describe.each(['/about', '/faq', '/contact'])(
      'on non-landing page (%s)',
      (route) => {
        it('desktop anchor links are prefixed with /landing', () => {
          renderNav({}, [route]);
          const nav = screen.getByTestId('public-nav');
          for (const hash of anchorHashes) {
            const links = nav.querySelectorAll<HTMLAnchorElement>(
              `a[href="/landing${hash}"]`
            );
            expect(links.length).toBeGreaterThanOrEqual(1);
          }
        });

        it('does NOT use hash-only hrefs for anchor links', () => {
          renderNav({}, [route]);
          const nav = screen.getByTestId('public-nav');
          for (const hash of anchorHashes) {
            const hashOnly = nav.querySelectorAll<HTMLAnchorElement>(
              `a[href="${hash}"]`
            );
            expect(hashOnly.length).toBe(0);
          }
        });
      }
    );

    it('Compliance link uses anchor hash, not a separate route (BUG-070 regression)', () => {
      // On landing page — should be #compliance
      const { unmount } = renderNav({}, ['/']);
      const complianceOnLanding = screen.getByText('Compliance').closest('a');
      expect(complianceOnLanding).toHaveAttribute('href', '#compliance');
      unmount();

      // On non-landing page — should be /landing#compliance
      renderNav({}, ['/about']);
      const complianceOnAbout = screen.getByText('Compliance').closest('a');
      expect(complianceOnAbout).toHaveAttribute('href', '/landing#compliance');
    });

    describe('mobile menu anchor links', () => {
      function openMobileMenu(route: string) {
        renderNav({}, [route]);
        const menuBtn = screen.getByRole('button', { name: /menu/i });
        menuBtn.click();
      }

      it('on landing page, mobile anchor links use hash-only hrefs', () => {
        openMobileMenu('/');
        // After menu opens, mobile links appear in the DOM
        const featuresLink = screen.getAllByText('Features');
        // At least one should have href="#features" (mobile)
        const hrefs = featuresLink.map((el) =>
          el.closest('a')?.getAttribute('href')
        );
        expect(hrefs).toContain('#features');
      });

      it('on non-landing page, mobile anchor links are prefixed with /landing', () => {
        openMobileMenu('/about');
        const featuresLink = screen.getAllByText('Features');
        const hrefs = featuresLink.map((el) =>
          el.closest('a')?.getAttribute('href')
        );
        expect(hrefs).toContain('/landing#features');
        expect(hrefs).not.toContain('#features');
      });

      it('mobile "Free Pilot" button links correctly on non-landing page', () => {
        openMobileMenu('/faq');
        const pilotBtn = screen.getByText('Free Pilot').closest('a');
        expect(pilotBtn).toHaveAttribute('href', '/landing#pilot-cta');
      });

      it('mobile "Free Pilot" button links correctly on landing page', () => {
        openMobileMenu('/landing');
        const pilotBtn = screen.getByText('Free Pilot').closest('a');
        expect(pilotBtn).toHaveAttribute('href', '#pilot-cta');
      });
    });

    it('"Start Free Pilot" desktop button has correct href on non-landing page', () => {
      renderNav({}, ['/about']);
      const btn = screen.getByText('Start Free Pilot').closest('a');
      expect(btn).toHaveAttribute('href', '/landing#pilot-cta');
    });

    it('"Start Free Pilot" desktop button has hash-only href on landing page', () => {
      renderNav({}, ['/']);
      const btn = screen.getByText('Start Free Pilot').closest('a');
      expect(btn).toHaveAttribute('href', '#pilot-cta');
    });
  });

  describe('BUG-070: all nav tabs use consistent <a> elements', () => {
    const tabLabels = ['Features', 'Pricing', 'Compliance', 'Pilot'];

    it('all 4 desktop tabs render as <a> elements (not React Router Link)', () => {
      renderNav({}, ['/']);
      screen.getByTestId('public-nav');
      // Desktop nav is the hidden md:flex div — get all links inside nav
      for (const label of tabLabels) {
        const el = screen.getByText(label);
        const anchor = el.closest('a');
        expect(anchor).not.toBeNull();
        // Verify it is a plain <a> with hash href, not a React Router Link (which would have href="/...")
        expect(anchor?.getAttribute('href')).toMatch(/^(#|\/landing#)/);
      }
    });

    it('all 4 mobile tabs render as <a> elements after opening menu', () => {
      renderNav({}, ['/']);
      const menuBtn = screen.getByRole('button', { name: /menu/i });
      menuBtn.click();

      for (const label of tabLabels) {
        // getAllByText because label appears in both desktop and mobile
        const elements = screen.getAllByText(label);
        for (const el of elements) {
          const anchor = el.closest('a');
          expect(anchor).not.toBeNull();
          expect(anchor?.getAttribute('href')).toMatch(/^(#|\/landing#)/);
        }
      }
    });

    it('Compliance tab should NOT use React Router Link (regression guard)', () => {
      renderNav({}, ['/']);
      const complianceEl = screen.getByText('Compliance');
      const anchor = complianceEl.closest('a');
      // React Router Link to="/compliance" renders href="/compliance" (no hash)
      // After BUG-070 fix, it should be "#compliance" or "/landing#compliance"
      expect(anchor?.getAttribute('href')).not.toBe('/compliance');
      expect(anchor?.getAttribute('href')).toContain('#compliance');
    });

    it('mobile menu includes Pilot tab (was missing before BUG-070)', () => {
      renderNav({}, ['/']);
      const menuBtn = screen.getByRole('button', { name: /menu/i });
      menuBtn.click();

      const pilotElements = screen.getAllByText('Pilot');
      // Should appear at least twice: desktop + mobile
      expect(pilotElements.length).toBeGreaterThanOrEqual(2);
      // Mobile pilot link should have anchor href
      const mobileHrefs = pilotElements.map((el) =>
        el.closest('a')?.getAttribute('href')
      );
      expect(mobileHrefs).toContain('#pilot-cta');
    });
  });
});
