import React from 'react';
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

// Mock SEO and footer components — they have their own tests
vi.mock('@/components/seo', () => ({
  PageMeta: () => null,
}));

vi.mock('@/components/PublicLayout', () => ({
  PublicLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="public-layout">{children}</div>,
}));

// Import after mocks
import { AboutPage } from './AboutPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <AboutPage />
    </MemoryRouter>
  );
}

describe('AboutPage', () => {
  it('renders without crashing', () => {
    const { container } = renderPage();
    expect(container.firstChild).toBeTruthy();
  });

  it('has a main h1 heading', () => {
    renderPage();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('About EduSphere');
  });

  it('renders mission, team, and values sections', () => {
    renderPage();
    expect(screen.getByText('Our Mission')).toBeInTheDocument();
    expect(screen.getByText('Leadership Team')).toBeInTheDocument();
    expect(screen.getByText('Our Values')).toBeInTheDocument();
  });

  it('renders all four team members', () => {
    renderPage();
    expect(screen.getByText('Sarah Cohen')).toBeInTheDocument();
    expect(screen.getByText('David Levy')).toBeInTheDocument();
    expect(screen.getByText('Maya Rosen')).toBeInTheDocument();
    expect(screen.getByText('Amit Shapira')).toBeInTheDocument();
  });

  it('renders inside PublicLayout wrapper', () => {
    renderPage();
    expect(screen.getByTestId('public-layout')).toBeInTheDocument();
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
