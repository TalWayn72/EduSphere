import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, str, i) => acc + str + (String(values[i] ?? '')), ''),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/components/portal-builder/blocks/BlockRenderer', () => ({
  BlockRenderer: ({ block }: { block: { type: string; id: string } }) => (
    <div data-testid={`block-${block.id}`}>Block:{block.type}</div>
  ),
}));

vi.mock('@/lib/graphql/portal.queries', () => ({
  PUBLIC_PORTAL_QUERY: 'PUBLIC_PORTAL_QUERY',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { PortalPage } from './PortalPage';
import * as urql from 'urql';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <PortalPage />
    </MemoryRouter>
  );
}

function setupQuery(state: {
  fetching?: boolean;
  error?: Error | null;
  data?: unknown;
}) {
  vi.mocked(urql.useQuery).mockReturnValue([
    { fetching: state.fetching ?? false, error: state.error ?? undefined, data: state.data },
    vi.fn(),
    vi.fn(),
  ] as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PortalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // default: not fetching, no data, no error
    setupQuery({ fetching: false, data: undefined });
  });

  it('shows loading spinner while fetching', () => {
    setupQuery({ fetching: true });
    const { container } = renderPage();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders null (redirects) when no portal data and not fetching', () => {
    setupQuery({ fetching: false, data: undefined });
    const { container } = renderPage();
    // null render — no main element
    expect(container.querySelector('main')).not.toBeInTheDocument();
  });

  it('renders null when publicPortal is null in data', () => {
    setupQuery({ fetching: false, data: { publicPortal: null } });
    const { container } = renderPage();
    expect(container.querySelector('main')).not.toBeInTheDocument();
  });

  it('renders portal main container when portal data is present', () => {
    setupQuery({
      fetching: false,
      data: {
        publicPortal: {
          blocks: [],
        },
      },
    });
    renderPage();
    expect(screen.getByRole('main', { name: /learning portal/i })).toBeInTheDocument();
  });

  it('shows empty state message when portal has no blocks', () => {
    setupQuery({
      fetching: false,
      data: {
        publicPortal: { blocks: [] },
      },
    });
    renderPage();
    expect(screen.getByText(/portal is being set up/i)).toBeInTheDocument();
  });

  it('renders blocks sorted by order', () => {
    setupQuery({
      fetching: false,
      data: {
        publicPortal: {
          blocks: [
            { id: 'b2', type: 'text', order: 2, config: '{}' },
            { id: 'b1', type: 'hero', order: 1, config: '{}' },
          ],
        },
      },
    });
    renderPage();
    const blocks = screen.getAllByTestId(/^block-/);
    expect(blocks).toHaveLength(2);
    // first rendered block should be order=1 (b1)
    expect(blocks[0]).toHaveAttribute('data-testid', 'block-b1');
    expect(blocks[1]).toHaveAttribute('data-testid', 'block-b2');
  });

  it('renders a section aria-label for each block type', () => {
    setupQuery({
      fetching: false,
      data: {
        publicPortal: {
          blocks: [{ id: 'b1', type: 'hero', order: 1, config: '{}' }],
        },
      },
    });
    renderPage();
    expect(screen.getByRole('region', { name: /hero section/i })).toBeInTheDocument();
  });

  it('handles malformed block config JSON gracefully', () => {
    setupQuery({
      fetching: false,
      data: {
        publicPortal: {
          blocks: [{ id: 'b1', type: 'text', order: 1, config: 'INVALID_JSON' }],
        },
      },
    });
    // Should not throw
    expect(() => renderPage()).not.toThrow();
    expect(screen.getByTestId('block-b1')).toBeInTheDocument();
  });

  it('renders null when there is a fetch error', () => {
    setupQuery({ fetching: false, error: new Error('Network error') });
    const { container } = renderPage();
    expect(container.querySelector('main')).not.toBeInTheDocument();
  });
});
