import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('lucide-react', () =>
  new Proxy(
    {},
    {
      get: (_, name) => {
        if (name === '__esModule') return true;
        return function MockIcon(props: Record<string, unknown>) {
          return <span data-testid={`icon-${String(name)}`} {...props} />;
        };
      },
    },
  ),
);

vi.mock('@/components/PublicLayout', () => ({
  PublicLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="public-layout">{children}</div>,
}));

import { CompliancePage } from './CompliancePage';

function renderPage() {
  return render(
    <MemoryRouter>
      <CompliancePage />
    </MemoryRouter>,
  );
}

describe('CompliancePage', () => {
  it('renders without crashing', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1 }),
    ).toHaveTextContent(/compliance/i);
  });

  it('has all 6 compliance section anchors', () => {
    const { container } = renderPage();
    const expectedIds = ['ferpa', 'wcag', 'scorm', 'gdpr', 'air-gapped', 'security'];
    for (const id of expectedIds) {
      expect(
        container.querySelector(`#${id}`),
        `Missing section anchor: #${id}`,
      ).toBeInTheDocument();
    }
  });

  it('renders FERPA section content', () => {
    renderPage();
    expect(document.body.textContent).toContain('FERPA');
    expect(document.body.textContent).toContain(
      'Family Educational Rights and Privacy Act',
    );
  });

  it('renders WCAG section content', () => {
    renderPage();
    expect(document.body.textContent).toContain('WCAG 2.2 AA');
    expect(document.body.textContent).toContain('keyboard-navigable');
  });

  it('has navigation links back to landing and contact', () => {
    renderPage();
    const contactLink = screen.getByRole('link', { name: /contact sales/i });
    expect(contactLink).toHaveAttribute('href', '/contact');
    const pilotLink = screen.getByRole('link', { name: /start free pilot/i });
    expect(pilotLink).toHaveAttribute('href', '/pilot');
  });

  it('has section navigation pills', () => {
    renderPage();
    const nav = screen.getByRole('navigation', { name: /compliance sections/i });
    expect(nav).toBeInTheDocument();
  });
});
