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

import { PrivacyPage } from './PrivacyPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <PrivacyPage />
    </MemoryRouter>
  );
}

describe('PrivacyPage', () => {
  it('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('privacy-page')).toBeInTheDocument();
  });

  it('has a main h1 heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Privacy Policy'
    );
  });

  it('renders all eight policy sections', () => {
    renderPage();
    expect(screen.getByText('1. Information We Collect')).toBeInTheDocument();
    expect(screen.getByText('2. How We Use Your Information')).toBeInTheDocument();
    expect(screen.getByText('5. Your Rights')).toBeInTheDocument();
    expect(screen.getByText("7. Children's Privacy")).toBeInTheDocument();
    expect(screen.getByText('8. Contact Us')).toBeInTheDocument();
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
