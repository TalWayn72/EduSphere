import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/components/ProgressStatus', () => ({
  ProgressStatus: ({ messages }: { messages: readonly string[] }) => (
    <div data-testid="progress-status">{messages.join(',')}</div>
  ),
}));

import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default aria-label', () => {
    render(<LoadingSpinner />);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('uses custom label', () => {
    render(<LoadingSpinner label="Please wait" />);
    expect(screen.getByLabelText('Please wait')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="my-class" />);
    expect(screen.getByLabelText('Loading').className).toContain('my-class');
  });

  it('renders spinner element with animation', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows ProgressStatus when messages provided', () => {
    render(<LoadingSpinner messages={['Loading data', 'Almost done']} />);
    expect(screen.getByTestId('progress-status')).toBeInTheDocument();
  });

  it('does not show ProgressStatus without messages', () => {
    render(<LoadingSpinner />);
    expect(screen.queryByTestId('progress-status')).not.toBeInTheDocument();
  });

  it('applies container height class', () => {
    render(<LoadingSpinner containerHeight="h-screen" />);
    expect(screen.getByLabelText('Loading').className).toContain('h-screen');
  });
});
