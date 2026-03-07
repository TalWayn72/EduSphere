/**
 * KnowledgeGraphPage — routing adapter tests.
 *
 * Covers:
 *  - Without courseId: renders global graph (no breadcrumb badge)
 *  - With courseId: renders course-filtered view + shows breadcrumb badge
 *  - /knowledge-graph/:courseId route resolves without crash (regression)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import KnowledgeGraphPage from './KnowledgeGraphPage';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
  ]),
}));

vi.mock('@/lib/auth', () => ({ DEV_MODE: true }));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    title,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    title?: string;
  }) => (
    <button onClick={onClick} title={title}>
      {children}
    </button>
  ),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderWithRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
        <Route path="/knowledge-graph/:courseId" element={<KnowledgeGraphPage />} />
      </Routes>
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('KnowledgeGraphPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('without courseId: renders global Knowledge Graph heading', () => {
    renderWithRoute('/knowledge-graph');
    // Use getByRole to avoid ambiguity — 'Knowledge Graph' appears in both heading and nav items
    expect(screen.getByRole('heading', { name: /knowledge graph/i })).toBeDefined();
  });

  it('without courseId: does NOT show course-context badge', () => {
    renderWithRoute('/knowledge-graph');
    const badge = screen.queryByTestId('kg-course-context-badge');
    expect(badge).toBeNull();
  });

  it('without courseId: shows subtitle about exploring concepts', () => {
    renderWithRoute('/knowledge-graph');
    expect(
      screen.getByText(/explore concepts, people, and sources/i)
    ).toBeDefined();
  });

  it('with courseId: renders without crash', () => {
    renderWithRoute('/knowledge-graph/course-abc-123');
    // Layout is rendered
    expect(screen.getByTestId('layout')).toBeDefined();
  });

  it('with courseId: shows course-context badge', () => {
    renderWithRoute('/knowledge-graph/course-abc-123');
    const badge = screen.getByTestId('kg-course-context-badge');
    expect(badge).toBeDefined();
  });

  it('with courseId: breadcrumb contains "Course Knowledge Graph"', () => {
    renderWithRoute('/knowledge-graph/course-abc-123');
    // Course Knowledge Graph appears in heading + breadcrumb
    const elements = screen.getAllByText('Course Knowledge Graph');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('with courseId: shows filtered-by text containing the courseId', () => {
    renderWithRoute('/knowledge-graph/course-abc-123');
    expect(screen.getByText(/course-abc-123/i)).toBeDefined();
  });

  // Regression: /knowledge-graph/:courseId must not crash
  it('regression: /knowledge-graph/:courseId route resolves without crash', () => {
    expect(() => renderWithRoute('/knowledge-graph/some-course-id')).not.toThrow();
  });

  // Regression: global route must still work
  it('regression: /knowledge-graph (no params) route resolves without crash', () => {
    expect(() => renderWithRoute('/knowledge-graph')).not.toThrow();
  });
});
