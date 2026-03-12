import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

// ── urql mock ──────────────────────────────────────────────────────────────────
const mockCreateContentItem = vi.fn().mockResolvedValue({ data: {}, error: undefined });

vi.mock('urql', () => ({
  useMutation: vi.fn(() => [{ fetching: false, error: undefined }, mockCreateContentItem]),
  gql: (s: TemplateStringsArray) => s.join(''),
}));

// ── auth role mock ─────────────────────────────────────────────────────────────
const mockRole = { value: 'INSTRUCTOR' };
vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: () => mockRole.value,
}));

// ── router mock (preserve Navigate) ───────────────────────────────────────────
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as object),
    useNavigate: () => vi.fn(),
    useParams: () => ({
      courseId: '00000000-0000-0000-0000-000000000001',
      moduleId: '00000000-0000-0000-0000-000000000002',
    }),
  };
});

// ── UI component mocks ────────────────────────────────────────────────────────
vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    type,
    disabled,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button type={type ?? 'button'} onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/slider', () => ({
  Slider: ({
    onValueChange,
    value,
    ...rest
  }: {
    onValueChange?: (v: number[]) => void;
    value?: number[];
    min?: number;
    max?: number;
    step?: number;
    id?: string;
    className?: string;
    'aria-label'?: string;
  }) => (
    <input
      type="range"
      value={value?.[0] ?? 70}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      {...rest}
    />
  ),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/graphql/content.queries', () => ({
  CREATE_CONTENT_ITEM_MUTATION: 'MOCK_CREATE_CONTENT_ITEM',
}));

vi.mock('lucide-react', () => ({
  Trash2: () => <span>TrashIcon</span>,
  PlusCircle: () => <span>PlusIcon</span>,
  X: () => <span>CloseIcon</span>,
  Sparkles: () => <span>SparklesIcon</span>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

// ── Subject under test ────────────────────────────────────────────────────────
import { QuizBuilderPage } from './QuizBuilderPage';

// ── Helpers ───────────────────────────────────────────────────────────────────
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/courses/c1/modules/m1/quiz/new']}>
      <Routes>
        <Route
          path="/courses/:courseId/modules/:moduleId/quiz/new"
          element={<QuizBuilderPage />}
        />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('QuizBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole.value = 'INSTRUCTOR';
    mockCreateContentItem.mockResolvedValue({ data: {}, error: undefined });
  });

  it('redirects non-instructor (STUDENT role) to /dashboard', () => {
    mockRole.value = 'STUDENT';
    renderPage();
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.queryByText('Quiz Builder')).toBeNull();
  });

  it('renders "Quiz Builder" heading for INSTRUCTOR role', () => {
    renderPage();
    expect(screen.getByText('Quiz Builder')).toBeDefined();
  });

  it('"Add Question" button adds a question row', () => {
    renderPage();
    const addBtn = screen.getByRole('button', { name: /add question/i });
    fireEvent.click(addBtn);
    expect(screen.getByLabelText('Question 1 text')).toBeDefined();
  });

  it('"Remove" button decrements question count', () => {
    renderPage();
    const addBtn = screen.getByRole('button', { name: /add question/i });
    fireEvent.click(addBtn);
    fireEvent.click(addBtn);
    expect(screen.getAllByRole('button', { name: /remove question/i })).toHaveLength(2);

    const removeButtons = screen.getAllByRole('button', { name: /remove question/i });
    fireEvent.click(removeButtons[0]);
    expect(screen.getAllByRole('button', { name: /remove question/i })).toHaveLength(1);
  });

  it('shows validation error when submitting with no questions', async () => {
    renderPage();
    // Fill in the title to avoid the "title required" error
    const titleInput = screen.getByPlaceholderText(/e\.g\. Module 1 Assessment/i);
    fireEvent.change(titleInput, { target: { value: 'My Quiz' } });

    const submitBtn = screen.getByRole('button', { name: /create quiz/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Add at least one question');
    });
    expect(mockCreateContentItem).not.toHaveBeenCalled();
  });

  it('calls mutation with correct JSON body when form is valid', async () => {
    renderPage();

    // Set title
    const titleInput = screen.getByPlaceholderText(/e\.g\. Module 1 Assessment/i);
    fireEvent.change(titleInput, { target: { value: 'Test Quiz' } });

    // Add a question
    const addBtn = screen.getByRole('button', { name: /add question/i });
    fireEvent.click(addBtn);

    // Fill question text
    const questionInput = screen.getByLabelText('Question 1 text');
    fireEvent.change(questionInput, { target: { value: 'What is 2+2?' } });

    // Fill all 4 choices
    const choiceInputs = [
      screen.getByLabelText('Choice A for question 1'),
      screen.getByLabelText('Choice B for question 1'),
      screen.getByLabelText('Choice C for question 1'),
      screen.getByLabelText('Choice D for question 1'),
    ];
    fireEvent.change(choiceInputs[0], { target: { value: '3' } });
    fireEvent.change(choiceInputs[1], { target: { value: '4' } });
    fireEvent.change(choiceInputs[2], { target: { value: '5' } });
    fireEvent.change(choiceInputs[3], { target: { value: '6' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /create quiz/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateContentItem).toHaveBeenCalledOnce();
    });

    const callArg = mockCreateContentItem.mock.calls[0][0] as {
      input: { body: string; contentType: string };
    };
    expect(callArg.input.contentType).toBe('QUIZ');

    const body = JSON.parse(callArg.input.body) as {
      passingScore: number;
      items: { type: string; question: string; choices: string[]; correctIndex: number }[];
    };
    expect(typeof body.passingScore).toBe('number');
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].type).toBe('MULTIPLE_CHOICE');
    expect(body.items[0].question).toBe('What is 2+2?');
    expect(body.items[0].choices).toHaveLength(4);
  });
});
