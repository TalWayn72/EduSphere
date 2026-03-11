import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ROICalculatorSection } from './ROICalculatorSection';

describe('ROICalculatorSection', () => {
  it('renders the section heading', () => {
    render(<ROICalculatorSection />);
    expect(screen.getByText('Calculate Your ROI')).toBeInTheDocument();
  });

  it('displays all four slider labels', () => {
    render(<ROICalculatorSection />);
    expect(screen.getByText('Number of Instructors')).toBeInTheDocument();
    expect(screen.getByText(/Hours\/week/)).toBeInTheDocument();
    expect(screen.getByText('Hourly instructor cost')).toBeInTheDocument();
    expect(screen.getByText('Number of students')).toBeInTheDocument();
  });

  it('shows calculated output fields', () => {
    render(<ROICalculatorSection />);
    expect(screen.getByText('Instructor hours saved/year')).toBeInTheDocument();
    expect(screen.getByText('Dollar value saved')).toBeInTheDocument();
    expect(screen.getByText('EduSphere annual cost')).toBeInTheDocument();
    expect(screen.getByText('Net ROI')).toBeInTheDocument();
  });

  it('shows default instructor count of 10', () => {
    render(<ROICalculatorSection />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('renders the CTA button', () => {
    render(<ROICalculatorSection />);
    expect(screen.getByRole('link', { name: /Get Your Custom ROI Report/i })).toBeInTheDocument();
  });
});
