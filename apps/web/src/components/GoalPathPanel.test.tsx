import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as urql from 'urql';
import { GoalPathPanel } from './GoalPathPanel';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
}));

vi.mock('@/lib/graphql/competency.queries', () => ({
  MY_LEARNING_PATH_QUERY: 'MY_LEARNING_PATH_QUERY',
  MY_COMPETENCY_GOALS_QUERY: 'MY_COMPETENCY_GOALS_QUERY',
  ADD_COMPETENCY_GOAL_MUTATION: 'ADD_COMPETENCY_GOAL_MUTATION',
  REMOVE_COMPETENCY_GOAL_MUTATION: 'REMOVE_COMPETENCY_GOAL_MUTATION',
}));

const GOAL = { id: 'g1', targetConceptName: 'Machine Learning' };

const MOCK_PATH = {
  targetConceptName: 'Machine Learning',
  totalSteps: 4,
  completedSteps: 2,
  nodes: [
    { conceptName: 'Linear Algebra', isCompleted: true },
    { conceptName: 'Statistics', isCompleted: true },
    { conceptName: 'Neural Networks', isCompleted: false },
    { conceptName: 'Deep Learning', isCompleted: false },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GoalPathPanel', () => {
  it('shows loading text while fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: true },
      vi.fn(),
    ] as never);
    render(<GoalPathPanel goal={GOAL} />);
    expect(screen.getByText(/loading path/i)).toBeInTheDocument();
  });

  it('shows "No path found" when path is null', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myLearningPath: null }, fetching: false },
      vi.fn(),
    ] as never);
    render(<GoalPathPanel goal={GOAL} />);
    expect(screen.getByText(/no path found/i)).toBeInTheDocument();
  });

  it('renders completedSteps / totalSteps counter', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myLearningPath: MOCK_PATH }, fetching: false },
      vi.fn(),
    ] as never);
    render(<GoalPathPanel goal={GOAL} />);
    expect(screen.getByText('2/4 steps completed')).toBeInTheDocument();
  });

  it('renders all concept nodes', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myLearningPath: MOCK_PATH }, fetching: false },
      vi.fn(),
    ] as never);
    render(<GoalPathPanel goal={GOAL} />);
    expect(screen.getByText('Linear Algebra')).toBeInTheDocument();
    expect(screen.getByText('Statistics')).toBeInTheDocument();
    expect(screen.getByText('Neural Networks')).toBeInTheDocument();
    expect(screen.getByText('Deep Learning')).toBeInTheDocument();
  });

  it('passes targetConceptName as query variable', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myLearningPath: MOCK_PATH }, fetching: false },
      vi.fn(),
    ] as never);
    render(<GoalPathPanel goal={GOAL} />);
    const [queryOptions] = vi.mocked(urql.useQuery).mock.calls[0]!;
    expect(queryOptions.variables).toEqual({
      targetConceptName: 'Machine Learning',
    });
  });

  it('uses pause: false (query is not paused)', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myLearningPath: MOCK_PATH }, fetching: false },
      vi.fn(),
    ] as never);
    render(<GoalPathPanel goal={GOAL} />);
    const [queryOptions] = vi.mocked(urql.useQuery).mock.calls[0]!;
    // No pause option should be set (defaults to false/not paused)
    expect(queryOptions.pause).toBeFalsy();
  });

  it('shows completed nodes with green styling class', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myLearningPath: MOCK_PATH }, fetching: false },
      vi.fn(),
    ] as never);
    const { container } = render(<GoalPathPanel goal={GOAL} />);
    const completedSpan = container.querySelector('.bg-green-50');
    expect(completedSpan).toBeInTheDocument();
  });

  it('renders with 0 completed steps', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: {
          myLearningPath: { ...MOCK_PATH, completedSteps: 0, nodes: [] },
        },
        fetching: false,
      },
      vi.fn(),
    ] as never);
    render(<GoalPathPanel goal={GOAL} />);
    expect(screen.getByText('0/4 steps completed')).toBeInTheDocument();
  });
});
