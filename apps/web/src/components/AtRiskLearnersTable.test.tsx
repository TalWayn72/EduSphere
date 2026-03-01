import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AtRiskLearnersTable,
  type AtRiskLearnerRow,
} from './AtRiskLearnersTable';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_LEARNERS: AtRiskLearnerRow[] = [
  {
    learnerId: 'usr-aaa1',
    courseId: 'crs-001',
    riskScore: 0.87,
    daysSinceLastActivity: 14,
    progressPercent: 12,
    flaggedAt: '2026-02-18T10:00:00Z',
    riskFactors: [
      { key: 'inactivity', description: 'No activity for 14 days' },
      { key: 'low_progress', description: 'Below 30% completion' },
    ],
  },
  {
    learnerId: 'usr-bbb2',
    courseId: 'crs-002',
    riskScore: 0.55,
    daysSinceLastActivity: 7,
    progressPercent: 45,
    flaggedAt: '2026-02-20T08:00:00Z',
    riskFactors: [
      { key: 'low_engagement', description: 'Below average session time' },
    ],
  },
];

function renderTable(
  learners: AtRiskLearnerRow[] = MOCK_LEARNERS,
  resolving: string | null = null,
  onResolve = vi.fn()
) {
  return render(
    <AtRiskLearnersTable
      learners={learners}
      onResolve={onResolve}
      resolving={resolving}
    />
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AtRiskLearnersTable', () => {
  it('shows "No at-risk learners detected." when list is empty', () => {
    renderTable([]);
    expect(
      screen.getByText('No at-risk learners detected.')
    ).toBeInTheDocument();
  });

  it('renders table headers when learners exist', () => {
    renderTable();
    expect(screen.getByText('Learner ID')).toBeInTheDocument();
    expect(screen.getByText('Risk Score')).toBeInTheDocument();
    expect(screen.getByText('Days Inactive')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Risk Factors')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('renders a row for each learner', () => {
    renderTable();
    const resolveButtons = screen.getAllByRole('button', { name: /resolve/i });
    expect(resolveButtons).toHaveLength(MOCK_LEARNERS.length);
  });

  it('renders risk score as a percentage', () => {
    renderTable();
    // 0.87 → 87%
    expect(screen.getByText('87%')).toBeInTheDocument();
    // 0.55 → 55%
    expect(screen.getByText('55%')).toBeInTheDocument();
  });

  it('renders days inactive with "d" suffix', () => {
    renderTable();
    expect(screen.getByText('14d')).toBeInTheDocument();
    expect(screen.getByText('7d')).toBeInTheDocument();
  });

  it('renders progress percent', () => {
    renderTable();
    expect(screen.getByText('12.0%')).toBeInTheDocument();
    expect(screen.getByText('45.0%')).toBeInTheDocument();
  });

  it('renders risk factor descriptions', () => {
    renderTable();
    expect(
      screen.getByText('No activity for 14 days')
    ).toBeInTheDocument();
    expect(screen.getByText('Below 30% completion')).toBeInTheDocument();
    expect(
      screen.getByText('Below average session time')
    ).toBeInTheDocument();
  });

  it('calls onResolve with learnerId and courseId when button clicked', () => {
    const onResolve = vi.fn();
    renderTable(MOCK_LEARNERS, null, onResolve);
    const [firstButton] = screen.getAllByRole('button', { name: /resolve/i });
    fireEvent.click(firstButton!);
    expect(onResolve).toHaveBeenCalledWith('usr-aaa1', 'crs-001');
  });

  it('disables Resolve button when resolving that learner+course key', () => {
    const resolvingKey = 'usr-aaa1' + 'crs-001';
    renderTable(MOCK_LEARNERS, resolvingKey);
    const [first, second] = screen.getAllByRole('button', { name: /resolve/i });
    expect(first).toBeDisabled();
    expect(second).not.toBeDisabled();
  });

  it('does not disable Resolve button for different learner', () => {
    const resolvingKey = 'usr-bbb2' + 'crs-002';
    renderTable(MOCK_LEARNERS, resolvingKey);
    const [first, second] = screen.getAllByRole('button', { name: /resolve/i });
    expect(first).not.toBeDisabled();
    expect(second).toBeDisabled();
  });

  it('renders learner ID truncated to 8 chars + "..."', () => {
    renderTable();
    // 'usr-aaa1' is already 8 chars → 'usr-aaa1...'
    expect(screen.getByText('usr-aaa1...')).toBeInTheDocument();
  });

  it('renders multiple risk factors per learner', () => {
    renderTable();
    // First learner has 2 risk factors
    const items = screen
      .getAllByText(/No activity|Below 30%|Below average/);
    expect(items.length).toBeGreaterThanOrEqual(3);
  });
});
