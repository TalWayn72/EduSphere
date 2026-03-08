/**
 * CohortRetentionTable — unit tests (standalone, no module-level mocks).
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CohortRetentionTable } from './TenantAnalyticsPage.cohort';

const SAMPLE_ROWS = [
  {
    cohortWeek: '2026-W01',
    enrolled: 100,
    activeAt7Days: 90,
    activeAt30Days: 75,
    completionRate30Days: 0.85,
  },
  {
    cohortWeek: '2026-W02',
    enrolled: 80,
    activeAt7Days: 60,
    activeAt30Days: 40,
    completionRate30Days: 0.5,
  },
  {
    cohortWeek: '2026-W03',
    enrolled: 60,
    activeAt7Days: 30,
    activeAt30Days: 15,
    completionRate30Days: 0.25,
  },
];

describe('CohortRetentionTable', () => {
  it('renders empty state when rows is empty', () => {
    render(<CohortRetentionTable rows={[]} />);
    expect(screen.getByText('No cohort data available.')).toBeInTheDocument();
  });

  it('renders cohort week identifiers', () => {
    render(<CohortRetentionTable rows={SAMPLE_ROWS} />);
    expect(screen.getByText('2026-W01')).toBeInTheDocument();
    expect(screen.getByText('2026-W02')).toBeInTheDocument();
    expect(screen.getByText('2026-W03')).toBeInTheDocument();
  });

  it('formats completion rate as percentage', () => {
    render(<CohortRetentionTable rows={SAMPLE_ROWS} />);
    expect(screen.getByText('85.0%')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(screen.getByText('25.0%')).toBeInTheDocument();
  });

  it('applies green class for completion rate >=80%', () => {
    render(<CohortRetentionTable rows={[SAMPLE_ROWS[0]!]} />);
    const greenCell = screen.getByText('85.0%');
    expect(greenCell.className).toContain('green');
  });

  it('applies yellow class for completion rate 50-79%', () => {
    render(<CohortRetentionTable rows={[SAMPLE_ROWS[1]!]} />);
    const yellowCell = screen.getByText('50.0%');
    expect(yellowCell.className).toContain('yellow');
  });

  it('applies red class for completion rate <50%', () => {
    render(<CohortRetentionTable rows={[SAMPLE_ROWS[2]!]} />);
    const redCell = screen.getByText('25.0%');
    expect(redCell.className).toContain('red');
  });

  it('renders enrolled, active@7d and active@30d counts', () => {
    render(<CohortRetentionTable rows={[SAMPLE_ROWS[0]!]} />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('has accessible table label', () => {
    render(<CohortRetentionTable rows={[]} />);
    expect(screen.getByRole('table', { name: /Cohort retention table/i })).toBeInTheDocument();
  });
});
