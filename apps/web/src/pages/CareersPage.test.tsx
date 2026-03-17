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

vi.mock('@/components/seo', () => ({
  PageMeta: () => null,
}));

vi.mock('@/components/PublicLayout', () => ({
  PublicLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="public-layout">{children}</div>,
}));

import { CareersPage } from './CareersPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <CareersPage />
    </MemoryRouter>
  );
}

describe('CareersPage', () => {
  it('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('careers-page')).toBeInTheDocument();
  });

  it('has a main h1 heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Join Our Team'
    );
  });

  it('renders benefits section', () => {
    renderPage();
    expect(screen.getByText('Why EduSphere?')).toBeInTheDocument();
    expect(screen.getByText('Remote-first')).toBeInTheDocument();
    expect(screen.getByText('Learning budget')).toBeInTheDocument();
    expect(screen.getByText('Stock options')).toBeInTheDocument();
  });

  it('renders all five open positions', () => {
    renderPage();
    expect(screen.getByText('Senior Full-Stack Engineer')).toBeInTheDocument();
    expect(screen.getByText('AI/ML Engineer')).toBeInTheDocument();
    expect(screen.getByText('Product Designer')).toBeInTheDocument();
    expect(screen.getByText('DevOps Engineer')).toBeInTheDocument();
    expect(screen.getByText('Solutions Engineer')).toBeInTheDocument();
  });

  it('contains a careers contact email link', () => {
    renderPage();
    const emailLink = screen
      .getAllByRole('link')
      .find((l) => l.getAttribute('href') === 'mailto:careers@edusphere.dev');
    expect(emailLink).toBeTruthy();
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
