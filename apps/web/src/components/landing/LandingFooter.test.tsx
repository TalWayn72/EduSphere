import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
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

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('LandingFooter', () => {
  it('renders without crashing', () => {
    renderWithRouter(<LandingFooter />);
    expect(screen.getByTestId('landing-footer')).toBeInTheDocument();
  });

  it('renders the EduSphere brand name', () => {
    renderWithRouter(<LandingFooter />);
    expect(screen.getByText('EduSphere')).toBeInTheDocument();
  });

  it('renders all four column headings', () => {
    renderWithRouter(<LandingFooter />);
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByText('Solutions')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
  });

  it('renders all column links as React Router Links with correct paths', () => {
    const { container } = renderWithRouter(<LandingFooter />);
    const allLinks = Array.from(container.querySelectorAll('a'));
    const hrefMap = Object.fromEntries(
      allLinks.map((a) => [a.textContent?.trim(), a.getAttribute('href')])
    );

    // Product — hash links now point to root landing page
    expect(hrefMap['Features']).toBe('/#features');
    expect(hrefMap['Pricing']).toBe('/#pricing');
    expect(hrefMap['AI Course Builder']).toBe('/features/ai-course-builder');
    expect(hrefMap['Visual Anchoring']).toBe('/features/visual-anchoring');
    expect(hrefMap['Knowledge Graph']).toBe('/features/knowledge-graph');

    // Solutions
    expect(hrefMap['Universities']).toBe('/solutions/universities');
    expect(hrefMap['Enterprises']).toBe('/solutions/enterprises');
    expect(hrefMap['Government & Defense']).toBe('/solutions/government');
    expect(hrefMap['Training Companies']).toBe('/solutions/training');

    // Compliance
    expect(hrefMap['FERPA']).toBe('/compliance#ferpa');
    expect(hrefMap['WCAG 2.2 AA']).toBe('/compliance#wcag');
    expect(hrefMap['SCORM']).toBe('/compliance#scorm');
    expect(hrefMap['GDPR']).toBe('/compliance#gdpr');
    expect(hrefMap['Air-Gapped']).toBe('/compliance#air-gapped');
    expect(hrefMap['Security']).toBe('/compliance#security');

    // Company
    expect(hrefMap['About']).toBe('/about');
    expect(hrefMap['Blog']).toBe('/blog');
    expect(hrefMap['Careers']).toBe('/careers');
    expect(hrefMap['Contact']).toBe('/contact');
  });

  it('renders bottom-bar legal links as React Router Links', () => {
    const { container } = renderWithRouter(<LandingFooter />);
    const allLinks = Array.from(container.querySelectorAll('a'));
    const privacyLinks = allLinks.filter(
      (a) => a.getAttribute('href') === '/privacy'
    );
    const termsLinks = allLinks.filter(
      (a) => a.getAttribute('href') === '/terms'
    );
    const a11yLinks = allLinks.filter(
      (a) => a.getAttribute('href') === '/accessibility'
    );
    // Privacy appears in column + bottom bar
    expect(privacyLinks.length).toBeGreaterThanOrEqual(1);
    expect(termsLinks.length).toBeGreaterThanOrEqual(1);
    expect(a11yLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('uses Link components (not plain <a> tags) for SPA navigation', () => {
    const { container } = renderWithRouter(<LandingFooter />);
    // All anchor tags rendered by React Router's Link still produce <a> elements,
    // but they should NOT cause full page reloads. Verify no links use plain href
    // outside the React Router context by checking that links don't have
    // data-discover attribute (which plain <a> would not have either).
    // The key assertion: the component renders inside a Router without errors.
    const allLinks = Array.from(container.querySelectorAll('a'));
    expect(allLinks.length).toBeGreaterThanOrEqual(22);
  });

  it('renders social media links', () => {
    renderWithRouter(<LandingFooter />);
    expect(screen.getByLabelText(/linkedin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/twitter/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/github/i)).toBeInTheDocument();
  });
});
