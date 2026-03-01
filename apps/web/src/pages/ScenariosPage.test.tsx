import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, str, i) => acc + str + (String(values[i] ?? '')), ''),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/RoleplaySimulator', () => ({
  RoleplaySimulator: ({
    scenario,
    onClose,
  }: {
    scenario: { title: string };
    onClose: () => void;
  }) => (
    <div data-testid="roleplay-simulator">
      <span>Simulator:{scenario.title}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('@/lib/graphql/roleplay.queries', () => ({
  SCENARIO_TEMPLATES_QUERY: 'SCENARIO_TEMPLATES_QUERY',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { ScenariosPage } from './ScenariosPage';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_SCENARIOS = [
  {
    id: 's1',
    title: 'Sales Pitch Pro',
    domain: 'sales',
    difficultyLevel: 'BEGINNER',
    sceneDescription: 'Practice a cold call sales scenario.',
    maxTurns: 10,
    isBuiltin: true,
  },
  {
    id: 's2',
    title: 'Patient Consultation',
    domain: 'healthcare',
    difficultyLevel: 'ADVANCED',
    sceneDescription: 'Handle a difficult patient conversation.',
    maxTurns: 15,
    isBuiltin: false,
  },
];

function setupQuery(opts: {
  fetching?: boolean;
  error?: Error | null;
  scenarios?: typeof MOCK_SCENARIOS | null;
}) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      fetching: opts.fetching ?? false,
      error: opts.error ?? undefined,
      data: opts.scenarios ? { scenarioTemplates: opts.scenarios } : undefined,
    },
    vi.fn(),
    vi.fn(),
  ] as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ScenariosPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScenariosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupQuery({});
  });

  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByText('Role-Play Scenarios')).toBeInTheDocument();
  });

  it('renders the "Create Scenario" button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /create scenario/i })).toBeInTheDocument();
  });

  it('shows loading skeletons while fetching', () => {
    setupQuery({ fetching: true });
    const { container } = renderPage();
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error message when query fails', () => {
    setupQuery({ error: new Error('Network failed') });
    renderPage();
    expect(screen.getByText(/failed to load scenarios/i)).toBeInTheDocument();
    expect(screen.getByText(/network failed/i)).toBeInTheDocument();
  });

  it('shows empty state when no scenarios are returned', () => {
    setupQuery({ scenarios: null });
    renderPage();
    expect(
      screen.getByText(/no scenarios available yet/i)
    ).toBeInTheDocument();
  });

  it('renders scenario cards from query data', () => {
    setupQuery({ scenarios: MOCK_SCENARIOS });
    renderPage();
    expect(screen.getByText('Sales Pitch Pro')).toBeInTheDocument();
    expect(screen.getByText('Patient Consultation')).toBeInTheDocument();
  });

  it('renders difficulty badges on scenario cards', () => {
    setupQuery({ scenarios: MOCK_SCENARIOS });
    renderPage();
    expect(screen.getByText('BEGINNER')).toBeInTheDocument();
    expect(screen.getByText('ADVANCED')).toBeInTheDocument();
  });

  it('clicking a scenario card opens the RoleplaySimulator', () => {
    setupQuery({ scenarios: MOCK_SCENARIOS });
    renderPage();
    fireEvent.click(screen.getByText('Sales Pitch Pro'));
    expect(screen.getByTestId('roleplay-simulator')).toBeInTheDocument();
    expect(screen.getByText('Simulator:Sales Pitch Pro')).toBeInTheDocument();
  });

  it('closing the simulator returns to the scenario grid', () => {
    setupQuery({ scenarios: MOCK_SCENARIOS });
    renderPage();
    fireEvent.click(screen.getByText('Sales Pitch Pro'));
    expect(screen.getByTestId('roleplay-simulator')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByTestId('roleplay-simulator')).not.toBeInTheDocument();
    expect(screen.getByText('Role-Play Scenarios')).toBeInTheDocument();
  });

  it('renders scene descriptions on cards', () => {
    setupQuery({ scenarios: MOCK_SCENARIOS });
    renderPage();
    expect(screen.getByText('Practice a cold call sales scenario.')).toBeInTheDocument();
  });
});
