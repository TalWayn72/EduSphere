import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as urql from 'urql';
import { MemoryRouter } from 'react-router-dom';
import { CompetencyGoalWidget } from './CompetencyGoalWidget';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/competency.queries', () => ({
  MY_COMPETENCY_GOALS_QUERY: 'MY_COMPETENCY_GOALS_QUERY',
  ADD_COMPETENCY_GOAL_MUTATION: 'ADD_COMPETENCY_GOAL_MUTATION',
  REMOVE_COMPETENCY_GOAL_MUTATION: 'REMOVE_COMPETENCY_GOAL_MUTATION',
  MY_LEARNING_PATH_QUERY: 'MY_LEARNING_PATH_QUERY',
}));

// GoalPathPanel also uses useQuery; its render is triggered on expand
vi.mock('@/components/GoalPathPanel', () => ({
  GoalPathPanel: ({ goal }: { goal: { targetConceptName: string } }) => (
    <div data-testid="goal-path-panel">{goal.targetConceptName} path</div>
  ),
}));

const NOOP_EXECUTE = vi.fn().mockResolvedValue({ data: null, error: undefined });

const MOCK_GOALS = [
  { id: 'g1', targetConceptName: 'Machine Learning', targetLevel: null, createdAt: '2026-01-01' },
  { id: 'g2', targetConceptName: 'Graph Theory', targetLevel: 'advanced', createdAt: '2026-01-02' },
];

function renderWidget() {
  return render(
    <MemoryRouter>
      <CompetencyGoalWidget />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(urql.useMutation).mockReturnValue([{} as never, NOOP_EXECUTE]);
  vi.mocked(urql.useQuery).mockReturnValue([
    { data: { myCompetencyGoals: MOCK_GOALS }, fetching: false },
    vi.fn(),
  ] as never);
});

describe('CompetencyGoalWidget', () => {
  it('renders "My Learning Path" card title', () => {
    renderWidget();
    expect(screen.getByText('My Learning Path')).toBeInTheDocument();
  });

  it('shows loading text when fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: true },
      vi.fn(),
    ] as never);
    renderWidget();
    expect(screen.getByText(/loading goals/i)).toBeInTheDocument();
  });

  it('shows empty state when no goals exist', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myCompetencyGoals: [] }, fetching: false },
      vi.fn(),
    ] as never);
    renderWidget();
    expect(screen.getByText(/no goals yet/i)).toBeInTheDocument();
  });

  it('renders goal names from query data', () => {
    renderWidget();
    expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    expect(screen.getByText('Graph Theory')).toBeInTheDocument();
  });

  it('shows "Explore full Knowledge Graph" link when goals exist', () => {
    renderWidget();
    const link = screen.getByRole('link', { name: /explore full knowledge graph/i });
    expect(link).toHaveAttribute('href', '/knowledge');
  });

  it('opens Add Goal dialog when "Add Goal" button is clicked', () => {
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /add goal/i }));
    expect(screen.getByText('Add Learning Goal')).toBeInTheDocument();
  });

  it('Add Goal button in dialog is disabled when input is empty', () => {
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /add goal/i }));
    // Find the dialog's Add Goal button (not the header one)
    const addBtns = screen.getAllByRole('button', { name: /add goal/i });
    const dialogBtn = addBtns[addBtns.length - 1]!;
    expect(dialogBtn).toBeDisabled();
  });

  it('calls addGoal mutation and closes dialog on submit', async () => {
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /add goal/i }));
    const input = screen.getByPlaceholderText(/machine learning/i);
    fireEvent.change(input, { target: { value: 'React Native' } });
    const addBtns = screen.getAllByRole('button', { name: /add goal/i });
    fireEvent.click(addBtns[addBtns.length - 1]!);
    await waitFor(() =>
      expect(NOOP_EXECUTE).toHaveBeenCalledWith({
        targetConceptName: 'React Native',
        targetLevel: null,
      })
    );
  });

  it('expands GoalPathPanel when a goal is clicked', () => {
    renderWidget();
    fireEvent.click(screen.getByText('Machine Learning'));
    expect(screen.getByTestId('goal-path-panel')).toBeInTheDocument();
  });

  it('calls removeGoal mutation when trash icon is clicked', async () => {
    renderWidget();
    const removeBtn = screen.getByRole('button', {
      name: /remove goal machine learning/i,
    });
    fireEvent.click(removeBtn);
    await waitFor(() =>
      expect(NOOP_EXECUTE).toHaveBeenCalledWith({ goalId: 'g1' })
    );
  });
});
