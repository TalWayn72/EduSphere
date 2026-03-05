import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkipLinks } from './SkipLinks';

describe('SkipLinks', () => {
  it('renders skip-to-main link', () => {
    render(<SkipLinks />);
    expect(screen.getByTestId('skip-to-main')).toBeInTheDocument();
  });

  it('renders skip-to-nav link', () => {
    render(<SkipLinks />);
    expect(screen.getByTestId('skip-to-nav')).toBeInTheDocument();
  });

  it('skip-to-main href points to #main-content', () => {
    render(<SkipLinks />);
    expect(screen.getByTestId('skip-to-main')).toHaveAttribute('href', '#main-content');
  });

  it('skip-to-nav href points to #main-nav', () => {
    render(<SkipLinks />);
    expect(screen.getByTestId('skip-to-nav')).toHaveAttribute('href', '#main-nav');
  });

  it('links have meaningful accessible text', () => {
    render(<SkipLinks />);
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
    expect(screen.getByText('Skip to navigation')).toBeInTheDocument();
  });
});
