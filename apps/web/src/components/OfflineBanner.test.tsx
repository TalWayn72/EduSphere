/**
 * OfflineBanner — unit tests.
 *
 * REGRESSION: banner must have role="status" (accessibility requirement).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineBanner } from './OfflineBanner';

// Mock hooks
vi.mock('@/hooks/useOfflineStatus', () => ({
  useOfflineStatus: vi.fn(),
}));
vi.mock('@/hooks/useOfflineQueue', () => ({
  useOfflineQueue: vi.fn(),
}));

import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

const mockUseOfflineStatus = vi.mocked(useOfflineStatus);
const mockUseOfflineQueue = vi.mocked(useOfflineQueue);

function setNetworkState(isOnline: boolean, pendingCount = 0) {
  mockUseOfflineStatus.mockReturnValue({
    isOnline,
    isOffline: !isOnline,
    lastOnlineAt: isOnline ? new Date() : null,
  });
  mockUseOfflineQueue.mockReturnValue({
    queue: Array.from({ length: pendingCount }, (_, i) => ({
      id: `item-${i}`,
      operationName: 'Op',
      variables: {},
      createdAt: Date.now(),
    })),
    enqueue: vi.fn(),
    flush: vi.fn(),
    clear: vi.fn(),
    pendingCount,
  });
}

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is not visible when online', () => {
    setNetworkState(true);
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('offline-banner')).toBeNull();
  });

  it('is visible when offline', () => {
    setNetworkState(false);
    render(<OfflineBanner />);
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    expect(screen.getByText(/No internet connection/i)).toBeInTheDocument();
  });

  it('shows pending count when queue has items', () => {
    setNetworkState(false, 3);
    render(<OfflineBanner />);
    expect(screen.getByText(/3 changes pending sync/i)).toBeInTheDocument();
  });

  it('does not show pending count when queue is empty', () => {
    setNetworkState(false, 0);
    render(<OfflineBanner />);
    expect(screen.queryByText(/pending sync/i)).toBeNull();
  });

  // REGRESSION: accessibility requirement — must have role="status"
  it('has correct aria role="status"', () => {
    setNetworkState(false);
    render(<OfflineBanner />);
    const banner = screen.getByRole('status');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('data-testid', 'offline-banner');
  });

  it('has aria-live="polite" for accessibility', () => {
    setNetworkState(false);
    render(<OfflineBanner />);
    const banner = screen.getByTestId('offline-banner');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });

  it('has aria-atomic="true"', () => {
    setNetworkState(false);
    render(<OfflineBanner />);
    const banner = screen.getByTestId('offline-banner');
    expect(banner).toHaveAttribute('aria-atomic', 'true');
  });

  it('disappears when network is restored (re-render)', () => {
    setNetworkState(false);
    const { rerender } = render(<OfflineBanner />);
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();

    setNetworkState(true);
    rerender(<OfflineBanner />);
    expect(screen.queryByTestId('offline-banner')).toBeNull();
  });

  it('REGRESSION: banner text does not contain raw technical error strings', () => {
    setNetworkState(false);
    render(<OfflineBanner />);
    const banner = screen.getByTestId('offline-banner');
    // Ensure no raw tech strings visible to users
    expect(banner.textContent).not.toContain('undefined');
    expect(banner.textContent).not.toContain('null');
    expect(banner.textContent).not.toContain('Error:');
    expect(banner.textContent).not.toContain('TypeError');
  });
});
