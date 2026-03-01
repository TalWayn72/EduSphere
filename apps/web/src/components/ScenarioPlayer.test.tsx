import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as urql from 'urql';
import { ScenarioPlayer } from './ScenarioPlayer';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

const NOOP_EXECUTE = vi.fn().mockResolvedValue({ data: null, error: undefined });

const makeNode = (overrides = {}) => ({
  id: 'node-1',
  title: 'The Beginning',
  description: 'You stand at a crossroads. What do you do?',
  choices: [
    { id: 'c1', text: 'Go left', nextContentItemId: 'node-2' },
    { id: 'c2', text: 'Go right', nextContentItemId: 'node-3' },
  ],
  isEndNode: false,
  ...overrides,
});

describe('ScenarioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false } as urql.OperationResultState,
      NOOP_EXECUTE,
    ]);
  });

  it('renders the initial node title', () => {
    render(
      <ScenarioPlayer
        rootContentItemId="root-1"
        initialNode={makeNode()}
      />
    );
    expect(screen.getAllByText('The Beginning')[0]).toBeInTheDocument();
  });

  it('renders the initial node description', () => {
    render(
      <ScenarioPlayer
        rootContentItemId="root-1"
        initialNode={makeNode()}
      />
    );
    expect(
      screen.getByText('You stand at a crossroads. What do you do?')
    ).toBeInTheDocument();
  });

  it('renders all choice buttons', () => {
    render(
      <ScenarioPlayer
        rootContentItemId="root-1"
        initialNode={makeNode()}
      />
    );
    expect(screen.getByRole('button', { name: 'Go left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go right' })).toBeInTheDocument();
  });

  it('renders breadcrumb with initial node title', () => {
    render(
      <ScenarioPlayer
        rootContentItemId="root-1"
        initialNode={makeNode()}
      />
    );
    const nav = screen.getByRole('navigation', { name: 'Scenario path' });
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveTextContent('The Beginning');
  });

  it('advances to next node after choosing an option', async () => {
    const nextNode = makeNode({
      id: 'node-2',
      title: 'The Left Path',
      description: 'You chose wisely.',
      choices: [],
      isEndNode: true,
      endingType: 'SUCCESS',
    });

    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false } as urql.OperationResultState,
      vi.fn().mockResolvedValue({
        data: { recordScenarioChoice: nextNode },
        error: undefined,
      }),
    ]);

    render(
      <ScenarioPlayer
        rootContentItemId="root-1"
        initialNode={makeNode()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go left' }));

    await waitFor(() => {
      expect(screen.getByText('The Left Path')).toBeInTheDocument();
    });
  });

  it('shows end node SUCCESS view when isEndNode is true', () => {
    render(
      <ScenarioPlayer
        rootContentItemId="root-1"
        initialNode={makeNode({ isEndNode: true, endingType: 'SUCCESS', choices: [] })}
      />
    );
    expect(
      screen.getByText('Congratulations! You completed this path successfully.')
    ).toBeInTheDocument();
  });

  it('shows end node FAILURE label when endingType is FAILURE', () => {
    render(
      <ScenarioPlayer
        rootContentItemId="root-1"
        initialNode={makeNode({ isEndNode: true, endingType: 'FAILURE', choices: [] })}
      />
    );
    expect(
      screen.getByText('This path did not lead to the best outcome. Try again?')
    ).toBeInTheDocument();
  });

  it('shows Try Again button on end node and resets on click', async () => {
    render(
      <ScenarioPlayer
        rootContentItemId="root-1"
        initialNode={makeNode({ isEndNode: true, endingType: 'NEUTRAL', choices: [] })}
      />
    );
    const tryAgainBtn = screen.getByRole('button', { name: /Try Again/i });
    expect(tryAgainBtn).toBeInTheDocument();
    fireEvent.click(tryAgainBtn);
    // After restart, should show the initial node title again
    await waitFor(() => {
      expect(screen.getByText('The Beginning')).toBeInTheDocument();
    });
  });

  it('does not navigate when recordChoice returns an error', async () => {
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false } as urql.OperationResultState,
      vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'GraphQL error' },
      }),
    ]);

    render(
      <ScenarioPlayer
        rootContentItemId="root-1"
        initialNode={makeNode()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go left' }));

    await waitFor(() => {
      // Title should remain unchanged
      expect(screen.getAllByText('The Beginning')[0]).toBeInTheDocument();
    });
  });
});
