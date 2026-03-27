/**
 * Tests for EmbeddingActivityLog component.
 * Verifies table rendering, auto-refresh polling, and visibility-change pause.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { EmbeddingActivityLog } from './EmbeddingActivityLog';
import type { EmbeddingActivity } from './EmbeddingActivityLog';

// ── urql mock ──────────────────────────────────────────────────────────
const mockReexecute = vi.fn();
let mockResult: {
  data: { embeddingActivity: EmbeddingActivity[] } | undefined;
  fetching: boolean;
  error: Error | undefined;
};

vi.mock('urql', () => ({
  useQuery: () => [mockResult, mockReexecute],
  gql: (strings: TemplateStringsArray) => strings.join(''),
}));

vi.mock('@/lib/graphql/embedding.queries', () => ({
  EMBEDDING_ACTIVITY_QUERY: 'query EmbeddingActivity',
}));

const ACTIVITIES: EmbeddingActivity[] = [
  {
    id: 'a1',
    timestamp: '2026-03-27T10:00:00Z',
    courseName: 'Intro to AI',
    operation: 'index',
    status: 'completed',
    count: 42,
  },
  {
    id: 'a2',
    timestamp: '2026-03-27T09:30:00Z',
    courseName: 'Machine Learning',
    operation: 'reindex',
    status: 'in_progress',
    count: 15,
  },
  {
    id: 'a3',
    timestamp: '2026-03-27T09:00:00Z',
    courseName: 'Deep Learning',
    operation: 'index',
    status: 'failed',
    count: 0,
  },
];

describe('EmbeddingActivityLog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockResult = { data: { embeddingActivity: ACTIVITIES }, fetching: false, error: undefined };
    mockReexecute.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the activity table with rows', () => {
    render(<EmbeddingActivityLog />);
    expect(screen.getByTestId('embedding-activity-log')).toBeInTheDocument();
    expect(screen.getByTestId('activity-row-a1')).toBeInTheDocument();
    expect(screen.getByTestId('activity-row-a2')).toBeInTheDocument();
    expect(screen.getByTestId('activity-row-a3')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<EmbeddingActivityLog />);
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.getByText('Course')).toBeInTheDocument();
    expect(screen.getByText('Operation')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Count')).toBeInTheDocument();
  });

  it('renders status badges for each status type', () => {
    render(<EmbeddingActivityLog />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('shows loading skeleton when fetching with no data', () => {
    mockResult = { data: undefined, fetching: true, error: undefined };
    render(<EmbeddingActivityLog />);
    expect(screen.getByTestId('embedding-activity-log')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('shows error state when query fails', () => {
    mockResult = { data: undefined, fetching: false, error: new Error('fail') };
    render(<EmbeddingActivityLog />);
    expect(screen.getByText(/Failed to load activity log/)).toBeInTheDocument();
  });

  it('shows empty state when no activities', () => {
    mockResult = { data: { embeddingActivity: [] }, fetching: false, error: undefined };
    render(<EmbeddingActivityLog />);
    expect(screen.getByText(/No recent embedding operations/)).toBeInTheDocument();
  });

  it('auto-refreshes every 30 seconds', () => {
    render(<EmbeddingActivityLog />);
    expect(mockReexecute).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(30_000); });
    expect(mockReexecute).toHaveBeenCalledTimes(1);

    act(() => { vi.advanceTimersByTime(30_000); });
    expect(mockReexecute).toHaveBeenCalledTimes(2);
  });

  it('clears interval on unmount (memory safe)', () => {
    const { unmount } = render(<EmbeddingActivityLog />);
    unmount();

    mockReexecute.mockClear();
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(mockReexecute).not.toHaveBeenCalled();
  });

  it('pauses polling when tab is hidden', () => {
    render(<EmbeddingActivityLog />);

    // Simulate tab becoming hidden
    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });

    mockReexecute.mockClear();
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(mockReexecute).not.toHaveBeenCalled();

    // Restore visibility
    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });

    // Should immediately refresh on becoming visible
    expect(mockReexecute).toHaveBeenCalledTimes(1);
  });

  it('removes visibilitychange listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<EmbeddingActivityLog />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    removeSpy.mockRestore();
  });
});

describe('EmbeddingActivityLog — Accessibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockResult = { data: { embeddingActivity: ACTIVITIES }, fetching: false, error: undefined };
    mockReexecute.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loading skeleton has aria-busy="true" and aria-label', () => {
    mockResult = { data: undefined, fetching: true, error: undefined };
    render(<EmbeddingActivityLog />);
    const content = screen.getByLabelText(/Loading activity log/);
    expect(content).toHaveAttribute('aria-busy', 'true');
  });

  it('error state uses role="alert"', () => {
    mockResult = { data: undefined, fetching: false, error: new Error('fail') };
    render(<EmbeddingActivityLog />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('main content has aria-live="polite" for auto-refresh announcements', () => {
    render(<EmbeddingActivityLog />);
    const content = screen.getByTestId('embedding-activity-log').querySelector('[aria-live="polite"]');
    expect(content).toBeInTheDocument();
  });

  it('table has an accessible name via aria-label', () => {
    render(<EmbeddingActivityLog />);
    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('aria-label');
  });

  it('table headers have scope="col"', () => {
    render(<EmbeddingActivityLog />);
    const headers = screen.getAllByRole('columnheader');
    for (const header of headers) {
      expect(header).toHaveAttribute('scope', 'col');
    }
  });
});
