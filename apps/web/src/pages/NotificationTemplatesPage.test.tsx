import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => mockNavigate) };
});

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

vi.mock('./NotificationTemplatesPage.editor', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  NotificationTemplateEditor: vi.fn(({ template, saved }: any) => (
    <div data-testid="template-editor">
      <span data-testid="editor-template-name">{template.name}</span>
      {saved && <span data-testid="saved-indicator">Saved!</span>}
    </div>
  )),
}));

vi.mock('@/lib/graphql/admin-notifications.queries', () => ({
  // NotificationTemplate type is used only as type import — no runtime value needed
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { NotificationTemplatesPage } from './NotificationTemplatesPage';
import { useAuthRole } from '@/hooks/useAuthRole';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <NotificationTemplatesPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NotificationTemplatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
  });

  it('renders "Notification Templates" heading via AdminLayout', () => {
    renderPage();
    expect(screen.getByText('Notification Templates')).toBeInTheDocument();
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
    expect(screen.getByText('Notification Templates')).toBeInTheDocument();
  });

  it('allows SUPER_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(screen.getByText('Notification Templates')).toBeInTheDocument();
  });

  it('renders all 6 default template names in the sidebar', () => {
    renderPage();
    // "Welcome Email" appears in both sidebar + editor mock; others appear once each
    expect(screen.getAllByText('Welcome Email').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Enrollment Confirmation')).toBeInTheDocument();
    expect(screen.getByText('Completion Certificate')).toBeInTheDocument();
    expect(screen.getByText('Compliance Reminder')).toBeInTheDocument();
    expect(screen.getByText('Password Reset')).toBeInTheDocument();
    expect(screen.getByText('At-Risk Intervention')).toBeInTheDocument();
  });

  it('renders the NotificationTemplateEditor for the selected template', () => {
    renderPage();
    expect(screen.getByTestId('template-editor')).toBeInTheDocument();
  });

  it('shows "Welcome Email" as initially selected (first template)', () => {
    renderPage();
    expect(screen.getByTestId('editor-template-name').textContent).toBe(
      'Welcome Email'
    );
  });

  it('shows "Off" badge for the inactive "At-Risk Intervention" template', () => {
    renderPage();
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('switches selected template when a sidebar item is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('Enrollment Confirmation'));
    expect(screen.getByTestId('editor-template-name').textContent).toBe(
      'Enrollment Confirmation'
    );
  });

  it('switches selected template via keyboard Enter key', () => {
    renderPage();
    const completionBtn = screen
      .getAllByRole('button')
      .find((el) => el.textContent?.includes('Completion Certificate'));
    if (completionBtn) {
      fireEvent.keyDown(completionBtn, { key: 'Enter' });
      expect(screen.getByTestId('editor-template-name').textContent).toBe(
        'Completion Certificate'
      );
    }
  });

  it('renders template key slugs (font-mono text)', () => {
    renderPage();
    expect(screen.getByText('welcome')).toBeInTheDocument();
    expect(screen.getByText('enrollment_confirmation')).toBeInTheDocument();
  });
});
