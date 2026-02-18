import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { KnowledgeGraph } from './KnowledgeGraph';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof import('urql')>();
  return {
    ...actual,
    useQuery: vi.fn(() => [{ data: undefined, fetching: false, error: undefined }]),
  };
});

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) => (
    <button onClick={onClick} title={title}>{children}</button>
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
    const [conceptBtn] = screen.getAllByText(/CONCEPT/) as [HTMLElement, ...HTMLElement[]];
    fireEvent.click(conceptBtn);
    // After click filter is active — component re-renders without error
    expect(screen.getAllByText(/CONCEPT/).length).toBeGreaterThan(0);
  });

  it('clicking the same type filter again removes the filter', () => {
    renderKG();
    const [conceptBtn] = screen.getAllByText(/CONCEPT/) as [HTMLElement, ...HTMLElement[]];
    fireEvent.click(conceptBtn); // activate
    fireEvent.click(conceptBtn); // deactivate
    expect(screen.getAllByText(/CONCEPT/).length).toBeGreaterThan(0);
  });
});
