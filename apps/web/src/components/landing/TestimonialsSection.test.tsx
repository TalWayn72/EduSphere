import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TestimonialsSection } from './TestimonialsSection';

vi.mock('@/components/ui/card', () => ({
  Card: function MockCard({ children, ...props }: Record<string, unknown>) {
    return <div {...props}>{children as React.ReactNode}</div>;
  },
  CardContent: function MockCardContent({ children, ...props }: Record<string, unknown>) {
    return <div {...props}>{children as React.ReactNode}</div>;
  },
}));

describe('TestimonialsSection', () => {
  it('renders without crashing', () => {
    render(<TestimonialsSection />);
    expect(screen.getByTestId('testimonials-section')).toBeInTheDocument();
  });

  it('has correct section id for anchor navigation', () => {
    const { container } = render(<TestimonialsSection />);
    expect(container.querySelector('#testimonials')).toBeInTheDocument();
  });

  it('renders the section heading', () => {
    render(<TestimonialsSection />);
    expect(
      screen.getByText(/Trusted by Institutions That Take Learning Seriously/i),
    ).toBeInTheDocument();
  });

  it('renders all 3 testimonials with names and roles', () => {
    render(<TestimonialsSection />);
    expect(screen.getByText('Dr. Sarah Chen')).toBeInTheDocument();
    expect(screen.getByText(/Dept\. of History/)).toBeInTheDocument();
    expect(screen.getByText('Michael Torres')).toBeInTheDocument();
    expect(screen.getByText(/VP Learning & Development/)).toBeInTheDocument();
    expect(screen.getByText('[Name redacted]')).toBeInTheDocument();
    expect(screen.getByText(/Training Director/)).toBeInTheDocument();
  });

  it('renders testimonial quote content', () => {
    render(<TestimonialsSection />);
    expect(screen.getByText(/Visual Anchoring transformed/)).toBeInTheDocument();
    expect(screen.getByText(/cut course creation time by 65%/)).toBeInTheDocument();
    expect(screen.getByText(/air-gapped deployment was non-negotiable/)).toBeInTheDocument();
  });
});
