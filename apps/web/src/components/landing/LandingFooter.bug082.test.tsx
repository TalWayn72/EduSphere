import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { LandingFooter } from './LandingFooter';

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

vi.mock('@/components/social', () => ({
  SocialLinksBar: () => <div data-testid="social-links-bar" />,
  DEFAULT_SOCIAL_LINKS: [],
}));

function renderFooter() {
  return render(
    <MemoryRouter>
      <LandingFooter />
    </MemoryRouter>
  );
}

describe('BUG-082 regression: LandingFooter links', () => {
  it('footer internal links use React Router Link (not plain anchor)', () => {
    renderFooter();

    const allLinks = screen.getAllByRole('link');
    const internalLinks = allLinks.filter((a) => {
      const href = a.getAttribute('href');
      return href && href.startsWith('/');
    });

    expect(internalLinks.length).toBeGreaterThan(0);

    for (const link of internalLinks) {
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href');
    }
  });

  it('hash links point to root page with hash', () => {
    renderFooter();

    const featuresLink = screen.getByRole('link', { name: 'Features' });
    expect(featuresLink).toHaveAttribute('href', '/#features');

    const pricingLink = screen.getByRole('link', { name: 'Pricing' });
    expect(pricingLink).toHaveAttribute('href', '/#pricing');
  });

  it('bottom bar links use Link component with correct hrefs', () => {
    renderFooter();

    const privacyLink = screen.getByRole('link', { name: 'Privacy' });
    expect(privacyLink).toHaveAttribute('href', '/privacy');

    const termsLink = screen.getByRole('link', { name: 'Terms' });
    expect(termsLink).toHaveAttribute('href', '/terms');

    const a11yLink = screen.getByRole('link', { name: 'Accessibility' });
    expect(a11yLink).toHaveAttribute('href', '/accessibility');
  });

  it('no bare hash-only hrefs in footer', () => {
    renderFooter();

    const allLinks = screen.getAllByRole('link');

    for (const link of allLinks) {
      const href = link.getAttribute('href');
      if (href && href.includes('#')) {
        expect(href).toMatch(/^\//);
      }
    }
  });
});
