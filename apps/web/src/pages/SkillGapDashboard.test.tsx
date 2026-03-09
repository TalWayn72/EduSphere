import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as urql from 'urql';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SkillGapDashboard } from './SkillGapDashboard';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', async () => {
  const actual = await vi.importActual<typeof urql>('urql');
  return { ...actual, useQuery: vi.fn() };
});

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOOP_QUERY = [{ data: undefined, fetching: false, error: undefined }] as never;

function renderDashboard(pathId = 'test-path-id') {
  return render(
    <MemoryRouter initialEntries={[`/skills/gap/${pathId}`]}>
      <Routes>
        <Route path="/skills/gap/:pathId" element={<SkillGapDashboard />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SkillGapDashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders gap analysis heading', () => {
    vi.mocked(urql.useQuery).mockReturnValue(NOOP_QUERY);
    renderDashboard();
    expect(screen.getByRole('heading', { name: /skill gap analysis/i })).toBeInTheDocument();
  });

  it('renders completionPct when data is present', () => {
    const mockAnalysis = {
      targetPathId: 'test-path-id',
      totalSkills: 10,
      masteredSkills: 7,
      completionPct: 70,
      gapSkills: [
        { id: 'g1', name: 'TypeScript Advanced', category: 'Programming', level: 'INTERMEDIATE' },
        { id: 'g2', name: 'GraphQL Federation', category: 'Backend', level: 'ADVANCED' },
        { id: 'g3', name: 'Testing', category: 'QA', level: 'BEGINNER' },
      ],
    };
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { skillGapAnalysis: mockAnalysis }, fetching: false, error: undefined },
    ] as never);

    renderDashboard();

    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText(/7 of 10 skills mastered/i)).toBeInTheDocument();
    expect(screen.getByText('TypeScript Advanced')).toBeInTheDocument();
    expect(screen.getByText('GraphQL Federation')).toBeInTheDocument();
  });

  it('renders loading state when fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
    ] as never);
    renderDashboard();
    expect(screen.getByLabelText(/loading gap analysis/i)).toBeInTheDocument();
  });

  it('renders error message when query fails', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: false, error: { message: 'Network error' } },
    ] as never);
    renderDashboard();
    expect(screen.getByText(/failed to load gap analysis/i)).toBeInTheDocument();
  });

  it('renders "All skills mastered!" when no gap skills', () => {
    const mockAnalysis = {
      targetPathId: 'test-path-id',
      totalSkills: 5,
      masteredSkills: 5,
      completionPct: 100,
      gapSkills: [],
    };
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { skillGapAnalysis: mockAnalysis }, fetching: false, error: undefined },
    ] as never);
    renderDashboard();
    expect(screen.getByText(/all skills mastered/i)).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
