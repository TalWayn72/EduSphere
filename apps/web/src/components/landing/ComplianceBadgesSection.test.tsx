import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { ComplianceBadgesSection } from './ComplianceBadgesSection';

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => {
    if (name === '__esModule') return true;
    return function MockIcon(props: Record<string, unknown>) {
      return <span data-testid={`icon-${String(name)}`} {...props} />;
    };
  },
}));

vi.mock('@/components/ui/button', () => ({
  Button: function MockButton({ children, asChild: _asChild, ...props }: Record<string, unknown>) {
    return <div {...props}>{children as React.ReactNode}</div>;
  },
}));

describe('ComplianceBadgesSection', () => {
  it('renders without crashing', () => {
    render(<MemoryRouter><ComplianceBadgesSection /></MemoryRouter>);
    expect(screen.getByTestId('compliance-badges-section')).toBeInTheDocument();
  });

  it('has correct section id for anchor navigation', () => {
    const { container } = render(<MemoryRouter><ComplianceBadgesSection /></MemoryRouter>);
    expect(container.querySelector('#compliance')).toBeInTheDocument();
  });

  it('renders all 8 compliance badges', () => {
    render(<MemoryRouter><ComplianceBadgesSection /></MemoryRouter>);
    expect(screen.getByText('FERPA')).toBeInTheDocument();
    expect(screen.getByText('WCAG 2.2 AA')).toBeInTheDocument();
    expect(screen.getByText('SCORM 2004')).toBeInTheDocument();
    expect(screen.getByText('LTI 1.3')).toBeInTheDocument();
    expect(screen.getByText('xAPI / Tin Can')).toBeInTheDocument();
    expect(screen.getByText('SAML 2.0 SSO')).toBeInTheDocument();
    expect(screen.getByText('GDPR')).toBeInTheDocument();
    expect(screen.getByText('Air-Gapped Ready')).toBeInTheDocument();
  });

  it('renders the SOC 2 Type II in-progress notice', () => {
    render(<MemoryRouter><ComplianceBadgesSection /></MemoryRouter>);
    expect(screen.getByText(/SOC 2 Type II/)).toBeInTheDocument();
    expect(screen.getByText(/In progress/)).toBeInTheDocument();
  });

  it('renders the VPAT/HECVAT download link with correct href', () => {
    render(<MemoryRouter><ComplianceBadgesSection /></MemoryRouter>);
    const link = screen.getByRole('link', { name: /Download VPAT \/ HECVAT/i });
    expect(link).toHaveAttribute('href', '/compliance');
  });
});
