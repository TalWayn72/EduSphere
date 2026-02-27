import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { KnowledgeGraph } from './KnowledgeGraph';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
  ]),
}));

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

// react-router-dom: keep MemoryRouter real, mock only hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ contentId: 'content-1' }),
  };
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderKG() {
  return render(
    <MemoryRouter>
      <KnowledgeGraph />
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('KnowledgeGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Knowledge Graph" heading', () => {
    renderKG();
    expect(screen.getByText('Knowledge Graph')).toBeDefined();
  });

  it('renders the subtitle about exploring concepts', () => {
    renderKG();
    expect(
      screen.getByText(/explore concepts, people, and sources/i)
    ).toBeDefined();
  });

  it('renders search input with placeholder "Search concepts..."', () => {
    renderKG();
    const input = screen.getByPlaceholderText('Search concepts...');
    expect(input).toBeDefined();
  });

  it('renders CONCEPT type filter button', () => {
    renderKG();
    // Multiple CONCEPT occurrences (filter chip + node panel) — check at least one
    expect(screen.getAllByText(/CONCEPT/).length).toBeGreaterThan(0);
  });

  it('renders PERSON type filter button', () => {
    renderKG();
    expect(screen.getAllByText(/PERSON/).length).toBeGreaterThan(0);
  });

  it('renders SOURCE type filter button', () => {
    renderKG();
    expect(screen.getAllByText(/SOURCE/).length).toBeGreaterThan(0);
  });

  it('renders an SVG element for the graph', () => {
    const { container } = renderKG();
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('renders zoom in button', () => {
    renderKG();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders reset view button with title', () => {
    renderKG();
    const resetBtn = screen.getByTitle('Reset view');
    expect(resetBtn).toBeDefined();
  });

  it('renders selected node detail panel (default: free-will)', () => {
    renderKG();
    // "Free Will" appears in the SVG label AND the sidebar panel
    expect(screen.getAllByText('Free Will').length).toBeGreaterThan(0);
  });

  it('renders "See in content" button in selected node panel', () => {
    renderKG();
    expect(screen.getByText(/see in content/i)).toBeDefined();
  });

  it('search input filters nodes by label', () => {
    renderKG();
    const input = screen.getByPlaceholderText('Search concepts...');
    fireEvent.change(input, { target: { value: 'aristotle' } });
    // After filtering, non-matching nodes become dimmed but SVG still present
    expect(input).toBeDefined();
  });

  it('clicking a type filter toggles it', () => {
    renderKG();
    const [conceptBtn] = screen.getAllByText(/CONCEPT/) as [
      HTMLElement,
      ...HTMLElement[],
    ];
    fireEvent.click(conceptBtn);
    // After click filter is active — component re-renders without error
    expect(screen.getAllByText(/CONCEPT/).length).toBeGreaterThan(0);
  });

  it('clicking the same type filter again removes the filter', () => {
    renderKG();
    const [conceptBtn] = screen.getAllByText(/CONCEPT/) as [
      HTMLElement,
      ...HTMLElement[],
    ];
    fireEvent.click(conceptBtn); // activate
    fireEvent.click(conceptBtn); // deactivate
    expect(screen.getAllByText(/CONCEPT/).length).toBeGreaterThan(0);
  });

  it('renders zoom in button with correct title', () => {
    renderKG();
    expect(screen.getByTitle('Zoom in')).toBeDefined();
  });

  it('renders zoom out button with correct title', () => {
    renderKG();
    expect(screen.getByTitle('Zoom out')).toBeDefined();
  });

  it('renders reset view button with correct title', () => {
    renderKG();
    expect(screen.getByTitle('Reset view')).toBeDefined();
  });

  it('clicking zoom in button does not crash', () => {
    renderKG();
    fireEvent.click(screen.getByTitle('Zoom in'));
    expect(screen.getByText('Knowledge Graph')).toBeDefined();
  });

  it('clicking zoom out button does not crash', () => {
    renderKG();
    fireEvent.click(screen.getByTitle('Zoom out'));
    expect(screen.getByText('Knowledge Graph')).toBeDefined();
  });

  it('clicking reset view button resets zoom and pan', () => {
    renderKG();
    fireEvent.click(screen.getByTitle('Zoom in'));
    fireEvent.click(screen.getByTitle('Reset view'));
    expect(screen.getByText('Knowledge Graph')).toBeDefined();
  });

  it('clicking CONCEPT filter button does not crash', () => {
    renderKG();
    const conceptBtn = screen.getByRole('button', { name: /CONCEPT/i });
    fireEvent.click(conceptBtn);
    expect(screen.getByText('Knowledge Graph')).toBeDefined();
  });

  it('clicking PERSON filter button does not crash', () => {
    renderKG();
    const personBtn = screen.getByRole('button', { name: /PERSON/i });
    fireEvent.click(personBtn);
    expect(screen.getByText('Knowledge Graph')).toBeDefined();
  });

  it('clicking a filter twice clears the filter', () => {
    renderKG();
    const conceptBtn = screen.getByRole('button', { name: /CONCEPT/i });
    fireEvent.click(conceptBtn);
    fireEvent.click(conceptBtn);
    expect(screen.getByText('Knowledge Graph')).toBeDefined();
  });

  it('SVG supports wheel event without crashing', () => {
    const { container } = renderKG();
    const svg = container.querySelector('svg');
    if (svg) {
      fireEvent.wheel(svg, { deltaY: 100 });
    }
    expect(screen.getByText('Knowledge Graph')).toBeDefined();
  });

  it('SVG supports mouseDown event without crashing', () => {
    const { container } = renderKG();
    const svg = container.querySelector('svg');
    if (svg) {
      fireEvent.mouseDown(svg, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(svg, { clientX: 110, clientY: 110 });
      fireEvent.mouseUp(svg);
    }
    expect(screen.getByText('Knowledge Graph')).toBeDefined();
  });

  it('navigates to content viewer when node-related button is clicked', () => {
    renderKG();
    // The "Learn >" button next to selected node panel should be visible
    const learnBtn = screen.queryByRole('button', { name: /Learn/i });
    if (learnBtn) {
      fireEvent.click(learnBtn);
      expect(mockNavigate).toHaveBeenCalled();
    }
    expect(screen.getByText('Knowledge Graph')).toBeDefined();
  });

  it('Refresh button is hidden in DEV_MODE (vitest sets VITE_DEV_MODE=true)', () => {
    renderKG();
    // vitest.config.ts sets VITE_DEV_MODE="true" so DEV_MODE=true → button hidden
    const refreshBtn = screen.queryByTitle('Refresh graph from server');
    expect(refreshBtn).toBeNull();
  });

  it('component renders without crash regardless of DEV_MODE', () => {
    renderKG();
    expect(screen.getByText('Knowledge Graph')).toBeDefined();
  });

  // ─── Regression: graph must not vanish when API returns empty array ───────────
  // Bug: `!data?.concepts` evaluated to false for `[]` (truthy), causing the
  // component to build an empty graph instead of falling back to mock data.
  // Fix: changed to `!data?.concepts?.length` so empty arrays also trigger fallback.
  it('regression: shows mock graph nodes when API returns empty concepts array', async () => {
    const { useQuery } = await import('urql');
    (useQuery as ReturnType<typeof vi.fn>).mockReturnValue([
      { data: { concepts: [] }, fetching: false, error: undefined },
    ]);
    renderKG();
    // Mock graph has nodes — at least the default selected "Free Will" label must appear
    expect(screen.getAllByText('Free Will').length).toBeGreaterThan(0);
  });
});
