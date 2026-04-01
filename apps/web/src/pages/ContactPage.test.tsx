import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

vi.mock('@/components/seo', () => ({
  PageMeta: () => null,
}));

vi.mock('@/components/PublicLayout', () => ({
  PublicLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="public-layout">{children}</div>
  ),
}));

import { ContactPage } from './ContactPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <ContactPage />
    </MemoryRouter>
  );
}

describe('ContactPage', () => {
  it('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('contact-page')).toBeInTheDocument();
  });

  it('has a main h1 heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Contact Us'
    );
  });

  it('renders contact info cards', () => {
    renderPage();
    expect(screen.getByText('hello@edusphere.dev')).toBeInTheDocument();
    expect(screen.getByText('+1-888-EDU-SPHR')).toBeInTheDocument();
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
  });

  it('renders contact form fields', () => {
    renderPage();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Send Message' })
    ).toBeInTheDocument();
  });

  it('shows success message after form submission', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'General' },
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Hello world' },
    });
    fireEvent.submit(
      screen.getByRole('button', { name: 'Send Message' }).closest('form')!
    );

    expect(
      screen.getByText(/Thank you! We'll be in touch soon./i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Send Message' })
    ).not.toBeInTheDocument();
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
