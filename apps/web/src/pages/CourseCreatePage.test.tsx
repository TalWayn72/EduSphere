import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
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
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => <span>Beginner</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-value={value}>{children}</div>,
}));

// Stub Media step — requires Hocuspocus/Yjs which can't run in jsdom
vi.mock('./CourseWizardMediaStep', () => ({
  CourseWizardMediaStep: () => <div data-testid="media-step">Media Upload</div>,
}));

// Stub Step 2 — now lazy-loaded; mock so Suspense resolves synchronously in jsdom
vi.mock('./CourseWizardStep2', () => ({
  CourseWizardStep2: ({
    modules,
    onChange,
  }: {
    modules: Array<{ title: string; order: number }>;
    onChange: (updates: {
      modules: Array<{ title: string; order: number }>;
    }) => void;
  }) => {
    const [moduleTitle, setModuleTitle] = useState('');
    return (
      <div>
        {modules.length === 0 ? (
          <p>No modules yet</p>
        ) : (
          <ul>
            {modules.map((m, i) => (
              <li key={i}>
                <span>Module {i + 1}</span>
                <span>{m.title}</span>
                <button
                  type="button"
                  aria-label="Remove module"
                  onClick={() =>
                    onChange({ modules: modules.filter((_, idx) => idx !== i) })
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <label htmlFor="mock-module-title">Module Title</label>
        <input
          id="mock-module-title"
          value={moduleTitle}
          onChange={(e) => setModuleTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && moduleTitle.trim()) {
              onChange({
                modules: [
                  ...modules,
                  { title: moduleTitle.trim(), order: modules.length + 1 },
                ],
              });
              setModuleTitle('');
            }
          }}
        />
        <button
          type="button"
          disabled={!moduleTitle.trim()}
          onClick={() => {
            onChange({
              modules: [
                ...modules,
                { title: moduleTitle.trim(), order: modules.length + 1 },
              ],
            });
            setModuleTitle('');
          }}
        >
          Add Module
        </button>
      </div>
    );
  },
}));

// Stub Step 3 (Publish/Review) — now lazy-loaded; mock so Suspense resolves synchronously
vi.mock('./CourseWizardStep3', () => ({
  CourseWizardStep3: ({
    data,
    onPublish,
    isSubmitting,
  }: {
    data: { title: string; modules: Array<{ title: string }> };
    onPublish: (isPublished: boolean) => void;
    isSubmitting: boolean;
  }) => (
    <div>
      <p>Review your course before publishing</p>
      <p>{data.title}</p>
      {data.modules.length > 0 && (
        <>
          <p>
            {data.modules.length} module{data.modules.length !== 1 ? 's' : ''}
          </p>
          {data.modules.map((m, i) => (
            <p key={i}>{m.title}</p>
          ))}
        </>
      )}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => onPublish(true)}
      >
        Publish Course
      </button>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => onPublish(false)}
      >
        Save as Draft
      </button>
    </div>
  ),
}));

// Stub sonner toast — prevents real toast system from mounting
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock urql so useMutation doesn't throw "No client" in tests.
const mockExecuteMutation = vi
  .fn()
  .mockResolvedValue({ data: null, error: null });
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + String(values[i] ?? ''),
      ''
    ),
  useMutation: () => [
    { fetching: false, data: null, error: null },
    mockExecuteMutation,
  ],
  useQuery: () => [{ fetching: false, data: null, error: null }, vi.fn()],
  Provider: ({ children }: { children: React.ReactNode }) => children,
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
async function advanceToStep2(title = 'Test Course That Is Long Enough') {
  fireEvent.change(screen.getByLabelText(/course title/i), {
    target: { value: title },
  });
  // RHF validates on blur/touch — trigger validation before clicking Next
  fireEvent.blur(screen.getByLabelText(/course title/i));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
  });
  // CourseWizardStep2 is lazy-loaded — wait for it to mount before interacting
  await waitFor(() =>
    expect(screen.getByLabelText(/module title/i)).toBeInTheDocument()
  );
}

/** Navigate the wizard to Step 3 (Publish/Review) */
async function advanceToStep3(title = 'Test Course That Is Long Enough') {
  await advanceToStep2(title);
  // Step 2 (Modules) → Step 3 (Media)
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
  });
  // CourseWizardMediaStep is lazy-loaded (mocked) — wait for it to mount
  await waitFor(() =>
    expect(screen.getByTestId('media-step')).toBeInTheDocument()
  );
  // Step 3 (Media) → Step 4 (Publish)
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
  });
  // CourseWizardStep3 is lazy-loaded — wait for Publish button to appear
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: /publish course/i })
    ).toBeInTheDocument()
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('CourseCreatePage', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReturnValue(INSTRUCTOR_USER);
    mockNavigate.mockClear();
    mockExecuteMutation.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Step 1 rendering ────────────────────────────────────────────────────

  it('renders the page heading "Create New Course"', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: /create new course/i })
    ).toBeInTheDocument();
  });

  it('renders Step 1 (Course Info) card heading initially', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: /course info/i, level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/course title/i)).toBeInTheDocument();
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

  it('Next button is enabled after entering a title of 3+ chars', () => {
    renderPage();
    const titleInput = screen.getByLabelText(/course title/i);
    fireEvent.change(titleInput, { target: { value: 'ABC' } });
    const nextBtn = screen.getByRole('button', { name: /next/i });
    expect(nextBtn).not.toBeDisabled();
  });

  it('Next button remains disabled for a title shorter than 3 chars', () => {
    renderPage();
    const titleInput = screen.getByLabelText(/course title/i);
    fireEvent.change(titleInput, { target: { value: 'AB' } });
    const nextBtn = screen.getByRole('button', { name: /next/i });
    expect(nextBtn).toBeDisabled();
  });

  it('Back button is disabled on Step 1', () => {
    renderPage();
    const backBtn = screen.getByRole('button', { name: /^back$/i });
    expect(backBtn).toBeDisabled();
  });

  it('shows title validation error after blurring with a too-short title', async () => {
    renderPage();
    const titleInput = screen.getByLabelText(/course title/i);
    fireEvent.change(titleInput, { target: { value: 'AB' } });
    fireEvent.blur(titleInput);
    await waitFor(() => {
      expect(
        screen.getByText(/title must be at least 3 characters/i)
      ).toBeInTheDocument();
    });
  });

  // ── Step 1 → Step 2 navigation ──────────────────────────────────────────

  it('entering a title and clicking Next advances to Step 2 (Modules card heading)', async () => {
    renderPage();
    await advanceToStep2('Introduction to Talmud Study');
    expect(
      screen.getByRole('heading', { name: /^modules$/i, level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/module title/i)).toBeInTheDocument();
  });

  // ── Step 2 module management ────────────────────────────────────────────

  it('Step 2 shows empty state when no modules exist', async () => {
    renderPage();
    await advanceToStep2();
    expect(screen.getByText(/no modules yet/i)).toBeInTheDocument();
  });

  it('Add Module button is disabled when module title is empty', async () => {
    renderPage();
    await advanceToStep2();
    const addBtn = screen.getByRole('button', { name: /add module/i });
    expect(addBtn).toBeDisabled();
  });

  it('adding a module title and clicking Add Module shows it in the list', async () => {
    renderPage();
    await advanceToStep2();

    fireEvent.change(screen.getByLabelText(/module title/i), {
      target: { value: 'Intro to Gemara' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add module/i }));

    expect(screen.getByText('Intro to Gemara')).toBeInTheDocument();
    expect(screen.getByText('Module 1')).toBeInTheDocument();
  });

  it('pressing Enter in module title input adds the module', async () => {
    renderPage();
    await advanceToStep2();

    const moduleTitleInput = screen.getByLabelText(/module title/i);
    fireEvent.change(moduleTitleInput, {
      target: { value: 'Tractate Berakhot' },
    });
    fireEvent.keyDown(moduleTitleInput, { key: 'Enter' });

    expect(screen.getByText('Tractate Berakhot')).toBeInTheDocument();
  });

  it('removing a module removes it from the list', async () => {
    renderPage();
    await advanceToStep2();

    fireEvent.change(screen.getByLabelText(/module title/i), {
      target: { value: 'Module to Remove' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add module/i }));
    expect(screen.getByText('Module to Remove')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /remove module/i }));
    expect(screen.queryByText('Module to Remove')).not.toBeInTheDocument();
  });

  it('Back button on Step 2 returns to Step 1 (Course Title input visible)', async () => {
    renderPage();
    await advanceToStep2();
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    expect(screen.getByLabelText(/course title/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/module title/i)).not.toBeInTheDocument();
  });

  // ── Step 2 → Step 3 navigation ──────────────────────────────────────────

  it('Step 3 shows review card with course title', async () => {
    renderPage();
    await advanceToStep3('GraphQL Mastery Course');
    expect(screen.getByText('GraphQL Mastery Course')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /publish course/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /save as draft/i })
    ).toBeInTheDocument();
  });

  it('"Back to Media" button on Step 3 returns to Media step', async () => {
    renderPage();
    await advanceToStep3();
    fireEvent.click(screen.getByRole('button', { name: /back to media/i }));
    expect(screen.getByTestId('media-step')).toBeInTheDocument();
  });

  it('Step 3 shows module count in review card', async () => {
    renderPage();
    await advanceToStep2();

    fireEvent.change(screen.getByLabelText(/module title/i), {
      target: { value: 'Module A' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add module/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    });

    expect(screen.getByText('1 module')).toBeInTheDocument();
    expect(screen.getByText('Module A')).toBeInTheDocument();
  });

  // ── Step 3 publish actions ──────────────────────────────────────────────

  it('clicking "Publish Course" calls executeMutation with isPublished=true', async () => {
    mockExecuteMutation.mockResolvedValue({
      data: {
        createCourse: { id: 'course-1', title: 'GraphQL Mastery Course' },
      },
      error: null,
    });
    renderPage();
    await advanceToStep3('GraphQL Mastery Course');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /publish course/i }));
    });

    expect(mockExecuteMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ isPublished: true }),
      })
    );
  });

  it('clicking "Save as Draft" calls executeMutation with isPublished=false', async () => {
    mockExecuteMutation.mockResolvedValue({
      data: {
        createCourse: { id: 'course-2', title: 'Draft Course Enough Chars' },
      },
      error: null,
    });
    renderPage();
    await advanceToStep3('Draft Course Enough Chars');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save as draft/i }));
    });

    expect(mockExecuteMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ isPublished: false }),
      })
    );
  });

  it('step indicator renders all four step labels', () => {
    renderPage();
    expect(screen.getAllByText('Course Info').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Modules').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Publish').length).toBeGreaterThanOrEqual(1);
  });

  it('"Courses" back nav button navigates to /courses', () => {
    renderPage();
    const coursesBtn = screen.getByRole('button', { name: /courses/i });
    fireEvent.click(coursesBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/courses');
  });

  it('Step 3 review shows "Review and publish" description', async () => {
    renderPage();
    await advanceToStep3();
    expect(
      screen.getByText(/review your course before publishing/i)
    ).toBeInTheDocument();
  });

  it('difficulty options are displayed in Step 1', () => {
    renderPage();
    expect(screen.getAllByText('Beginner').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Intermediate').length).toBeGreaterThanOrEqual(
      1
    );
    expect(screen.getAllByText('Advanced').length).toBeGreaterThanOrEqual(1);
  });
});
