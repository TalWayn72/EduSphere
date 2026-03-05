import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => ({
    id: 'u-1',
    username: 'alice',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Smith',
    tenantId: 't-1',
    role: 'STUDENT',
    scopes: ['read'],
  })),
  DEV_MODE: true,
  logout: vi.fn(),
}));

const mockSetThemeMode = vi.fn();

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    resolvedMode: 'light',
    setThemeMode: mockSetThemeMode,
    tenantPrimitives: {},
    userPreferences: { mode: 'system', fontSize: 'md', readingMode: false, motionPreference: 'full', contrastMode: 'normal' },
    setTenantTheme: vi.fn(),
    setFontSize: vi.fn(),
    setReadingMode: vi.fn(),
    setMotionPreference: vi.fn(),
    previewThemeChanges: vi.fn(),
  })),
}));

import { AppSidebar } from './AppSidebar';
import { useTheme } from '@/contexts/ThemeContext';

// Helper — render sidebar at given route
const renderAt = (path = '/dashboard') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppSidebar />
    </MemoryRouter>
  );

describe('AppSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders with data-testid="app-sidebar"', () => {
    renderAt();
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
  });

  it('renders all main nav items', () => {
    renderAt();
    expect(screen.getByTestId('nav-item-home')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-my-courses')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-discover')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-knowledge-graph')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-ai-tutor')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-live-sessions')).toBeInTheDocument();
  });

  it('renders Settings nav item in bottom section', () => {
    renderAt();
    expect(screen.getByTestId('nav-item-settings')).toBeInTheDocument();
  });

  it('renders user name when expanded', () => {
    renderAt();
    expect(screen.getByTestId('sidebar-user-name')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-user-name')).toHaveTextContent('Alice');
  });

  it('renders user info section', () => {
    renderAt();
    expect(screen.getByTestId('sidebar-user')).toBeInTheDocument();
  });

  it('renders brand name "EduSphere" when expanded', () => {
    renderAt();
    expect(screen.getByTestId('sidebar-brand-name')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-brand-name')).toHaveTextContent('EduSphere');
  });

  it('renders logo icon', () => {
    renderAt();
    expect(screen.getByTestId('sidebar-logo-icon')).toBeInTheDocument();
  });

  it('renders theme toggle button', () => {
    renderAt();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('calls setThemeMode when theme toggle is clicked', () => {
    renderAt();
    fireEvent.click(screen.getByTestId('theme-toggle'));
    expect(mockSetThemeMode).toHaveBeenCalledWith('dark');
  });

  it('renders collapse toggle button', () => {
    renderAt();
    expect(screen.getByTestId('sidebar-collapse-toggle')).toBeInTheDocument();
  });

  it('hides brand name after collapsing sidebar', () => {
    renderAt();
    // Initially expanded — brand name visible
    expect(screen.getByTestId('sidebar-brand-name')).toBeInTheDocument();
    // Click collapse
    fireEvent.click(screen.getByTestId('sidebar-collapse-toggle'));
    // Brand name should be hidden
    expect(screen.queryByTestId('sidebar-brand-name')).not.toBeInTheDocument();
  });

  it('persists collapsed state to localStorage', () => {
    renderAt();
    fireEvent.click(screen.getByTestId('sidebar-collapse-toggle'));
    expect(localStorage.getItem('edusphere-sidebar-collapsed')).toBe('true');
  });

  it('restores collapsed state from localStorage on mount', () => {
    localStorage.setItem('edusphere-sidebar-collapsed', 'true');
    renderAt();
    // When collapsed, brand name is hidden
    expect(screen.queryByTestId('sidebar-brand-name')).not.toBeInTheDocument();
  });

  it('highlights active route with primary styling', () => {
    renderAt('/dashboard');
    const homeLink = screen.getByTestId('nav-item-home');
    expect(homeLink.className).toMatch(/text-primary/);
  });

  it('shows theme toggle for dark mode when resolvedMode is dark', () => {
    vi.mocked(useTheme).mockReturnValue({
      resolvedMode: 'dark',
      setThemeMode: mockSetThemeMode,
      tenantPrimitives: {},
      userPreferences: { mode: 'dark', fontSize: 'md', readingMode: false, motionPreference: 'full', contrastMode: 'normal' },
      setTenantTheme: vi.fn(),
      setFontSize: vi.fn(),
      setReadingMode: vi.fn(),
      setMotionPreference: vi.fn(),
      previewThemeChanges: vi.fn(() => vi.fn()),
    });
    renderAt();
    expect(screen.getByTestId('theme-toggle')).toHaveAttribute(
      'aria-label',
      'Switch to light mode'
    );
    // In dark mode, clicking should switch to light
    fireEvent.click(screen.getByTestId('theme-toggle'));
    expect(mockSetThemeMode).toHaveBeenCalledWith('light');
  });
});
