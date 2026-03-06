/**
 * SkillTreePage tests — verifies query wiring, fallback to sample data,
 * and updateMasteryLevel mutation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as urql from 'urql';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SkillTreePage } from './SkillTreePage';

// Mock Layout to avoid ThemeProvider/sidebar dependencies in unit tests
vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('urql', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  // gql is used at module level in knowledge.queries.ts — must be included in mock
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, s, i) => acc + s + (values[i] ?? ''), ''),
  // CombinedError is used in test assertions
  CombinedError: class CombinedError extends Error {
    networkError?: Error;
    graphQLErrors: unknown[];
    constructor({
      networkError,
      graphQLErrors,
    }: {
      networkError?: Error;
      graphQLErrors?: unknown[];
    }) {
      super(networkError?.message ?? 'CombinedError');
      this.networkError = networkError;
      this.graphQLErrors = graphQLErrors ?? [];
    }
  },
}));

vi.mock('lucide-react', () => ({
  Network: () => <span data-testid="icon-network" />,
  Loader2: () => <span data-testid="icon-loader" />,
}));

const NOOP_QUERY = [{ fetching: false, error: undefined, data: undefined }, vi.fn()] as never;
const NOOP_MUTATION = [{ fetching: false, error: undefined }, vi.fn().mockResolvedValue({})] as never;

function renderPage(courseId = 'all') {
  return render(
    <MemoryRouter initialEntries={[`/skill-tree/${courseId}`]}>
      <Routes>
        <Route path="/skill-tree/:courseId" element={<SkillTreePage />} />
        <Route path="/skill-tree" element={<SkillTreePage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SkillTreePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(urql.useQuery).mockReturnValue(NOOP_QUERY);
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
  });

  it('renders the page title', () => {
    renderPage();
    expect(screen.getByTestId('skill-tree-page-title')).toBeInTheDocument();
  });

  it('shows sample data notice when no API data', () => {
    renderPage();
    expect(screen.getByTestId('skill-tree-sample-notice')).toBeInTheDocument();
  });

  it('shows loading state while fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: true, error: undefined, data: undefined },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('skill-tree-loading')).toBeInTheDocument();
  });

  it('shows error banner on query failure, still renders sample data', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        fetching: false,
        error: new urql.CombinedError({ networkError: new Error('Network error') }),
        data: undefined,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('skill-tree-error')).toBeInTheDocument();
    // Should still render the skill tree with sample data
    expect(screen.getByTestId('skill-tree')).toBeInTheDocument();
  });

  it('renders live API nodes when data is present', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        fetching: false,
        error: undefined,
        data: {
          skillTree: {
            nodes: [
              {
                id: 'node-1',
                label: 'React',
                type: 'CONCEPT',
                masteryLevel: 'FAMILIAR',
                connections: [],
              },
              {
                id: 'node-2',
                label: 'TypeScript',
                type: 'CONCEPT',
                masteryLevel: 'NONE',
                connections: [],
              },
            ],
            edges: [{ source: 'node-1', target: 'node-2' }],
          },
        },
      },
      vi.fn(),
    ] as never);
    renderPage('00000000-0000-0000-0000-000000000001');
    expect(screen.getByTestId('skill-node-node-1')).toBeInTheDocument();
    expect(screen.getByTestId('skill-node-node-2')).toBeInTheDocument();
    // Should NOT show sample notice
    expect(screen.queryByTestId('skill-tree-sample-notice')).not.toBeInTheDocument();
  });

  it('shows node actions panel when a node is clicked with live data', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        fetching: false,
        error: undefined,
        data: {
          skillTree: {
            nodes: [
              {
                id: 'node-1',
                label: 'React',
                type: 'CONCEPT',
                masteryLevel: 'FAMILIAR',
                connections: [],
              },
            ],
            edges: [],
          },
        },
      },
      vi.fn(),
    ] as never);
    renderPage('00000000-0000-0000-0000-000000000001');
    fireEvent.click(screen.getByTestId('skill-node-node-1'));
    expect(screen.getByTestId('skill-tree-node-actions')).toBeInTheDocument();
    expect(screen.getByTestId('advance-mastery-btn')).toBeInTheDocument();
  });

  it('calls updateMastery mutation when Advance Mastery is clicked', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ data: {}, error: undefined });
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false, error: undefined },
      mockUpdate,
    ] as never);
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        fetching: false,
        error: undefined,
        data: {
          skillTree: {
            nodes: [
              {
                id: 'node-1',
                label: 'React',
                type: 'CONCEPT',
                masteryLevel: 'FAMILIAR',
                connections: [],
              },
            ],
            edges: [],
          },
        },
      },
      vi.fn(),
    ] as never);
    renderPage('00000000-0000-0000-0000-000000000001');
    fireEvent.click(screen.getByTestId('skill-node-node-1'));
    fireEvent.click(screen.getByTestId('advance-mastery-btn'));
    expect(mockUpdate).toHaveBeenCalledWith({
      nodeId: 'node-1',
      level: 'PROFICIENT', // FAMILIAR -> PROFICIENT
    });
  });

  it('disables Advance Mastery when node is already mastered', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        fetching: false,
        error: undefined,
        data: {
          skillTree: {
            nodes: [
              {
                id: 'node-1',
                label: 'React',
                type: 'CONCEPT',
                masteryLevel: 'MASTERED',
                connections: [],
              },
            ],
            edges: [],
          },
        },
      },
      vi.fn(),
    ] as never);
    renderPage('00000000-0000-0000-0000-000000000001');
    fireEvent.click(screen.getByTestId('skill-node-node-1'));
    expect(screen.getByTestId('advance-mastery-btn')).toBeDisabled();
  });
});
