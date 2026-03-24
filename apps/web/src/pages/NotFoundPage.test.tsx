import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

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

import { NotFoundPage } from './NotFoundPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>
  );
}

describe('NotFoundPage', () => {
  it('renders the not-found container', () => {
    renderPage();
    expect(screen.getByTestId('not-found-page')).toBeInTheDocument();
  });

  it('displays the "Page Not Found" title', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { level: 1 })
    ).toHaveTextContent('Page Not Found');
  });

  it('displays the description text', () => {
    renderPage();
    expect(
      screen.getByText(/does not exist or has been moved/i)
    ).toBeInTheDocument();
  });

  it('displays the FileQuestion icon', () => {
    renderPage();
    expect(screen.getByTestId('icon-FileQuestion')).toBeInTheDocument();
  });

  it('renders a button that navigates to /dashboard', () => {
    renderPage();
    const btn = screen.getByRole('button', {
      name: /back to dashboard/i,
    });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('has no raw i18n keys visible', () => {
    renderPage();
    const text = document.body.textContent ?? '';
    expect(text).not.toContain('notFound.title');
    expect(text).not.toContain('notFound.description');
  });
});
