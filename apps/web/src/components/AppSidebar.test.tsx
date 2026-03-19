/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Module mocks ─────────────────────────────────────────────────────────────

const mockGetCurrentUser = vi.fn(() => ({
  id: 'u-1',
  username: 'alice',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  tenantId: 't-1',
  role: 'STUDENT',
  scopes: ['read'],
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
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

vi.mock('@/contexts/BrandingContext', () => ({
  useBranding: vi.fn(() => ({
    branding: {
      logoUrl: '/defaults/logo.svg',
      logoMarkUrl: null,
      faviconUrl: '/defaults/favicon.ico',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
      accentColor: '#f59e0b',
      backgroundColor: '#ffffff',
      fontFamily: 'Inter',
      organizationName: 'EduSphere',
      hideEduSphereBranding: false,
    },
    fetching: false,
  })),
}));

import { AppSidebar } from './AppSidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { useBranding } from '@/contexts/BrandingContext';

// Helper — render sidebar at given route
const renderAt = (path = '/dashboard') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppSidebar />
    </MemoryRouter>
  );

/** Helper to set the mocked user role before rendering */
const setRole = (role: string) => {
  mockGetCurrentUser.mockReturnValue({
    id: 'u-1',
    username: 'alice',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Smith',
    tenantId: 't-1',
    role,
    scopes: ['read'],
  });
};

describe('AppSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Default: STUDENT role
    setRole('STUDENT');
  });

  it('renders with data-testid="app-sidebar"', () => {
    renderAt();
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
  });

  it('renders learning group items for STUDENT', () => {
    renderAt();
    expect(screen.getByTestId('nav-item-home')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-myCourses')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-discover')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-knowledgeGraph')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-aiTutor')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-liveSessions')).toBeInTheDocument();
  });

  it('renders social group items for STUDENT', () => {
    renderAt();
    expect(screen.getByTestId('nav-item-discussions')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-socialFeed')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-findPeople')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-groupChallenges')).toBeInTheDocument();
  });

  // ── Role-based group visibility ──────────────────────────────────────────

  it('hides Teaching and Analytics groups for STUDENT role', () => {
    renderAt();
    expect(screen.queryByTestId('nav-group-teaching')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-group-analytics')).not.toBeInTheDocument();
  });

  it('shows Teaching group for INSTRUCTOR role', () => {
    setRole('INSTRUCTOR');
    renderAt();
    expect(screen.getByTestId('nav-group-teaching')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-quizBuilder')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-assessments')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-peerReview')).toBeInTheDocument();
  });

  it('shows Analytics group for INSTRUCTOR role', () => {
    setRole('INSTRUCTOR');
    renderAt();
    expect(screen.getByTestId('nav-group-analytics')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-managerDashboard')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-cohortInsights')).toBeInTheDocument();
  });

  it('shows Analytics group for RESEARCHER role', () => {
    setRole('RESEARCHER');
    renderAt();
    expect(screen.getByTestId('nav-group-analytics')).toBeInTheDocument();
    // Researcher should NOT see Teaching group
    expect(screen.queryByTestId('nav-group-teaching')).not.toBeInTheDocument();
  });

  it('shows all groups for ORG_ADMIN role', () => {
    setRole('ORG_ADMIN');
    renderAt();
    expect(screen.getByTestId('nav-group-learning')).toBeInTheDocument();
    expect(screen.getByTestId('nav-group-social')).toBeInTheDocument();
    expect(screen.getByTestId('nav-group-teaching')).toBeInTheDocument();
    expect(screen.getByTestId('nav-group-analytics')).toBeInTheDocument();
  });

  it('shows all groups for SUPER_ADMIN role', () => {
    setRole('SUPER_ADMIN');
    renderAt();
    expect(screen.getByTestId('nav-group-learning')).toBeInTheDocument();
    expect(screen.getByTestId('nav-group-social')).toBeInTheDocument();
    expect(screen.getByTestId('nav-group-teaching')).toBeInTheDocument();
    expect(screen.getByTestId('nav-group-analytics')).toBeInTheDocument();
  });

  // ── Group headings ───────────────────────────────────────────────────────

  it('renders group headings when expanded', () => {
    setRole('SUPER_ADMIN');
    renderAt();
    expect(screen.getByTestId('nav-group-heading-learning')).toBeInTheDocument();
    expect(screen.getByTestId('nav-group-heading-social')).toBeInTheDocument();
    expect(screen.getByTestId('nav-group-heading-teaching')).toBeInTheDocument();
    expect(screen.getByTestId('nav-group-heading-analytics')).toBeInTheDocument();
  });

  it('hides group headings when collapsed', () => {
    setRole('SUPER_ADMIN');
    renderAt();
    fireEvent.click(screen.getByTestId('sidebar-collapse-toggle'));
    expect(screen.queryByTestId('nav-group-heading-learning')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-group-heading-teaching')).not.toBeInTheDocument();
  });

  // ── Existing sidebar tests (updated) ────────────────────────────────────

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
    expect(screen.getByTestId('sidebar-brand-name')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('sidebar-collapse-toggle'));
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
    expect(screen.queryByTestId('sidebar-brand-name')).not.toBeInTheDocument();
  });

  it('highlights active route with primary styling', () => {
    renderAt('/dashboard');
    const homeLink = screen.getByTestId('nav-item-home');
    expect(homeLink.className).toMatch(/text-primary/);
  });

  it('renders nav labels in English via i18n', () => {
    renderAt();
    expect(screen.getByTestId('nav-item-home')).toHaveTextContent('Home');
    expect(screen.getByTestId('nav-item-myCourses')).toHaveTextContent('My Courses');
    expect(screen.getByTestId('nav-item-discover')).toHaveTextContent('Discover');
    expect(screen.getByTestId('nav-item-knowledgeGraph')).toHaveTextContent('Knowledge Graph');
    expect(screen.getByTestId('nav-item-aiTutor')).toHaveTextContent('AI Tutor');
    expect(screen.getByTestId('nav-item-liveSessions')).toHaveTextContent('Live Sessions');
  });

  it('renders Settings label via i18n', () => {
    renderAt();
    const settingsLink = screen.getByTestId('nav-item-settings');
    expect(settingsLink).toHaveTextContent('Settings');
  });

  it('renders custom organizationName from branding context', () => {
    vi.mocked(useBranding).mockReturnValueOnce({
      branding: {
        logoUrl: '/acme/logo.svg',
        logoMarkUrl: '/acme/logomark.svg',
        faviconUrl: '/acme/favicon.ico',
        primaryColor: '#ff0000',
        secondaryColor: '#00ff00',
        accentColor: '#0000ff',
        backgroundColor: '#ffffff',
        fontFamily: 'Inter',
        organizationName: 'Acme Corp',
        hideEduSphereBranding: false,
      },
      fetching: false,
    });
    renderAt();
    expect(screen.getByTestId('sidebar-brand-name')).toHaveTextContent('Acme Corp');
    expect(screen.getByTestId('sidebar-brand-name')).not.toHaveTextContent('EduSphere');
  });

  it('hides "Powered by EduSphere" when hideEduSphereBranding is true', () => {
    vi.mocked(useBranding).mockReturnValueOnce({
      branding: {
        logoUrl: '/acme/logo.svg',
        logoMarkUrl: null,
        faviconUrl: '/acme/favicon.ico',
        primaryColor: '#ff0000',
        secondaryColor: '#00ff00',
        accentColor: '#0000ff',
        backgroundColor: '#ffffff',
        fontFamily: 'Inter',
        organizationName: 'Acme Corp',
        hideEduSphereBranding: true,
      },
      fetching: false,
    });
    renderAt();
    expect(screen.queryByTestId('powered-by-edusphere')).not.toBeInTheDocument();
  });

  it('shows "Powered by EduSphere" when hideEduSphereBranding is false', () => {
    renderAt();
    expect(screen.getByTestId('powered-by-edusphere')).toBeInTheDocument();
    expect(screen.getByTestId('powered-by-edusphere')).toHaveTextContent('Powered by EduSphere');
  });

  // WCAG 3.2.6 — Consistent Help
  it('renders Help & Support nav item (WCAG 3.2.6 — consistent help location)', () => {
    renderAt();
    const helpLink = screen.getByTestId('nav-item-help');
    expect(helpLink).toBeInTheDocument();
    expect(helpLink).toHaveAttribute('aria-label', 'Help & Support');
    expect(helpLink).toHaveTextContent('Help & Support');
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
    fireEvent.click(screen.getByTestId('theme-toggle'));
    expect(mockSetThemeMode).toHaveBeenCalledWith('light');
  });
});
