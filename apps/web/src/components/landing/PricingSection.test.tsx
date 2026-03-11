import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PricingSection } from './PricingSection';

describe('PricingSection', () => {
  it('renders all 4 pricing tier names', () => {
    render(<PricingSection />);
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('University')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('renders the section heading', () => {
    render(<PricingSection />);
    expect(screen.getByText(/Transparent B2B Pricing/i)).toBeInTheDocument();
  });

  it('shows YAU counts for each tier', () => {
    render(<PricingSection />);
    expect(screen.getByText('500 YAU')).toBeInTheDocument();
    expect(screen.getByText('2,000 YAU')).toBeInTheDocument();
    expect(screen.getByText('10,000 YAU')).toBeInTheDocument();
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
  });

  it('marks University as Most Popular', () => {
    render(<PricingSection />);
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('shows White-label INCLUDED badges', () => {
    render(<PricingSection />);
    const badges = screen.getAllByText('White-label INCLUDED');
    expect(badges.length).toBeGreaterThanOrEqual(4);
  });

  it('renders FAQ items', () => {
    render(<PricingSection />);
    expect(screen.getByText(/What counts as a YAU/i)).toBeInTheDocument();
    expect(screen.getByText(/What happens if I exceed/i)).toBeInTheDocument();
    expect(screen.getByText(/Can I upgrade mid-year/i)).toBeInTheDocument();
  });

  it('shows pricing in dollars per year', () => {
    render(<PricingSection />);
    expect(screen.getByText('$12,000')).toBeInTheDocument();
    expect(screen.getByText('$32,000')).toBeInTheDocument();
    expect(screen.getByText('$65,000')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });
});
