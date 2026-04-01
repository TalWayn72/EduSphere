import { render, screen } from '@testing-library/react';
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

// Import after mocks
import { AuthFooter } from './AuthFooter';

function renderFooter() {
  return render(
    <MemoryRouter>
      <AuthFooter />
    </MemoryRouter>
  );
}

describe('AuthFooter', () => {
  it('renders copyright text with current year', () => {
    renderFooter();
    const year = new Date().getFullYear().toString();
    const footer = screen.getByTestId('auth-footer');
    expect(footer.textContent).toContain(year);
    expect(footer.textContent).toContain('EduSphere');
  });

  it('renders Privacy link to /privacy', () => {
    renderFooter();
    const privacyLink = screen.getByText('Privacy');
    expect(privacyLink.closest('a')).toHaveAttribute('href', '/privacy');
  });

  it('renders Terms link to /terms', () => {
    renderFooter();
    const termsLink = screen.getByText('Terms');
    expect(termsLink.closest('a')).toHaveAttribute('href', '/terms');
  });

  it('renders Accessibility link to /accessibility', () => {
    renderFooter();
    const a11yLink = screen.getByText('Accessibility');
    expect(a11yLink.closest('a')).toHaveAttribute('href', '/accessibility');
  });

  it('has data-testid="auth-footer"', () => {
    renderFooter();
    expect(screen.getByTestId('auth-footer')).toBeInTheDocument();
  });

  it('has proper footer semantic element', () => {
    renderFooter();
    const footer = screen.getByTestId('auth-footer');
    expect(footer.tagName).toBe('FOOTER');
  });

  it('links use correct href attributes (React Router Link)', () => {
    const { container } = renderFooter();
    const allLinks = Array.from(container.querySelectorAll('a'));
    const hrefMap = Object.fromEntries(
      allLinks.map((a) => [a.textContent?.trim(), a.getAttribute('href')])
    );

    expect(hrefMap['Privacy']).toBe('/privacy');
    expect(hrefMap['Terms']).toBe('/terms');
    expect(hrefMap['Accessibility']).toBe('/accessibility');
  });
});
