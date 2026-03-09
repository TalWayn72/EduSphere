import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import * as urql from 'urql';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { SkillPathPage } from './SkillPathPage';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...vals: unknown[]) =>
    strings.reduce((acc: string, s: string, i: number) => acc + s + String(vals[i] ?? ''), ''),
  useQuery: vi.fn(),
}));

vi.mock('@/lib/graphql/skills.queries', () => ({
  SKILL_PATHS_QUERY: 'SKILL_PATHS_QUERY',
  MY_SKILL_PROGRESS_QUERY: 'MY_SKILL_PROGRESS_QUERY',
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/skills/SkillPathCard', () => ({
  SkillPathCard: ({ path }: { path: { title: string } }) => (
    <div data-testid="skill-path-card">{path.title}</div>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOOP_QUERY = [{ data: undefined, fetching: false, error: undefined }] as never;

function renderPage() {
  return render(
    <MemoryRouter>
      <SkillPathPage />
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SkillPathPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders heading "Skill Paths"', () => {
    vi.mocked(urql.useQuery).mockReturnValue(NOOP_QUERY);
    renderPage();
    expect(screen.getByRole('heading', { name: /skill paths/i })).toBeInTheDocument();
  });

  it('renders loading skeleton when fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
    ] as never);
    renderPage();
    // mounted=false on initial render → isLoading=true → skeleton visible immediately
    expect(screen.getByLabelText(/loading skill paths/i)).toBeInTheDocument();
  });

  it('renders empty state when no paths returned', async () => {
    vi.mocked(urql.useQuery).mockImplementation((args) => {
      const query = String((args as { query: unknown }).query);
      if (query.includes('SKILL_PATHS')) {
        return [{ data: { skillPaths: [] }, fetching: false, error: undefined }] as never;
      }
      return [{ data: { mySkillProgress: [] }, fetching: false, error: undefined }] as never;
    });
    await act(async () => { renderPage(); });
    await waitFor(
      () => { expect(screen.getByText(/no skill paths available yet/i)).toBeInTheDocument(); },
      { timeout: 5000 },
    );
  });

  it('renders skill path card title when data is present', async () => {
    const mockPath = {
      id: 'path-1',
      title: 'Frontend Developer Path',
      description: 'Learn frontend skills',
      targetRole: 'Frontend Dev',
      skillIds: ['s1', 's2'],
      estimatedHours: 40,
      isPublished: true,
    };
    vi.mocked(urql.useQuery).mockImplementation((args) => {
      const query = String((args as { query: unknown }).query);
      if (query.includes('SKILL_PATHS')) {
        return [{ data: { skillPaths: [mockPath] }, fetching: false, error: undefined }] as never;
      }
      return [{ data: { mySkillProgress: [] }, fetching: false, error: undefined }] as never;
    });
    await act(async () => { renderPage(); });
    await waitFor(
      () => { expect(screen.getByText('Frontend Developer Path')).toBeInTheDocument(); },
      { timeout: 5000 },
    );
  });
});
