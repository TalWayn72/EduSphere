import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AuthUser } from '@/lib/auth';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}));

// Mock Radix DropdownMenu — jsdom doesn't support the Floating-UI portal
// The mock renders a simple open/close toggle with all menu items visible.
vi.mock('@/components/ui/dropdown-menu', () => {
  function DropdownMenu({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    // Inject open state via context so children can read it
    return (
      <div data-testid="dropdown-root" data-open={String(open)} onClick={() => setOpen((o: boolean) => !o)}>
        {React.Children.map(children, (child) =>
          React.cloneElement(child as React.ReactElement<Record<string, unknown>>, { __open: open, __setOpen: setOpen })
        )}
      </div>
    );
  }
  function DropdownMenuTrigger({ children, _asChild, __open, __setOpen, ..._rest }: {
    children: React.ReactNode; _asChild?: boolean;
    __open?: boolean; __setOpen?: (v: boolean) => void;
  }) {
    const child = React.Children.only(children) as React.ReactElement<Record<string, unknown>>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => { e.stopPropagation(); __setOpen?.(!__open); },
      'aria-expanded': __open,
      'aria-haspopup': 'menu',
    });
  }
  function DropdownMenuContent({ children, _align, _className, __open }: {
    children: React.ReactNode; _align?: string; _className?: string; __open?: boolean;
  }) {
    if (!__open) return null;
    return <div role="menu" data-testid="dropdown-content">{children}</div>;
  }
  function DropdownMenuLabel({ children, _className }: { children: React.ReactNode; _className?: string }) {
    return <div data-testid="dropdown-label">{children}</div>;
  }
  function DropdownMenuSeparator() {
    return <hr data-testid="dropdown-separator" />;
  }
  function DropdownMenuItem({ children, onClick, className }: {
    children: React.ReactNode; onClick?: () => void; className?: string;
  }) {
    return (
      <button role="menuitem" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }
  return {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuItem,
  };
});

import { logout } from '@/lib/auth';
import { UserMenu } from './UserMenu';

// ── Fixtures ───────────────────────────────────────────────────────────────

const STUDENT_USER: AuthUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  tenantId: 'tenant-1',
  role: 'STUDENT',
  scopes: ['content:read'],
};

const INSTRUCTOR_USER: AuthUser = {
  ...STUDENT_USER,
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  role: 'INSTRUCTOR',
};

const renderMenu = (user: AuthUser = STUDENT_USER) =>
  render(
    <MemoryRouter>
      <UserMenu user={user} />
    </MemoryRouter>
  );

/** Open the dropdown by clicking the trigger button */
function openDropdown() {
  fireEvent.click(screen.getByRole('button', { name: /user menu/i }));
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('UserMenu', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(logout).mockClear();
  });

  // ── Avatar / trigger ────────────────────────────────────────────────────

  it('renders trigger button with aria-label "User menu"', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
  });

  it('renders avatar initials for the user (TU for Test User)', () => {
    renderMenu();
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('renders avatar initials for instructor (JS for Jane Smith)', () => {
    renderMenu(INSTRUCTOR_USER);
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('renders the user first name next to avatar on large screens', () => {
    renderMenu();
    // The span with first name is present in DOM (CSS hides it on small screens)
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('dropdown is closed by default (no menu items visible)', () => {
    renderMenu();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  // ── Dropdown content ────────────────────────────────────────────────────

  it('opens dropdown when trigger button is clicked', () => {
    renderMenu();
    openDropdown();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('dropdown shows full display name (firstName + lastName)', () => {
    renderMenu();
    openDropdown();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('dropdown shows user email', () => {
    renderMenu();
    openDropdown();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('dropdown shows role text for STUDENT', () => {
    renderMenu();
    openDropdown();
    expect(screen.getByText('STUDENT')).toBeInTheDocument();
  });

  it('dropdown shows role text for INSTRUCTOR', () => {
    renderMenu(INSTRUCTOR_USER);
    openDropdown();
    expect(screen.getByText('INSTRUCTOR')).toBeInTheDocument();
  });

  it('dropdown contains "Profile" menu item', () => {
    renderMenu();
    openDropdown();
    expect(screen.getByRole('menuitem', { name: /profile/i })).toBeInTheDocument();
  });

  it('dropdown contains "Settings" menu item', () => {
    renderMenu();
    openDropdown();
    expect(screen.getByRole('menuitem', { name: /settings/i })).toBeInTheDocument();
  });

  it('dropdown contains "Log out" menu item', () => {
    renderMenu();
    openDropdown();
    expect(screen.getByRole('menuitem', { name: /log out/i })).toBeInTheDocument();
  });

  // ── Actions ─────────────────────────────────────────────────────────────

  it('clicking "Profile" navigates to /profile', () => {
    renderMenu();
    openDropdown();
    fireEvent.click(screen.getByRole('menuitem', { name: /profile/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('clicking "Settings" navigates to /settings', () => {
    renderMenu();
    openDropdown();
    fireEvent.click(screen.getByRole('menuitem', { name: /settings/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('clicking "Log out" calls logout()', () => {
    renderMenu();
    openDropdown();
    fireEvent.click(screen.getByRole('menuitem', { name: /log out/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('clicking "Log out" navigates to /login', () => {
    renderMenu();
    openDropdown();
    fireEvent.click(screen.getByRole('menuitem', { name: /log out/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('renders username initials when firstName/lastName are empty strings', () => {
    const anonymousUser: AuthUser = {
      ...STUDENT_USER,
      firstName: '',
      lastName: '',
      username: 'jdoe',
    };
    renderMenu(anonymousUser);
    // Falls back to first char of username uppercased ('J')
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('dropdown label contains role colour class for STUDENT (green)', () => {
    renderMenu();
    openDropdown();
    // The role paragraph has a text-green-500 class for STUDENT
    const roleEl = screen.getByText('STUDENT');
    expect(roleEl.className).toContain('text-green-500');
  });

  it('dropdown label contains role colour class for INSTRUCTOR (blue)', () => {
    renderMenu(INSTRUCTOR_USER);
    openDropdown();
    const roleEl = screen.getByText('INSTRUCTOR');
    expect(roleEl.className).toContain('text-blue-500');
  });
});
