import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useStorageManager', () => ({
  useStorageManager: vi.fn(),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { StorageWarningBanner } from './StorageWarningBanner';
import { useStorageManager } from '@/hooks/useStorageManager';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const APPROACHING_STATS = {
  isUnsupported: false,
  isApproachingLimit: true,
  isOverLimit: false,
  usageRatio: 0.85,
  eduSphereUsedBytes: 42 * 1024 * 1024, // 42 MB
  eduSphereQuotaBytes: 50 * 1024 * 1024, // 50 MB
};

const OVER_LIMIT_STATS = {
  ...APPROACHING_STATS,
  isOverLimit: true,
  usageRatio: 1.02,
  eduSphereUsedBytes: 51 * 1024 * 1024,
};

const CLEAR_FN = vi.fn();

function setupHook(overrides: Record<string, unknown> = {}) {
  vi.mocked(useStorageManager).mockReturnValue({
    stats: APPROACHING_STATS,
    isLoading: false,
    refresh: vi.fn(),
    clearLocalStorage: CLEAR_FN,
    ...overrides,
  } as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StorageWarningBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupHook();
  });

  it('renders nothing while loading', () => {
    setupHook({ isLoading: true });
    const { container } = render(<StorageWarningBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when stats is null', () => {
    setupHook({ stats: null });
    const { container } = render(<StorageWarningBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when storage API is unsupported', () => {
    setupHook({ stats: { ...APPROACHING_STATS, isUnsupported: true } });
    const { container } = render(<StorageWarningBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when not approaching limit', () => {
    setupHook({ stats: { ...APPROACHING_STATS, isApproachingLimit: false } });
    const { container } = render(<StorageWarningBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the approaching-limit warning message', () => {
    render(<StorageWarningBanner />);
    expect(
      screen.getByText(/offline storage is nearly full/i)
    ).toBeInTheDocument();
  });

  it('renders the over-limit warning message when storage is full', () => {
    setupHook({ stats: OVER_LIMIT_STATS });
    render(<StorageWarningBanner />);
    expect(screen.getByText(/offline storage is full/i)).toBeInTheDocument();
  });

  it('renders "Clear Query Cache" button', () => {
    render(<StorageWarningBanner />);
    expect(
      screen.getByRole('button', { name: /clear query cache/i })
    ).toBeInTheDocument();
  });

  it('calls clearLocalStorage when clear button is clicked', () => {
    render(<StorageWarningBanner />);
    fireEvent.click(screen.getByRole('button', { name: /clear query cache/i }));
    expect(CLEAR_FN).toHaveBeenCalledOnce();
  });

  it('shows formatted usage bytes in the banner', () => {
    render(<StorageWarningBanner />);
    // 42 MB and 50 MB formatted
    expect(screen.getByText(/42\.0 MB/)).toBeInTheDocument();
    expect(screen.getByText(/50\.0 MB/)).toBeInTheDocument();
  });

  it('shows usage percentage in the banner', () => {
    render(<StorageWarningBanner />);
    // usageRatio=0.85 → 85%
    expect(screen.getByText(/85%/)).toBeInTheDocument();
  });
});
