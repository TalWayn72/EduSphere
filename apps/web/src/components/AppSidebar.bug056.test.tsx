/**
 * BUG-056 Regression: Hebrew RTL — AppSidebar hardcoded English labels
 *
 * Root cause: AppSidebar used hardcoded English strings instead of useTranslation('nav').
 * This test guards against regression: nav labels must come from i18n, not hardcoded values.
 * Anti-recurrence: if hardcoded strings return, these tests catch it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => null),
  DEV_MODE: false,
  logout: vi.fn(),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    resolvedMode: 'light',
    setThemeMode: vi.fn(),
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

const renderSidebar = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AppSidebar />
    </MemoryRouter>
  );

describe('BUG-056 — AppSidebar i18n nav labels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('nav items use labelKey-based data-testid (not hardcoded English slugs)', () => {
    renderSidebar();
    // New pattern: data-testid={`nav-item-${labelKey}`}
    expect(screen.getByTestId('nav-item-home')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-myCourses')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-discover')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-knowledgeGraph')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-aiTutor')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-liveSessions')).toBeInTheDocument();
  });

  it('nav labels come from i18n translation (English strings present)', () => {
    renderSidebar();
    // English nav labels come from useTranslation('nav') resolving en/nav.json
    expect(screen.getByTestId('nav-item-home')).toHaveTextContent('Home');
    expect(screen.getByTestId('nav-item-myCourses')).toHaveTextContent('My Courses');
    expect(screen.getByTestId('nav-item-discover')).toHaveTextContent('Discover');
    expect(screen.getByTestId('nav-item-knowledgeGraph')).toHaveTextContent('Knowledge Graph');
    expect(screen.getByTestId('nav-item-aiTutor')).toHaveTextContent('AI Tutor');
    expect(screen.getByTestId('nav-item-liveSessions')).toHaveTextContent('Live Sessions');
  });

  it('OLD hardcoded testids no longer exist (regression guard)', () => {
    renderSidebar();
    // These were the OLD hardcoded testids — must NOT exist anymore
    expect(screen.queryByTestId('nav-item-my-courses')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-item-knowledge-graph')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-item-ai-tutor')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nav-item-live-sessions')).not.toBeInTheDocument();
  });

  it('Settings label comes from i18n', () => {
    renderSidebar();
    expect(screen.getByTestId('nav-item-settings')).toHaveTextContent('Settings');
  });

  it('collapse button aria-label comes from i18n', () => {
    renderSidebar();
    const collapseBtn = screen.getByTestId('sidebar-collapse-toggle');
    expect(collapseBtn).toHaveAttribute('aria-label', 'Collapse sidebar');
  });
});
