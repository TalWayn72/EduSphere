/**
 * AdminActivityFeed — component tests.
 *
 * Covers:
 *  - Renders without crash
 *  - Shows loading skeleton
 *  - Shows activity items when data is provided
 *  - Shows empty state when items=[]
 *  - "View all" link points to /admin/audit-log
 *  - Memory safety: interval cleared on unmount
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminActivityFeed, type ActivityItem } from './AdminActivityFeed';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'activityFeed.title': 'Recent Activity',
        'activityFeed.noActivity': 'No recent activity',
        'activityFeed.viewAll': 'View all',
      };
      return map[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  CardHeader: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ─── Sample data ──────────────────────────────────────────────────────────────

const SAMPLE_ITEMS: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'USER_ENROLLED',
    description: 'Student enrolled in "Philosophy 101"',
    userId: 'u1',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'act-2',
    type: 'LESSON_CREATED',
    description: 'Instructor created lesson "Ethics"',
    userId: 'u2',
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderFeed(props: React.ComponentProps<typeof AdminActivityFeed> = {}) {
  return render(
    <MemoryRouter>
      {/* Disable auto-refresh to avoid leaky timers in tests */}
      <AdminActivityFeed refreshIntervalMs={0} {...props} />
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AdminActivityFeed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders without crash', () => {
    renderFeed();
    expect(screen.getByTestId('admin-activity-feed')).toBeDefined();
  });

  it('shows "Recent Activity" title', () => {
    renderFeed();
    expect(screen.getByText('Recent Activity')).toBeDefined();
  });

  it('shows loading skeleton when loading=true', () => {
    renderFeed({ loading: true });
    expect(screen.getByTestId('activity-skeleton')).toBeDefined();
  });

  it('does NOT show item list while loading', () => {
    renderFeed({ loading: true });
    expect(screen.queryByTestId('activity-feed-list')).toBeNull();
  });

  it('shows empty state when items=[]', () => {
    renderFeed({ items: [] });
    expect(screen.getByTestId('activity-feed-empty')).toBeDefined();
    expect(screen.getByText('No recent activity')).toBeDefined();
  });

  it('shows activity items when items are provided', () => {
    renderFeed({ items: SAMPLE_ITEMS });
    expect(screen.getByTestId('activity-feed-list')).toBeDefined();
    expect(
      screen.getByText('Student enrolled in "Philosophy 101"')
    ).toBeDefined();
    expect(
      screen.getByText('Instructor created lesson "Ethics"')
    ).toBeDefined();
  });

  it('shows at most 10 items even if more are provided', () => {
    const manyItems: ActivityItem[] = Array.from({ length: 15 }, (_, i) => ({
      id: `act-${i}`,
      type: 'USER_ENROLLED' as const,
      description: `Activity ${i}`,
      createdAt: new Date().toISOString(),
    }));
    renderFeed({ items: manyItems });
    const listItems = screen
      .getByTestId('activity-feed-list')
      .querySelectorAll('[data-testid^="activity-item-"]');
    expect(listItems.length).toBe(10);
  });

  it('"View all" link points to /admin/audit-log', () => {
    const { container } = renderFeed();
    const link = screen.getByTestId('activity-feed-view-all');
    expect(link.getAttribute('href')).toBe('/admin/audit-log');
    void container;
  });

  it('"View all" link text is "View all"', () => {
    renderFeed();
    expect(screen.getByText('View all')).toBeDefined();
  });

  it('uses mock data when no items prop is provided', () => {
    renderFeed();
    // Mock data includes "Student enrolled in..." entries
    const list = screen.getByTestId('activity-feed-list');
    expect(list).toBeDefined();
    // At least one activity item rendered
    const items = list.querySelectorAll('[data-testid^="activity-item-"]');
    expect(items.length).toBeGreaterThan(0);
  });

  // ─── Memory safety test ────────────────────────────────────────────────────
  it('clears auto-refresh interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = render(
      <MemoryRouter>
        {/* Use a real interval so the cleanup is exercised */}
        <AdminActivityFeed refreshIntervalMs={60_000} />
      </MemoryRouter>
    );
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('does NOT set an interval when refreshIntervalMs=0', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    renderFeed({ refreshIntervalMs: 0 });
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  // ─── ARIA attribute tests ──────────────────────────────────────────────────

  it('feed container has role="log"', () => {
    renderFeed();
    const feed = screen.getByTestId('admin-activity-feed');
    expect(feed).toHaveAttribute('role', 'log');
  });

  it('feed container has aria-live="polite"', () => {
    renderFeed();
    const feed = screen.getByTestId('admin-activity-feed');
    expect(feed).toHaveAttribute('aria-live', 'polite');
  });

  it('feed container has aria-atomic="false"', () => {
    renderFeed();
    const feed = screen.getByTestId('admin-activity-feed');
    expect(feed).toHaveAttribute('aria-atomic', 'false');
  });

  it('feed container has aria-label="Activity Feed"', () => {
    renderFeed();
    const feed = screen.getByTestId('admin-activity-feed');
    expect(feed).toHaveAttribute('aria-label', 'Activity Feed');
  });

  // ─── Phase 28: aria-live and role=log on feed container ───────────────────

  it('feed container has aria-live=polite (Phase 28 explicit assertion)', () => {
    renderFeed({ items: SAMPLE_ITEMS });
    // Verify the outer feed container announces updates to screen readers
    const feed = screen.getByTestId('admin-activity-feed');
    expect(feed).toHaveAttribute('aria-live', 'polite');
  });

  it('feed container has role=log (Phase 28 explicit assertion)', () => {
    renderFeed({ items: SAMPLE_ITEMS });
    // role=log is the correct semantic role for activity/audit feeds
    const feed = screen.getByTestId('admin-activity-feed');
    expect(feed).toHaveAttribute('role', 'log');
  });
});
