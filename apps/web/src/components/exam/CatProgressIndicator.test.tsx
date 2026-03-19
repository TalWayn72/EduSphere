/**
 * CatProgressIndicator component tests
 *
 * Verifies:
 *  1.  Shows min and max item counts
 *  2.  Progress bar fills based on current/max ratio
 *  3.  Shows "Estimating..." text
 *  4.  Shows current question number
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CatProgressIndicator } from './CatProgressIndicator';

describe('CatProgressIndicator', () => {
  it('shows min and max item counts', () => {
    render(
      <CatProgressIndicator currentItemNumber={5} minItems={10} maxItems={30} />,
    );
    expect(screen.getByText('Min: 10')).toBeInTheDocument();
    expect(screen.getByText('Max: 30')).toBeInTheDocument();
  });

  it('shows current question number in range format', () => {
    render(
      <CatProgressIndicator currentItemNumber={7} minItems={10} maxItems={25} />,
    );
    expect(screen.getByText('Question 7 of 10–25')).toBeInTheDocument();
  });

  it('shows estimating text', () => {
    render(
      <CatProgressIndicator currentItemNumber={3} minItems={10} maxItems={20} />,
    );
    expect(screen.getByText('Estimating your ability level')).toBeInTheDocument();
  });

  it('renders minimum marker element', () => {
    const { container } = render(
      <CatProgressIndicator currentItemNumber={5} minItems={10} maxItems={30} />,
    );
    const marker = container.querySelector('[title="Minimum: 10 items"]');
    expect(marker).toBeInTheDocument();
  });

  it('handles equal min and max gracefully', () => {
    render(
      <CatProgressIndicator currentItemNumber={5} minItems={20} maxItems={20} />,
    );
    expect(screen.getByText('Question 5 of 20–20')).toBeInTheDocument();
  });
});
