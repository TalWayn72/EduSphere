/**
 * HrisConfigPage tests — Phase 52
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{ data: undefined, fetching: false, error: undefined }]),
  useMutation: vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]),
}));

vi.mock('@/components/Layout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Layout: ({ children }: any) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'ORG_ADMIN'),
}));

// UI component mocks — return simple stubs for shadcn components
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange: _onValueChange, value }: React.PropsWithChildren<{ onValueChange?: (v: string) => void; value?: string }>) => (
    <div data-testid="select-root" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <div data-value={value}>{children}</div>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CardTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
  CardDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  CardContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock('lucide-react', () => ({
  Building2: () => <span data-testid="icon-building" />,
  CheckCircle: () => <span />,
  XCircle: () => <span />,
  Clock: () => <span />,
  Loader2: () => <span />,
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { HrisConfigPage } from './HrisConfigPage';
import { useAuthRole } from '@/hooks/useAuthRole';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <HrisConfigPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('HrisConfigPage', () => {
  beforeEach(() => {
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
  });

  it('renders hris-config-page testid for ORG_ADMIN', () => {
    renderPage();
    expect(screen.getByTestId('hris-config-page')).toBeDefined();
  });

  it('shows Access Denied for STUDENT role', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(screen.getByTestId('access-denied')).toBeDefined();
    expect(screen.getByTestId('access-denied').textContent).toContain('Access Denied');
    expect(screen.queryByTestId('hris-config-page')).toBeNull();
  });

  it('shows Access Denied for INSTRUCTOR role', () => {
    vi.mocked(useAuthRole).mockReturnValue('INSTRUCTOR');
    renderPage();
    expect(screen.getByTestId('access-denied')).toBeDefined();
  });

  it('shows system type select for ORG_ADMIN', () => {
    renderPage();
    expect(screen.getByTestId('system-type-select')).toBeDefined();
  });

  it('shows test connection button', () => {
    renderPage();
    expect(screen.getByTestId('test-connection-btn')).toBeDefined();
  });

  it('shows save configuration button', () => {
    renderPage();
    expect(screen.getByTestId('save-hris-config-btn')).toBeDefined();
  });

  it('shows sync now button', () => {
    renderPage();
    expect(screen.getByTestId('sync-now-btn')).toBeDefined();
  });

  it('shows sync history table', () => {
    renderPage();
    expect(screen.getByTestId('sync-history-table')).toBeDefined();
  });

  it('renders for SUPER_ADMIN role', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(screen.getByTestId('hris-config-page')).toBeDefined();
  });
});
