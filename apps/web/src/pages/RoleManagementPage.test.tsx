import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => mockNavigate) };
});

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/components/admin/AdminLayout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AdminLayout: ({ children, title }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'ORG_ADMIN'),
}));

vi.mock('@/lib/graphql/admin-roles.queries', () => ({
  LIST_ROLES_QUERY: 'LIST_ROLES_QUERY',
  CREATE_ROLE_MUTATION: 'CREATE_ROLE_MUTATION',
  UPDATE_ROLE_MUTATION: 'UPDATE_ROLE_MUTATION',
  DELETE_ROLE_MUTATION: 'DELETE_ROLE_MUTATION',
}));

vi.mock('@/lib/graphql/admin-roles.permissions', () => ({
  SYSTEM_ROLES: [
    {
      id: 'sys-super',
      name: 'Super Admin',
      description: 'Full platform access',
      isSystem: true,
      userCount: 1,
      permissions: ['*'],
    },
    {
      id: 'sys-org',
      name: 'Org Admin',
      description: 'Organization-level access',
      isSystem: true,
      userCount: 5,
      permissions: ['org:manage'],
    },
    {
      id: 'sys-instructor',
      name: 'Instructor',
      description: 'Course authoring',
      isSystem: true,
      userCount: 20,
      permissions: ['course:write'],
    },
    {
      id: 'sys-student',
      name: 'Student',
      description: 'Learning access',
      isSystem: true,
      userCount: 200,
      permissions: ['course:read'],
    },
  ],
}));

vi.mock('./RoleManagementPage.detail', () => ({
  RoleDetailPanel: vi.fn(() => <div data-testid="role-detail-panel" />),
}));

vi.mock('./RoleManagementPage.modal', () => ({
  RoleFormModal: vi.fn(() => null),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { RoleManagementPage } from './RoleManagementPage';
import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';
import { RoleFormModal } from './RoleManagementPage.modal';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_EXECUTE = vi.fn().mockResolvedValue({ error: undefined });

function setupUrql(fetching = false) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { roles: [] },
      fetching,
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
      <RoleManagementPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RoleManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    MOCK_EXECUTE.mockResolvedValue({ error: undefined });
    setupUrql();
  });

  it('renders "Roles & Permissions" heading via AdminLayout', () => {
    renderPage();
    expect(screen.getByText('Roles & Permissions')).toBeInTheDocument();
  });

  it('redirects to /dashboard for STUDENT role', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to /dashboard for INSTRUCTOR role', () => {
    vi.mocked(useAuthRole).mockReturnValue('INSTRUCTOR');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('allows ORG_ADMIN to view the page', () => {
    renderPage();
    expect(screen.getByText('Roles & Permissions')).toBeInTheDocument();
  });

  it('allows SUPER_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(screen.getByText('Roles & Permissions')).toBeInTheDocument();
  });

  it('renders "New Custom Role" button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /new custom role/i })
    ).toBeInTheDocument();
  });

  it('renders system role names in the sidebar', () => {
    renderPage();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('Org Admin')).toBeInTheDocument();
    expect(screen.getByText('Instructor')).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
  });

  it('shows "0 custom roles" when no custom roles exist', () => {
    renderPage();
    expect(screen.getByText(/0 custom roles/i)).toBeInTheDocument();
  });

  it('renders the RoleDetailPanel', () => {
    renderPage();
    expect(screen.getByTestId('role-detail-panel')).toBeInTheDocument();
  });

  it('shows loading indicator when roles are being fetched', () => {
    setupUrql(true);
    renderPage();
    expect(screen.getByText('Loading\u2026')).toBeInTheDocument();
  });

  it('opens the RoleFormModal area when "New Custom Role" is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /new custom role/i }));
    // RoleFormModal is called with open=true after clicking
    expect(vi.mocked(RoleFormModal)).toHaveBeenCalledWith(
      expect.objectContaining({ open: true }),
      undefined
    );
  });

  it('shows "1 custom role" when one custom role exists', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: {
          roles: [
            {
              id: 'custom-1',
              name: 'Content Manager',
              description: 'Manages content',
              isSystem: false,
              userCount: 3,
              permissions: ['content:write'],
            },
          ],
        },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByText(/1 custom role$/)).toBeInTheDocument();
  });
});
