import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: Record<string, unknown>) => (
    <div data-testid="skeleton" className={props.className as string} />
  ),
}));

import { PipelineStepperSkeleton } from './PipelineStepperSkeleton';

describe('PipelineStepperSkeleton', () => {
  it('renders the skeleton container with testid', () => {
    render(<PipelineStepperSkeleton />);
    expect(screen.getByTestId('pipeline-stepper-skeleton')).toBeInTheDocument();
  });

  it('has aria-busy=true for loading state', () => {
    render(<PipelineStepperSkeleton />);
    expect(screen.getByTestId('pipeline-stepper-skeleton')).toHaveAttribute('aria-busy', 'true');
  });

  it('has Hebrew aria-label', () => {
    render(<PipelineStepperSkeleton />);
    expect(screen.getByTestId('pipeline-stepper-skeleton')).toHaveAttribute(
      'aria-label',
      'טוען סטטוס צנרת...',
    );
  });

  it('renders 6 skeleton rows', () => {
    render(<PipelineStepperSkeleton />);
    const skeletons = screen.getAllByTestId('skeleton');
    // 6 rows × 4 skeletons per row = 24
    expect(skeletons.length).toBe(24);
  });

  it('sets dir=rtl on container', () => {
    render(<PipelineStepperSkeleton />);
    expect(screen.getByTestId('pipeline-stepper-skeleton')).toHaveAttribute('dir', 'rtl');
  });
});
