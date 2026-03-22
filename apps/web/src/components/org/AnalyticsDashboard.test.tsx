/**
 * AnalyticsDashboard.test.tsx — Unit tests for OrgAnalyticsDashboard component.
 *
 * Covers:
 *   - KPI card rendering
 *   - Chart interactions (date range)
 *   - Loading state
 *   - Empty data state (new org)
 *   - Export button
 *   - Accessibility
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts?.count !== undefined) return `${opts.count}`;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/hooks/useOrgAnalytics', () => ({
  useOrgAnalytics: vi.fn(() => ({
    kpis: {
      totalUsers: 250,
      activeUsers: 180,
      totalCourses: 45,
      storageGb: 12.5,
      completionRate: 72,
      yauCount: 200,
    },
    timeSeriesData: [
      { date: '2026-01', activeUsers: 150, completions: 30 },
      { date: '2026-02', activeUsers: 170, completions: 40 },
      { date: '2026-03', activeUsers: 180, completions: 45 },
    ],
    isLoading: false,
    dateRange: { start: new Date('2026-01-01'), end: new Date('2026-03-31') },
    setDateRange: vi.fn(),
    exportCsv: vi.fn(),
  })),
}));

import { useOrgAnalytics } from '@/hooks/useOrgAnalytics';
import { AnalyticsDashboard } from './AnalyticsDashboard';

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders KPI cards', () => {
    render(<AnalyticsDashboard />);
    expect(screen.getByText('250')).toBeInTheDocument(); // totalUsers
    expect(screen.getByText('180')).toBeInTheDocument(); // activeUsers
    expect(screen.getByText('45')).toBeInTheDocument();  // totalCourses
  });

  it('renders storage usage in GB', () => {
    render(<AnalyticsDashboard />);
    expect(screen.getByText(/12\.5/)).toBeInTheDocument();
  });

  it('renders completion rate percentage', () => {
    render(<AnalyticsDashboard />);
    expect(screen.getByText(/72%/)).toBeInTheDocument();
  });

  it('renders date range selector', () => {
    render(<AnalyticsDashboard />);
    expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
  });

  it('renders export button', () => {
    render(<AnalyticsDashboard />);
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('calls exportCsv when export button clicked', () => {

    const mockExport = vi.fn();
    vi.mocked(useOrgAnalytics).mockReturnValue({
      kpis: { totalUsers: 0, activeUsers: 0, totalCourses: 0, storageGb: 0, completionRate: 0, yauCount: 0 },
      timeSeriesData: [],
      isLoading: false,
      dateRange: { start: new Date(), end: new Date() },
      setDateRange: vi.fn(),
      exportCsv: mockExport,
    });

    render(<AnalyticsDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(mockExport).toHaveBeenCalledOnce();
  });

  it('shows loading skeletons while fetching', () => {

    vi.mocked(useOrgAnalytics).mockReturnValue({
      kpis: null,
      timeSeriesData: [],
      isLoading: true,
      dateRange: { start: new Date(), end: new Date() },
      setDateRange: vi.fn(),
      exportCsv: vi.fn(),
    });

    render(<AnalyticsDashboard />);
    const skeletons = screen.getAllByTestId('kpi-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows "no data" message for new org', () => {

    vi.mocked(useOrgAnalytics).mockReturnValue({
      kpis: { totalUsers: 0, activeUsers: 0, totalCourses: 0, storageGb: 0, completionRate: 0, yauCount: 0 },
      timeSeriesData: [],
      isLoading: false,
      dateRange: { start: new Date(), end: new Date() },
      setDateRange: vi.fn(),
      exportCsv: vi.fn(),
    });

    render(<AnalyticsDashboard />);
    expect(screen.getByText(/orgOnboarding\.noDataYet/i)).toBeInTheDocument();
  });

  it('KPI cards have accessible labels', () => {
    render(<AnalyticsDashboard />);
    const cards = screen.getAllByRole('article');
    expect(cards.length).toBeGreaterThanOrEqual(4);
    cards.forEach((card) => {
      expect(card).toHaveAttribute('aria-label');
    });
  });
});
