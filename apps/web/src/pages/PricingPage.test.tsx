import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PricingPage } from './PricingPage';

// PricingSection uses useMutation internally — mock urql to avoid Provider requirement
vi.mock('urql', async () => {
  const actual = await vi.importActual<typeof import('urql')>('urql');
  return {
    ...actual,
    useMutation: vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]),
    useQuery: vi.fn(() => [{ fetching: false, data: undefined }, vi.fn()]),
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <PricingPage />
    </MemoryRouter>
  );
}

describe('PricingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders data-testid="pricing-page"', () => {
    renderPage();
    expect(screen.getByTestId('pricing-page')).toBeInTheDocument();
  });

  it('renders the pricing section with Starter tier', () => {
    renderPage();
    expect(screen.getByTestId('pricing-section')).toBeInTheDocument();
    expect(screen.getByText('Starter')).toBeInTheDocument();
  });

  it('renders Growth and University tiers', () => {
    renderPage();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('University')).toBeInTheDocument();
  });

  it('renders compliance badges section', () => {
    renderPage();
    expect(screen.getByTestId('compliance-badges-section')).toBeInTheDocument();
  });

  it('renders FERPA compliance badge', () => {
    renderPage();
    expect(screen.getByText('FERPA')).toBeInTheDocument();
  });

  it('renders vs competitors section', () => {
    renderPage();
    expect(screen.getByTestId('vs-competitors-section')).toBeInTheDocument();
  });

  it('renders FAQ section with data-testid="pricing-faq"', () => {
    renderPage();
    expect(screen.getByTestId('pricing-faq')).toBeInTheDocument();
  });

  it('renders all four FAQ questions', () => {
    renderPage();
    // PricingSection also has FAQs so use getAllByText for shared phrases
    expect(screen.getAllByText(/What is a Yearly Active User/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Is white-label included/i).length).toBeGreaterThan(0);
    // "Can I upgrade mid-year?" appears in both PricingSection and PricingPage FAQ
    expect(screen.getAllByText(/Can I upgrade mid-year/i).length).toBeGreaterThan(0);
    // Unique to PricingPage FAQ
    expect(screen.getByText(/What happens when my pilot expires/i)).toBeInTheDocument();
  });

  it('expands FAQ answer when question is clicked', () => {
    renderPage();
    const question = screen.getByText(/What is a Yearly Active User/i);
    fireEvent.click(question);
    expect(
      screen.getByText(/A YAU is any user who logs in at least once per calendar year/i)
    ).toBeInTheDocument();
  });

  it('renders page title heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Pricing & Plans/i })).toBeInTheDocument();
  });

  it('renders navigation with Log In link', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /Log In/i })).toBeInTheDocument();
  });

  it('renders Start Free Pilot CTA link', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /Start Free Pilot/i })).toBeInTheDocument();
  });
});
