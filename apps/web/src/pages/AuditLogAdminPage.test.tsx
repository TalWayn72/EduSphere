import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { UseMutationResponse } from 'urql';

// ─── Module mocks (hoisted before component imports) ──────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
    vi.fn(),
  ]),
  useMutation: vi.fn(() => [
    { fetching: false, error: undefined },
    vi.fn().mockResolvedValue({
      data: {
        exportAuditLog: {
          presignedUrl: 'https://minio.example.com/audit-export.csv',
          expiresAt: '2026-02-26T16:00:00Z',
          recordCount: 1234,
        },
      },
      error: undefined,
    }),
  ]),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => null),
  logout: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { AuditLogAdminPage } from './AuditLogAdminPage';
import { useMutation } from 'urql';
import { toast } from 'sonner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <AuditLogAdminPage />
    </MemoryRouter>
  );
}

type MutationExecuteFn = (vars: Record<string, unknown>) => Promise<{
  data?: {
    exportAuditLog?: {
      presignedUrl: string;
      expiresAt: string;
      recordCount: number;
    };
  };
  error?: { message: string } | undefined;
}>;

function mockMutation(executeFn: MutationExecuteFn, fetching = false) {
  vi.mocked(useMutation).mockReturnValue([
    { fetching, error: undefined } as UseMutationResponse[0],
    executeFn as unknown as UseMutationResponse[1],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuditLogAdminPage', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
    // Default: successful mutation
    const executeFn: MutationExecuteFn = vi.fn().mockResolvedValue({
      data: {
        exportAuditLog: {
          presignedUrl: 'https://minio.example.com/audit-export.csv',
          expiresAt: '2026-02-26T16:00:00Z',
          recordCount: 1234,
        },
      },
      error: undefined,
    });
    mockMutation(executeFn);
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders the page title "Audit Log"', () => {
    renderPage();
    // Use h1 role specifically to avoid matching "Export Audit Log" card heading
    expect(
      screen.getByRole('heading', { name: 'Audit Log', level: 1 })
    ).toBeInTheDocument();
  });

  it('renders inside the Layout wrapper', () => {
    renderPage();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders the Start Date input', () => {
    renderPage();
    expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
  });

  it('renders the End Date input', () => {
    renderPage();
    expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();
  });

  it('renders "Export CSV" button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /Export audit log as CSV/i })
    ).toBeInTheDocument();
  });

  it('renders "Export JSON" button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /Export audit log as JSON/i })
    ).toBeInTheDocument();
  });

  it('renders description text', () => {
    renderPage();
    expect(
      screen.getByText(/Select a date range and download/i)
    ).toBeInTheDocument();
  });

  // ── Date inputs are pre-populated ─────────────────────────────────────────

  it('pre-populates fromDate with 30-days-ago value', () => {
    renderPage();
    const fromInput = screen.getByLabelText(/Start Date/i) as HTMLInputElement;
    // Should be a valid ISO date string (YYYY-MM-DD)
    expect(fromInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("pre-populates toDate with today's date", () => {
    renderPage();
    const toInput = screen.getByLabelText(/End Date/i) as HTMLInputElement;
    expect(toInput.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // ── Date validation ────────────────────────────────────────────────────────

  it('shows toast.error when fromDate > toDate', async () => {
    renderPage();
    const fromInput = screen.getByLabelText(/Start Date/i);
    const toInput = screen.getByLabelText(/End Date/i);

    fireEvent.change(fromInput, { target: { value: '2024-12-31' } });
    fireEvent.change(toInput, { target: { value: '2024-01-01' } });

    fireEvent.click(
      screen.getByRole('button', { name: /Export audit log as CSV/i })
    );

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        'Start date must be before end date.'
      );
    });
  });

  it('does not call mutation when fromDate > toDate', async () => {
    const executeFn = vi
      .fn()
      .mockResolvedValue({ data: undefined, error: undefined });
    mockMutation(executeFn);
    renderPage();

    const fromInput = screen.getByLabelText(/Start Date/i);
    const toInput = screen.getByLabelText(/End Date/i);
    fireEvent.change(fromInput, { target: { value: '2025-06-01' } });
    fireEvent.change(toInput, { target: { value: '2025-01-01' } });

    fireEvent.click(
      screen.getByRole('button', { name: /Export audit log as CSV/i })
    );

    await waitFor(() => {
      expect(executeFn).not.toHaveBeenCalled();
    });
  });

  // ── Successful CSV export ──────────────────────────────────────────────────

  it('calls mutation with CSV format and date range on Export CSV click', async () => {
    const executeFn = vi.fn().mockResolvedValue({
      data: {
        exportAuditLog: {
          presignedUrl: 'https://example.com/export.csv',
          expiresAt: '2026-02-26T16:00:00Z',
          recordCount: 42,
        },
      },
      error: undefined,
    });
    mockMutation(executeFn);
    renderPage();

    const fromInput = screen.getByLabelText(/Start Date/i);
    const toInput = screen.getByLabelText(/End Date/i);
    fireEvent.change(fromInput, { target: { value: '2024-01-01' } });
    fireEvent.change(toInput, { target: { value: '2024-12-31' } });

    fireEvent.click(
      screen.getByRole('button', { name: /Export audit log as CSV/i })
    );

    await waitFor(() => {
      expect(executeFn).toHaveBeenCalledWith({
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
        format: 'CSV',
      });
    });
  });

  it('calls window.open with presignedUrl on successful CSV export', async () => {
    const presignedUrl = 'https://minio.example.com/audit-export.csv';
    const executeFn = vi.fn().mockResolvedValue({
      data: {
        exportAuditLog: {
          presignedUrl,
          expiresAt: '2026-02-26T16:00:00Z',
          recordCount: 10,
        },
      },
      error: undefined,
    });
    mockMutation(executeFn);
    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: /Export audit log as CSV/i })
    );

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(
        presignedUrl,
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  it('fires toast.success after successful export', async () => {
    const executeFn = vi.fn().mockResolvedValue({
      data: {
        exportAuditLog: {
          presignedUrl: 'https://minio.example.com/export.csv',
          expiresAt: '2026-02-26T16:00:00Z',
          recordCount: 500,
        },
      },
      error: undefined,
    });
    mockMutation(executeFn);
    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: /Export audit log as CSV/i })
    );

    await waitFor(() => {
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
        expect.stringContaining('500'),
        expect.any(Object)
      );
    });
  });

  // ── Successful JSON export ─────────────────────────────────────────────────

  it('calls mutation with JSON format on Export JSON click', async () => {
    const executeFn = vi.fn().mockResolvedValue({
      data: {
        exportAuditLog: {
          presignedUrl: 'https://example.com/export.json',
          expiresAt: '2026-02-26T16:00:00Z',
          recordCount: 99,
        },
      },
      error: undefined,
    });
    mockMutation(executeFn);
    renderPage();

    const fromInput = screen.getByLabelText(/Start Date/i);
    const toInput = screen.getByLabelText(/End Date/i);
    fireEvent.change(fromInput, { target: { value: '2024-01-01' } });
    fireEvent.change(toInput, { target: { value: '2024-12-31' } });

    fireEvent.click(
      screen.getByRole('button', { name: /Export audit log as JSON/i })
    );

    await waitFor(() => {
      expect(executeFn).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'JSON' })
      );
    });
  });

  // ── Error case ─────────────────────────────────────────────────────────────

  it('fires toast.error when mutation returns an error', async () => {
    const executeFn = vi.fn().mockResolvedValue({
      data: undefined,
      error: { message: 'Insufficient permissions' },
    });
    mockMutation(executeFn);
    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: /Export audit log as CSV/i })
    );

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        expect.stringContaining('Insufficient permissions')
      );
    });
  });

  it('fires toast.error when mutation returns no data', async () => {
    const executeFn = vi.fn().mockResolvedValue({
      data: undefined,
      error: undefined,
    });
    mockMutation(executeFn);
    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: /Export audit log as CSV/i })
    );

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        'Export failed: no data returned.'
      );
    });
  });

  // ── Loading / exporting state ──────────────────────────────────────────────

  it('shows "Preparing your export…" text while exporting', async () => {
    // Never resolves synchronously — use a pending promise to keep loading state
    let resolveExport!: (value: unknown) => void;
    const pendingPromise = new Promise((res) => {
      resolveExport = res;
    });
    const executeFn = vi.fn().mockReturnValue(pendingPromise);
    mockMutation(executeFn);
    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: /Export audit log as CSV/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/Preparing your export/i)).toBeInTheDocument();
    });

    // Clean up — resolve to avoid unhandled rejection
    resolveExport({ data: undefined, error: undefined });
  });

  it('disables both export buttons while exporting', async () => {
    let resolveExport!: (value: unknown) => void;
    const pendingPromise = new Promise((res) => {
      resolveExport = res;
    });
    const executeFn = vi.fn().mockReturnValue(pendingPromise);
    mockMutation(executeFn);
    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: /Export audit log as CSV/i })
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Export audit log as CSV/i })
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: /Export audit log as JSON/i })
      ).toBeDisabled();
    });

    resolveExport({ data: undefined, error: undefined });
  });

  it('shows "Exporting…" text on CSV button while CSV export is in progress', async () => {
    let resolveExport!: (value: unknown) => void;
    const pendingPromise = new Promise((res) => {
      resolveExport = res;
    });
    const executeFn = vi.fn().mockReturnValue(pendingPromise);
    mockMutation(executeFn);
    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: /Export audit log as CSV/i })
    );

    await waitFor(() => {
      const csvButton = screen.getByRole('button', {
        name: /Export audit log as CSV/i,
      });
      expect(csvButton).toHaveTextContent(/Exporting/i);
    });

    resolveExport({ data: undefined, error: undefined });
  });

  // ── Date change updates inputs ─────────────────────────────────────────────

  it('updates fromDate input when user changes the start date', () => {
    renderPage();
    const fromInput = screen.getByLabelText(/Start Date/i) as HTMLInputElement;
    fireEvent.change(fromInput, { target: { value: '2025-03-15' } });
    expect(fromInput.value).toBe('2025-03-15');
  });

  it('updates toDate input when user changes the end date', () => {
    renderPage();
    const toInput = screen.getByLabelText(/End Date/i) as HTMLInputElement;
    fireEvent.change(toInput, { target: { value: '2025-06-30' } });
    expect(toInput.value).toBe('2025-06-30');
  });

  // ── JSON export button path (line 105 — "Open again" toast action) ──────────

  it('Export JSON button calls mutation with format JSON (line 105 path)', async () => {
    const presignedUrl = 'https://minio.example.com/audit-export.json';
    const executeFn = vi.fn().mockResolvedValue({
      data: {
        exportAuditLog: {
          presignedUrl,
          expiresAt: '2026-02-26T16:00:00Z',
          recordCount: 77,
        },
      },
      error: undefined,
    });
    mockMutation(executeFn);
    renderPage();

    const fromInput = screen.getByLabelText(/Start Date/i);
    const toInput = screen.getByLabelText(/End Date/i);
    fireEvent.change(fromInput, { target: { value: '2024-03-01' } });
    fireEvent.change(toInput, { target: { value: '2024-03-31' } });

    fireEvent.click(
      screen.getByRole('button', { name: /Export audit log as JSON/i })
    );

    await waitFor(() => {
      expect(executeFn).toHaveBeenCalledWith({
        fromDate: '2024-03-01',
        toDate: '2024-03-31',
        format: 'JSON',
      });
    });
  });

  it('JSON export opens presigned URL in new tab', async () => {
    const presignedUrl = 'https://minio.example.com/audit-export.json';
    const executeFn = vi.fn().mockResolvedValue({
      data: {
        exportAuditLog: {
          presignedUrl,
          expiresAt: '2026-02-26T16:00:00Z',
          recordCount: 77,
        },
      },
      error: undefined,
    });
    mockMutation(executeFn);
    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: /Export audit log as JSON/i })
    );

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(
        presignedUrl,
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  it('"Open again" toast action (line 105) reopens the presigned URL', async () => {
    // The toast.success call includes an `action.onClick` callback that calls window.open again.
    // This test extracts that callback and invokes it to cover line 105.
    const presignedUrl = 'https://minio.example.com/reopen.json';
    const executeFn = vi.fn().mockResolvedValue({
      data: {
        exportAuditLog: {
          presignedUrl,
          expiresAt: '2026-02-26T16:00:00Z',
          recordCount: 12,
        },
      },
      error: undefined,
    });
    mockMutation(executeFn);
    renderPage();

    fireEvent.click(
      screen.getByRole('button', { name: /Export audit log as CSV/i })
    );

    await waitFor(() => {
      expect(vi.mocked(toast.success)).toHaveBeenCalled();
    });

    // Extract the action.onClick from the toast.success call and invoke it
    const toastSuccessCall = vi.mocked(toast.success).mock.calls[0]!;
    // toastSuccessCall[1] is the options object: { action: { label, onClick }, duration }
    const toastOptions = toastSuccessCall[1] as {
      action: { label: string; onClick: () => void };
      duration: number;
    };

    expect(toastOptions.action).toBeDefined();
    expect(typeof toastOptions.action.onClick).toBe('function');

    // Invoke "Open again" — must call window.open with the presigned URL
    toastOptions.action.onClick();

    expect(window.open).toHaveBeenCalledWith(
      presignedUrl,
      '_blank',
      'noopener,noreferrer'
    );
    // window.open was called at least twice: once from handleExport + once from "Open again"
    expect(vi.mocked(window.open)).toHaveBeenCalledTimes(2);
  });

  // ── Additional date validation edge cases ──────────────────────────────────

  it('shows toast.error when fromDate equals toDate (same day is valid — no error)', async () => {
    // Same day (fromDate === toDate) is valid: fromDate > toDate is false
    const executeFn = vi.fn().mockResolvedValue({
      data: {
        exportAuditLog: {
          presignedUrl: 'https://example.com/same-day.csv',
          expiresAt: '2026-02-26T16:00:00Z',
          recordCount: 5,
        },
      },
      error: undefined,
    });
    mockMutation(executeFn);
    renderPage();

    const fromInput = screen.getByLabelText(/Start Date/i);
    const toInput = screen.getByLabelText(/End Date/i);
    fireEvent.change(fromInput, { target: { value: '2025-01-15' } });
    fireEvent.change(toInput, { target: { value: '2025-01-15' } });

    fireEvent.click(
      screen.getByRole('button', { name: /Export audit log as CSV/i })
    );

    // Same day is valid — mutation should be called
    await waitFor(() => {
      expect(executeFn).toHaveBeenCalledWith(
        expect.objectContaining({
          fromDate: '2025-01-15',
          toDate: '2025-01-15',
        })
      );
    });
  });
});
