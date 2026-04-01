import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('lucide-react', () => ({
  CheckCircle: () => <span data-testid="check-icon" />,
  XCircle: () => <span data-testid="x-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
}));

import { ImportProgressPanel } from './ImportProgressPanel';

describe('ImportProgressPanel', () => {
  it('shows loading for PENDING', () => {
    render(
      <ImportProgressPanel
        job={{
          id: 'j1',
          status: 'PENDING',
          lessonCount: 5,
          estimatedMinutes: 3,
        }}
        onDone={vi.fn()}
      />
    );
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.getByText(/Preparing import/)).toBeInTheDocument();
  });

  it('shows running state', () => {
    render(
      <ImportProgressPanel
        job={{
          id: 'j1',
          status: 'RUNNING',
          lessonCount: 10,
          estimatedMinutes: 5,
        }}
        onDone={vi.fn()}
      />
    );
    expect(screen.getByText(/Importing 10 lessons/)).toBeInTheDocument();
  });

  it('shows estimated time', () => {
    render(
      <ImportProgressPanel
        job={{
          id: 'j1',
          status: 'RUNNING',
          lessonCount: 10,
          estimatedMinutes: 5,
        }}
        onDone={vi.fn()}
      />
    );
    expect(screen.getByText(/~5 minutes/)).toBeInTheDocument();
  });

  it('shows complete state', () => {
    render(
      <ImportProgressPanel
        job={{
          id: 'j1',
          status: 'COMPLETE',
          lessonCount: 10,
          estimatedMinutes: null,
        }}
        onDone={vi.fn()}
      />
    );
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    expect(screen.getByText(/Import complete/)).toBeInTheDocument();
  });

  it('shows failed state', () => {
    render(
      <ImportProgressPanel
        job={{
          id: 'j1',
          status: 'FAILED',
          lessonCount: 0,
          estimatedMinutes: null,
        }}
        onDone={vi.fn()}
      />
    );
    expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    expect(screen.getByText('Import failed')).toBeInTheDocument();
  });

  it('calls onDone when button clicked', () => {
    const onDone = vi.fn();
    render(
      <ImportProgressPanel
        job={{
          id: 'j1',
          status: 'COMPLETE',
          lessonCount: 5,
          estimatedMinutes: null,
        }}
        onDone={onDone}
      />
    );
    fireEvent.click(screen.getByText('View Course'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('has role=status for a11y', () => {
    render(
      <ImportProgressPanel
        job={{
          id: 'j1',
          status: 'PENDING',
          lessonCount: 0,
          estimatedMinutes: null,
        }}
        onDone={vi.fn()}
      />
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
