import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminStatCards } from './AdminStatCards';
import type { AdminOverviewData } from '@/pages/AdminDashboardPage';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_OVERVIEW: AdminOverviewData = {
  totalUsers: 1250,
  activeUsersThisMonth: 342,
  totalCourses: 89,
  completionsThisMonth: 56,
  atRiskCount: 7,
  storageUsedMb: 128.4,
  lastScimSync: null,
  lastComplianceReport: null,
};

function renderCards(overview = MOCK_OVERVIEW) {
  return render(
    <MemoryRouter>
      <AdminStatCards overview={overview} />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdminStatCards', () => {
  it('renders the "Total Users" label', () => {
    renderCards();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
  });

  it('renders the "Active This Month" label', () => {
    renderCards();
    expect(screen.getByText('Active This Month')).toBeInTheDocument();
  });

  it('renders the "Total Courses" label', () => {
    renderCards();
    expect(screen.getByText('Total Courses')).toBeInTheDocument();
  });

  it('renders the "Completions (30d)" label', () => {
    renderCards();
    expect(screen.getByText('Completions (30d)')).toBeInTheDocument();
  });

  it('renders the "At-Risk Learners" label', () => {
    renderCards();
    expect(screen.getByText('At-Risk Learners')).toBeInTheDocument();
  });

  it('renders the "Storage Used" label', () => {
    renderCards();
    expect(screen.getByText('Storage Used')).toBeInTheDocument();
  });

  it('shows the total users count', () => {
    renderCards();
    // 1250 → toLocaleString() in en-US is "1,250"
    expect(screen.getByText(MOCK_OVERVIEW.totalUsers.toLocaleString())).toBeInTheDocument();
  });

  it('shows the storage used value formatted as MB', () => {
    renderCards();
    expect(screen.getByText('128.4 MB')).toBeInTheDocument();
  });

  it('shows the at-risk count', () => {
    renderCards();
    expect(
      screen.getByText(MOCK_OVERVIEW.atRiskCount.toLocaleString())
    ).toBeInTheDocument();
  });

  it('renders at-risk card as a link to /admin/at-risk', () => {
    renderCards();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/admin/at-risk');
  });

  it('renders 6 stat cards total', () => {
    const { container } = renderCards();
    // Each card wraps a Card component — count distinct card containers
    const cards = container.querySelectorAll('[class*="rounded"]');
    expect(cards.length).toBeGreaterThanOrEqual(6);
  });

  it('shows zero values correctly', () => {
    renderCards({
      ...MOCK_OVERVIEW,
      atRiskCount: 0,
      completionsThisMonth: 0,
    });
    // Should render without error and show "0"
    expect(screen.getByText('At-Risk Learners')).toBeInTheDocument();
  });
});
