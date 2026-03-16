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

import { TermsPage } from './TermsPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <TermsPage />
    </MemoryRouter>
  );
}

describe('TermsPage', () => {
  it('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('terms-page')).toBeInTheDocument();
  });

  it('has a main h1 heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Terms of Service'
    );
  });

  it('renders key policy sections', () => {
    renderPage();
    expect(screen.getByText('1. Acceptance of Terms')).toBeInTheDocument();
    expect(screen.getByText('4. Intellectual Property')).toBeInTheDocument();
    expect(screen.getByText('6. Service Level Agreement')).toBeInTheDocument();
    expect(screen.getByText('9. Contact')).toBeInTheDocument();
  });

  it('contains a legal contact email link', () => {
    renderPage();
    const emailLink = screen
      .getAllByRole('link')
      .find((l) => l.getAttribute('href') === 'mailto:legal@edusphere.dev');
    expect(emailLink).toBeTruthy();
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
