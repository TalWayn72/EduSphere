import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as urql from 'urql';
import { MemoryRouter } from 'react-router-dom';
import { SkillGapWidget } from './SkillGapWidget';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/knowledge-tier3.queries', () => ({
  SKILL_GAP_ANALYSIS_QUERY: 'SKILL_GAP_ANALYSIS_QUERY',
  SKILL_PROFILES_QUERY: 'SKILL_PROFILES_QUERY',
  CREATE_SKILL_PROFILE_MUTATION: 'CREATE_SKILL_PROFILE_MUTATION',
  SOCIAL_FEED_QUERY: 'SOCIAL_FEED_QUERY',
}));

const NOOP_EXECUTE = vi
  .fn()
  .mockResolvedValue({ data: null, error: undefined });

const MOCK_PROFILES = [
  {
    id: 'p1',
    roleName: 'Backend Engineer',
    description: null,
    requiredConceptsCount: 10,
  },
  {
    id: 'p2',
    roleName: 'Data Scientist',
    description: null,
    requiredConceptsCount: 8,
  },
];

const MOCK_REPORT = {
  roleId: 'p1',
  roleName: 'Backend Engineer',
  totalRequired: 10,
  mastered: 6,
  gapCount: 4,
  completionPercentage: 60,
  gaps: [
    {
      conceptName: 'Docker',
      isMastered: false,
      recommendedContentTitles: ['Docker 101'],
    },
    {
      conceptName: 'Kubernetes',
      isMastered: false,
      recommendedContentTitles: [],
    },
    {
      conceptName: 'Redis',
      isMastered: false,
      recommendedContentTitles: ['Redis Basics'],
    },
    { conceptName: 'NATS', isMastered: false, recommendedContentTitles: [] },
    {
      conceptName: 'GraphQL',
      isMastered: false,
      recommendedContentTitles: ['GQL Intro'],
    },
    { conceptName: 'REST', isMastered: false, recommendedContentTitles: [] },
  ],
};

function renderWidget() {
  return render(
    <MemoryRouter>
      <SkillGapWidget />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(urql.useMutation).mockReturnValue([{} as never, NOOP_EXECUTE]);
  // Default: no profiles (paused query returns empty)
  vi.mocked(urql.useQuery).mockReturnValue([
    { data: undefined, fetching: false },
    vi.fn(),
  ] as never);
});

describe('SkillGapWidget', () => {
  it('renders "Skill Gap Analysis" heading', () => {
    renderWidget();
    expect(screen.getByText('Skill Gap Analysis')).toBeInTheDocument();
  });

  it('shows empty state when no profiles loaded', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { skillProfiles: [] }, fetching: false },
      vi.fn(),
    ] as never);
    renderWidget();
    expect(screen.getByText(/no skill profiles yet/i)).toBeInTheDocument();
  });

  it('shows "New Profile" button', () => {
    renderWidget();
    expect(
      screen.getByRole('button', { name: /new profile/i })
    ).toBeInTheDocument();
  });

  it('opens Create Skill Profile dialog when "New Profile" is clicked', () => {
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /new profile/i }));
    expect(screen.getByText('Create Skill Profile')).toBeInTheDocument();
  });

  it('Create Profile button is disabled when inputs are empty', () => {
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /new profile/i }));
    const createBtn = screen.getByRole('button', { name: /create profile/i });
    expect(createBtn).toBeDisabled();
  });

  it('calls createProfile mutation when form is submitted', async () => {
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /new profile/i }));
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0]!, { target: { value: 'Frontend Dev' } });
    fireEvent.change(inputs[1]!, {
      target: { value: 'React, TypeScript, CSS' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create profile/i }));
    await waitFor(() =>
      expect(NOOP_EXECUTE).toHaveBeenCalledWith({
        roleName: 'Frontend Dev',
        description: null,
        requiredConcepts: ['React', 'TypeScript', 'CSS'],
      })
    );
  });

  it('renders skill profiles in select dropdown when available', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { skillProfiles: MOCK_PROFILES }, fetching: false },
      vi.fn(),
    ] as never);
    renderWidget();
    expect(screen.getByText(/select a role to analyze/i)).toBeInTheDocument();
  });

  it('renders skill gap report with progress info when report is available', () => {
    vi.mocked(urql.useQuery)
      .mockReturnValueOnce([
        { data: { skillProfiles: MOCK_PROFILES }, fetching: false },
        vi.fn(),
      ] as never)
      .mockReturnValue([
        { data: { skillGapAnalysis: MOCK_REPORT }, fetching: false },
        vi.fn(),
      ] as never);
    renderWidget();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('6/10 mastered')).toBeInTheDocument();
    expect(
      screen.getByText(/60% complete · 4 gaps remaining/i)
    ).toBeInTheDocument();
  });

  it('renders gap items (capped at 5)', () => {
    vi.mocked(urql.useQuery)
      .mockReturnValueOnce([
        { data: { skillProfiles: MOCK_PROFILES }, fetching: false },
        vi.fn(),
      ] as never)
      .mockReturnValue([
        { data: { skillGapAnalysis: MOCK_REPORT }, fetching: false },
        vi.fn(),
      ] as never);
    renderWidget();
    // MOCK_REPORT has 6 gaps but MAX_VISIBLE_GAPS = 5
    expect(screen.getByText('Docker')).toBeInTheDocument();
    expect(screen.getByText('Kubernetes')).toBeInTheDocument();
    expect(screen.queryByText('REST')).not.toBeInTheDocument(); // 6th gap hidden
  });

  it('shows "All required skills mastered" when gapCount is 0', () => {
    const fullReport = { ...MOCK_REPORT, gapCount: 0, gaps: [] };
    vi.mocked(urql.useQuery)
      .mockReturnValueOnce([
        { data: { skillProfiles: MOCK_PROFILES }, fetching: false },
        vi.fn(),
      ] as never)
      .mockReturnValue([
        { data: { skillGapAnalysis: fullReport }, fetching: false },
        vi.fn(),
      ] as never);
    renderWidget();
    expect(
      screen.getByText(/all required skills mastered/i)
    ).toBeInTheDocument();
  });
});
