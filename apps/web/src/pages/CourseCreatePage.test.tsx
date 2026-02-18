import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

// Stub shadcn Select — jsdom can't drive Radix portals
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select">{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>Beginner</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
}));

import { getCurrentUser } from '@/lib/auth';
import { CourseCreatePage } from './CourseCreatePage';

// ── Fixtures ───────────────────────────────────────────────────────────────

const INSTRUCTOR_USER: AuthUser = {
  id: 'user-2',
  username: 'instructor',
  email: 'instructor@example.com',
  firstName: 'Jane',
  lastName: 'Smith',
  tenantId: 'tenant-1',
  role: 'INSTRUCTOR',
  scopes: ['course:write', 'course:read'],
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <CourseCreatePage />
    </MemoryRouter>
  );

/** Navigate the wizard to Step 2 by filling in the title and clicking Next */
function advanceToStep2(title = 'Test Course') {
  fireEvent.change(screen.getByLabelText(/course title/i), {
    target: { value: title },
  });
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
}

/** Navigate the wizard to Step 3 */
function advanceToStep3(title = 'Test Course') {
  advanceToStep2(title);
  fireEvent.click(screen.getByRole('button', { name: /next/i }));
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('CourseCreatePage', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReturnValue(INSTRUCTOR_USER);
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Step 1 rendering ────────────────────────────────────────────────────

  it('renders the page heading "Create New Course"', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /create new course/i })).toBeInTheDocument();
  });

  it('renders Step 1 (Course Info) card heading initially', () => {
    renderPage();
    // The card h2 heading for the current step
    expect(screen.getByRole('heading', { name: /course info/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByLabelText(/course title/i)).toBeInTheDocument();
  });

  it('shows "Title is required" validation message when title is empty', () => {
    renderPage();
    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });

  it('shows Description textarea in Step 1', () => {
    renderPage();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('shows Duration input in Step 1', () => {
    renderPage();
    expect(screen.getByLabelText(/duration/i)).toBeInTheDocument();
  });

  it('renders Thumbnail Icon label in Step 1', () => {
    renderPage();
    expect(screen.getByText('Thumbnail Icon')).toBeInTheDocument();
  });

  it('Next button is disabled when title is empty', () => {
    renderPage();
    const nextBtn = screen.getByRole('button', { name: /next/i });
    expect(nextBtn).toBeDisabled();
  });

  it('Next button is enabled after entering a title', () => {
    renderPage();
    const titleInput = screen.getByLabelText(/course title/i);
    fireEvent.change(titleInput, { target: { value: 'My Test Course' } });
    const nextBtn = screen.getByRole('button', { name: /next/i });
    expect(nextBtn).not.toBeDisabled();
  });

  it('Back button is disabled on Step 1', () => {
    renderPage();
    const backBtn = screen.getByRole('button', { name: /^back$/i });
    expect(backBtn).toBeDisabled();
  });

  // ── Step 1 → Step 2 navigation ──────────────────────────────────────────

  it('entering a title and clicking Next advances to Step 2 (Modules card heading)', () => {
    renderPage();
    advanceToStep2('Introduction to Talmud');
    // The active step card renders an h2 "Modules"
    expect(screen.getByRole('heading', { name: /^modules$/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByLabelText(/module title/i)).toBeInTheDocument();
  });

  // ── Step 2 module management ────────────────────────────────────────────

  it('Step 2 shows empty state when no modules exist', () => {
    renderPage();
    advanceToStep2();
    expect(screen.getByText(/no modules yet/i)).toBeInTheDocument();
  });

  it('Add Module button is disabled when module title is empty', () => {
    renderPage();
    advanceToStep2();
    const addBtn = screen.getByRole('button', { name: /add module/i });
    expect(addBtn).toBeDisabled();
  });

  it('adding a module title and clicking Add Module shows it in the list', () => {
    renderPage();
    advanceToStep2();

    fireEvent.change(screen.getByLabelText(/module title/i), {
      target: { value: 'Intro to Gemara' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add module/i }));

    expect(screen.getByText('Intro to Gemara')).toBeInTheDocument();
    expect(screen.getByText('Module 1')).toBeInTheDocument();
  });

  it('pressing Enter in module title input adds the module', () => {
    renderPage();
    advanceToStep2();

    const moduleTitleInput = screen.getByLabelText(/module title/i);
    fireEvent.change(moduleTitleInput, { target: { value: 'Tractate Berakhot' } });
    fireEvent.keyDown(moduleTitleInput, { key: 'Enter' });

    expect(screen.getByText('Tractate Berakhot')).toBeInTheDocument();
  });

  it('removing a module removes it from the list', () => {
    renderPage();
    advanceToStep2();

    fireEvent.change(screen.getByLabelText(/module title/i), {
      target: { value: 'Module to Remove' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add module/i }));
    expect(screen.getByText('Module to Remove')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /remove module/i }));
    expect(screen.queryByText('Module to Remove')).not.toBeInTheDocument();
  });

  it('Back button on Step 2 returns to Step 1 (Course Title input visible)', () => {
    renderPage();
    advanceToStep2();
    // Now on step 2 — click Back
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    // Back on step 1 — title input should be visible again
    expect(screen.getByLabelText(/course title/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/module title/i)).not.toBeInTheDocument();
  });

  // ── Step 2 → Step 3 navigation ──────────────────────────────────────────

  it('Step 3 shows review card with course title', () => {
    renderPage();
    advanceToStep3('GraphQL Mastery');
    expect(screen.getByText('GraphQL Mastery')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /publish course/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save as draft/i })).toBeInTheDocument();
  });

  it('"Back to Modules" button on Step 3 returns to Step 2', () => {
    renderPage();
    advanceToStep3();
    fireEvent.click(screen.getByRole('button', { name: /back to modules/i }));
    expect(screen.getByLabelText(/module title/i)).toBeInTheDocument();
  });

  it('Step 3 shows module count in review card', () => {
    renderPage();
    advanceToStep2();

    fireEvent.change(screen.getByLabelText(/module title/i), {
      target: { value: 'Module A' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add module/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(screen.getByText('1 module')).toBeInTheDocument();
    expect(screen.getByText('Module A')).toBeInTheDocument();
  });

  // ── Step 3 publish actions ──────────────────────────────────────────────

  it('clicking "Publish Course" triggers navigation with published=true', async () => {
    vi.useFakeTimers();
    renderPage();
    advanceToStep3('My Published Course');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /publish course/i }));
      vi.runAllTimers();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      '/courses',
      expect.objectContaining({
        state: expect.objectContaining({
          newCourse: expect.objectContaining({ published: true }),
        }),
      })
    );
  });

  it('clicking "Save as Draft" triggers navigation with published=false', async () => {
    vi.useFakeTimers();
    renderPage();
    advanceToStep3('Draft Course');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));
      vi.runAllTimers();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      '/courses',
      expect.objectContaining({
        state: expect.objectContaining({
          newCourse: expect.objectContaining({ published: false }),
        }),
      })
    );
  });

  it('step indicator renders all three step labels', () => {
    renderPage();
    // Step labels appear multiple times (indicator + card heading)
    // Use getAllByText to avoid multiple-match errors
    expect(screen.getAllByText('Course Info').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Modules').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Publish').length).toBeGreaterThanOrEqual(1);
  });

  it('"Courses" back nav button navigates to /courses', () => {
    renderPage();
    // The "Courses" button in the header (not a nav link — it's a ghost Button)
    const coursesBtn = screen.getByRole('button', { name: /courses/i });
    fireEvent.click(coursesBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/courses');
  });

  it('Step 3 review shows "Review and publish" description', () => {
    renderPage();
    advanceToStep3();
    expect(screen.getByText(/review your course before publishing/i)).toBeInTheDocument();
  });

  it('difficulty options are displayed in Step 1', () => {
    renderPage();
    // SelectValue stub shows "Beginner"; SelectItem also renders difficulty labels
    expect(screen.getAllByText('Beginner').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Intermediate').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Advanced').length).toBeGreaterThanOrEqual(1);
  });
});
