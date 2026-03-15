import { render, screen } from '@testing-library/react';
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

vi.mock('@/components/seo', () => ({
  PageMeta: () => null,
}));

vi.mock('@/components/landing/LandingFooter', () => ({
  LandingFooter: () => <footer data-testid="landing-footer" />,
}));

import { SolutionsPage } from './SolutionsPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <SolutionsPage />
    </MemoryRouter>
  );
}

describe('SolutionsPage', () => {
  it('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('solutions-page')).toBeInTheDocument();
  });

  it('has a main h1 heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Solutions for Every Sector'
    );
  });

  it('renders all four solution cards', () => {
    renderPage();
    expect(screen.getByText('Universities')).toBeInTheDocument();
    expect(screen.getByText('Enterprises')).toBeInTheDocument();
    expect(screen.getByText('Government & Defense')).toBeInTheDocument();
    expect(screen.getByText('Training Companies')).toBeInTheDocument();
  });

  it('renders feature bullet points for each solution', () => {
    renderPage();
    // Universities features
    expect(screen.getByText('AI tutoring & Socratic debate')).toBeInTheDocument();
    // Enterprises features
    expect(screen.getByText('Custom branding & SSO')).toBeInTheDocument();
    // Government features
    expect(screen.getByText('Air-gapped deployment option')).toBeInTheDocument();
    // Training companies features
    expect(screen.getByText('SCORM / xAPI export')).toBeInTheDocument();
  });

  it('renders Start a Pilot links for each solution card', () => {
    renderPage();
    const pilotLinks = screen.getAllByRole('link', { name: 'Start a Pilot' });
    expect(pilotLinks).toHaveLength(4);
    pilotLinks.forEach((link) => {
      expect(link.getAttribute('href')).toBe('/#pilot-cta');
    });
  });

  it('has no raw i18n keys visible', () => {
    const { container } = renderPage();
    const text = container.textContent ?? '';
    const i18nKeyPattern = /\b[a-z]+\.[a-z]+\.[a-z]+\b/g;
    const matches = text.match(i18nKeyPattern) ?? [];
    const realKeys = matches.filter(
      (m) =>
        !m.includes('.com') &&
        !m.includes('.org') &&
        !m.includes('.dev') &&
        !m.includes('.io')
    );
    expect(realKeys).toHaveLength(0);
  });
});
