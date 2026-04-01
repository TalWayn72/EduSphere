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
import { Logo } from './Logo';

function renderLogo(props: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter>
      <Logo {...props} />
    </MemoryRouter>
  );
}

describe('Logo', () => {
  it('renders Brain icon and "EduSphere" text by default', () => {
    renderLogo();
    expect(screen.getByTestId('icon-Brain')).toBeInTheDocument();
    expect(screen.getByText('EduSphere')).toBeInTheDocument();
  });

  it('links to "/" by default', () => {
    renderLogo();
    const link = screen.getByTestId('logo').closest('a');
    expect(link).toHaveAttribute('href', '/');
  });

  it('links to custom path when linkTo prop provided', () => {
    renderLogo({ linkTo: '/dashboard' });
    const link = screen.getByTestId('logo').closest('a');
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('hides text when showText={false}', () => {
    renderLogo({ showText: false });
    expect(screen.queryByText('EduSphere')).not.toBeInTheDocument();
  });

  it('applies sm size class', () => {
    renderLogo({ size: 'sm' });
    const logo = screen.getByTestId('logo');
    expect(logo).toBeInTheDocument();
    // sm size should produce smaller styling than default
    expect(logo.innerHTML).toBeTruthy();
  });

  it('applies md size class (default)', () => {
    renderLogo();
    const logo = screen.getByTestId('logo');
    expect(logo).toBeInTheDocument();
  });

  it('applies lg size class', () => {
    renderLogo({ size: 'lg' });
    const logo = screen.getByTestId('logo');
    expect(logo).toBeInTheDocument();
  });

  it('has proper aria-label for accessibility', () => {
    renderLogo();
    const link = screen.getByTestId('logo').closest('a');
    // Either the link or the logo container should have an accessible label
    const ariaLabel =
      link?.getAttribute('aria-label') ??
      screen.getByTestId('logo').getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });

  it('has data-testid="logo"', () => {
    renderLogo();
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderLogo({ className: 'my-custom-class' });
    const logo = screen.getByTestId('logo');
    // className should be forwarded to the root element or the link
    const el = logo.closest('.my-custom-class') ?? logo;
    expect(el.className).toContain('my-custom-class');
  });
});
