import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TrustBar } from './TrustBar';

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => {
    if (name === '__esModule') return true;
    return function MockIcon(props: Record<string, unknown>) {
      return <span data-testid={`icon-${String(name)}`} {...props} />;
    };
  },
}));

describe('TrustBar', () => {
  it('renders without crashing', () => {
    render(<TrustBar />);
    expect(screen.getByTestId('trust-bar')).toBeInTheDocument();
  });

  it('does not have a section id (TrustBar is not an anchor target)', () => {
    const { container } = render(<TrustBar />);
    // TrustBar has no id attribute on the section — this is intentional
    const section = container.querySelector('[data-testid="trust-bar"]');
    expect(section).not.toHaveAttribute('id');
  });

  it('renders all 7 compliance badge labels', () => {
    render(<TrustBar />);
    const badgeList = screen.getByRole('list', { name: /Compliance certifications/i });
    expect(badgeList).toBeInTheDocument();

    expect(screen.getByText('FERPA')).toBeInTheDocument();
    expect(screen.getByText('WCAG 2.2 AA')).toBeInTheDocument();
    expect(screen.getByText('SCORM 2004')).toBeInTheDocument();
    expect(screen.getByText('LTI 1.3')).toBeInTheDocument();
    expect(screen.getByText('xAPI')).toBeInTheDocument();
    expect(screen.getByText('SAML 2.0')).toBeInTheDocument();
    expect(screen.getByText('GDPR')).toBeInTheDocument();
  });

  it('renders the 5 partner placeholder logos', () => {
    render(<TrustBar />);
    const partnerList = screen.getByRole('list', { name: /Partner organizations/i });
    const items = partnerList.querySelectorAll('[role="listitem"]');
    expect(items).toHaveLength(5);
  });

  it('renders the trusted-by tagline', () => {
    render(<TrustBar />);
    expect(
      screen.getByText(/Trusted by universities, enterprises/i),
    ).toBeInTheDocument();
  });
});
