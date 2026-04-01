import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './LandingPage';

// Mock urql — PilotCTASection uses useMutation which requires a Provider
vi.mock('urql', async () => {
  const actual = await vi.importActual<typeof import('urql')>('urql');
  return {
    ...actual,
    useMutation: vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]),
    useQuery: vi.fn(() => [
      { fetching: false, data: undefined, error: undefined },
      vi.fn(),
    ]),
  };
});

// Mock react-router-dom Link
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...rest
    }: {
      to: string;
      children: React.ReactNode;
      [k: string]: unknown;
    }) => (
      <a href={to as string} {...rest}>
        {children}
      </a>
    ),
  };
});

// Mock PublicLayout — nav and footer are tested in their own test files
vi.mock('@/components/PublicLayout', () => ({
  PublicLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="public-layout">{children}</div>
  ),
}));

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );
}

describe('LandingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the hero section with B2B headline', () => {
    renderLanding();
    const hero = screen.getByTestId('hero-section');
    expect(hero).toBeInTheDocument();
    expect(hero).toHaveTextContent(/AI-Native LMS/i);
  });

  it('renders hero pricing anchor and CTAs', () => {
    renderLanding();
    const hero = screen.getByTestId('hero-section');
    expect(hero).toHaveTextContent(/\$12,000/i);
    expect(
      screen.getAllByRole('link', { name: /Request Demo/i }).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole('link', { name: /Pilot/i }).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders compliance badges section', () => {
    renderLanding();
    const section = screen.getByTestId('compliance-badges-section');
    expect(section).toBeInTheDocument();
    expect(section).toHaveTextContent('FERPA');
    expect(section).toHaveTextContent('WCAG');
    expect(section).toHaveTextContent('SCORM');
  });

  it('renders competitor comparison table', () => {
    renderLanding();
    const section = screen.getByTestId('vs-competitors-section');
    expect(section).toBeInTheDocument();
    expect(section).toHaveTextContent('Canvas');
    expect(section).toHaveTextContent('Knowledge Graph');
  });

  it('renders 4 B2B pricing tiers', () => {
    renderLanding();
    const section = screen.getByTestId('pricing-section');
    expect(section).toBeInTheDocument();
    expect(section).toHaveTextContent('Starter');
    expect(section).toHaveTextContent('Growth');
    expect(section).toHaveTextContent('University');
    expect(section).toHaveTextContent('Enterprise');
    expect(section).toHaveTextContent('$12,000');
    expect(section).toHaveTextContent('Most Popular');
    // Anti-regression: old B2C tiers must NOT appear
    expect(section).not.toHaveTextContent('Free');
    expect(section).not.toHaveTextContent('Pro');
  });

  it('renders pilot CTA section with form', () => {
    renderLanding();
    const section = screen.getByTestId('pilot-cta-section');
    expect(section).toBeInTheDocument();
    expect(section).toHaveTextContent('90');
  });

  it('renders inside PublicLayout wrapper', () => {
    renderLanding();
    expect(screen.getByTestId('public-layout')).toBeInTheDocument();
  });

  it('does not show raw technical strings or error messages', () => {
    renderLanding();
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/undefined/i);
    expect(body).not.toMatch(/TypeError/i);
    expect(body).not.toMatch(/Cannot read/i);
    expect(body).not.toMatch(/\[object Object\]/);
    expect(body).not.toMatch(/urql/i);
    expect(body).not.toMatch(/GraphQL error/i);
  });

  it('all required B2B data-testid attributes are present', () => {
    renderLanding();
    const requiredIds = [
      'hero-section',
      'compliance-badges-section',
      'vs-competitors-section',
      'pricing-section',
      'pilot-cta-section',
      'public-layout',
    ];
    for (const id of requiredIds) {
      expect(
        screen.getByTestId(id),
        `Missing data-testid="${id}"`
      ).toBeInTheDocument();
    }
  });
});
