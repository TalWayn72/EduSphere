import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProctoringReportCard } from './ProctoringReportCard';

const SESSION = {
  id: 'session-1',
  userId: 'user-1',
  status: 'COMPLETED',
  startedAt: '2026-03-10T10:00:00Z',
  endedAt: '2026-03-10T11:00:00Z',
  flagCount: 2,
  flags: [
    {
      type: 'TAB_SWITCH',
      timestamp: '2026-03-10T10:15:00Z',
      detail: 'Switched to another tab',
    },
    { type: 'FACE_NOT_DETECTED', timestamp: '2026-03-10T10:30:00Z' },
  ],
};

describe('ProctoringReportCard', () => {
  it('renders report card', () => {
    render(<ProctoringReportCard session={SESSION} />);
    expect(screen.getByTestId('proctoring-report-card')).toBeInTheDocument();
  });

  it('shows report title', () => {
    render(<ProctoringReportCard session={SESSION} />);
    expect(screen.getByText('Proctoring Report')).toBeInTheDocument();
  });

  it('shows status badge', () => {
    render(<ProctoringReportCard session={SESSION} />);
    expect(screen.getByTestId('proctoring-report-status')).toHaveTextContent(
      'COMPLETED'
    );
  });

  it('shows flag count', () => {
    render(<ProctoringReportCard session={SESSION} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders flag items', () => {
    render(<ProctoringReportCard session={SESSION} />);
    expect(screen.getByTestId('proctoring-flag-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('proctoring-flag-item-1')).toBeInTheDocument();
  });

  it('shows flag type', () => {
    render(<ProctoringReportCard session={SESSION} />);
    expect(screen.getByText('TAB_SWITCH')).toBeInTheDocument();
    expect(screen.getByText('FACE_NOT_DETECTED')).toBeInTheDocument();
  });

  it('shows flag detail when present', () => {
    render(<ProctoringReportCard session={SESSION} />);
    expect(screen.getByText('Switched to another tab')).toBeInTheDocument();
  });

  it('does not render flags list when no flags', () => {
    const noFlagSession = { ...SESSION, flagCount: 0, flags: [] };
    render(<ProctoringReportCard session={noFlagSession} />);
    expect(
      screen.queryByTestId('proctoring-flag-item-0')
    ).not.toBeInTheDocument();
  });

  it('applies correct status badge color for FLAGGED', () => {
    const flaggedSession = { ...SESSION, status: 'FLAGGED' };
    render(<ProctoringReportCard session={flaggedSession} />);
    expect(screen.getByTestId('proctoring-report-status').className).toContain(
      'bg-red-100'
    );
  });
});
