import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/portal-builder/BlockPalette', () => ({
  BlockPalette: vi.fn(() => <div data-testid="block-palette" />),
}));

vi.mock('@/components/portal-builder/CanvasDropZone', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CanvasDropZone: vi.fn(({ blocks }: any) => (
    <div data-testid="canvas-drop-zone">
      <span data-testid="block-count">{blocks.length}</span>
    </div>
  )),
}));

vi.mock('@/lib/graphql/portal.queries', () => ({
  MY_PORTAL_QUERY: 'MY_PORTAL_QUERY',
  SAVE_PORTAL_LAYOUT_MUTATION: 'SAVE_PORTAL_LAYOUT_MUTATION',
  PUBLISH_PORTAL_MUTATION: 'PUBLISH_PORTAL_MUTATION',
  UNPUBLISH_PORTAL_MUTATION: 'UNPUBLISH_PORTAL_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { PortalBuilderPage } from './PortalBuilderPage';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_EXECUTE = vi.fn().mockResolvedValue({ error: undefined });

function setupUrql(portal?: { title: string; published: boolean; blocks: [] }) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: portal ? { myPortal: portal } : { myPortal: undefined },
      fetching: false,
      error: undefined,
    },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false },
    MOCK_EXECUTE,
  ] as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PortalBuilderPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PortalBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MOCK_EXECUTE.mockResolvedValue({ error: undefined });
    setupUrql();
  });

  it('renders the portal title input', () => {
    renderPage();
    expect(screen.getByLabelText(/portal title/i)).toBeInTheDocument();
  });

  it('shows default title "Learning Portal" when no server data', () => {
    renderPage();
    expect(screen.getByDisplayValue('Learning Portal')).toBeInTheDocument();
  });

  it('shows server portal title when available', () => {
    setupUrql({ title: 'Customer Academy', published: false, blocks: [] });
    renderPage();
    expect(screen.getByDisplayValue('Customer Academy')).toBeInTheDocument();
  });

  it('renders "Save Draft" button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /save draft/i })
    ).toBeInTheDocument();
  });

  it('renders "Publish" button when portal is not published', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /^publish$/i })
    ).toBeInTheDocument();
  });

  it('renders "Unpublish" button when portal is published', () => {
    setupUrql({ title: 'My Portal', published: true, blocks: [] });
    renderPage();
    expect(
      screen.getByRole('button', { name: /unpublish/i })
    ).toBeInTheDocument();
  });

  it('renders the BlockPalette component', () => {
    renderPage();
    expect(screen.getByTestId('block-palette')).toBeInTheDocument();
  });

  it('renders the CanvasDropZone component', () => {
    renderPage();
    expect(screen.getByTestId('canvas-drop-zone')).toBeInTheDocument();
  });

  it('starts with 0 blocks when no server data', () => {
    renderPage();
    expect(screen.getByTestId('block-count').textContent).toBe('0');
  });

  it('allows updating the portal title', () => {
    renderPage();
    const titleInput = screen.getByLabelText(/portal title/i);
    fireEvent.change(titleInput, { target: { value: 'My Custom Portal' } });
    expect(screen.getByDisplayValue('My Custom Portal')).toBeInTheDocument();
  });

  it('"Save Draft" button is not disabled initially', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /save draft/i })
    ).not.toBeDisabled();
  });
});
