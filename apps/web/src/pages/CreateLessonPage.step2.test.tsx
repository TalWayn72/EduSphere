import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as urql from 'urql';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/lesson.queries', () => ({
  CREATE_LESSON_MUTATION: 'CREATE_LESSON_MUTATION',
  ADD_LESSON_ASSET_MUTATION: 'ADD_LESSON_ASSET_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { CreateLessonStep2 } from './CreateLessonPage.step2';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOOP_EXECUTE = vi
  .fn()
  .mockResolvedValue({ data: null, error: undefined });

const renderStep2 = (props: {
  lessonId?: string;
  courseId?: string;
  onNext?: () => void;
}) =>
  render(
    <CreateLessonStep2
      lessonId={props.lessonId ?? ''}
      courseId={props.courseId ?? 'course-1'}
      onNext={props.onNext ?? vi.fn()}
    />
  );

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CreateLessonStep2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      NOOP_EXECUTE,
    ] as never);
  });

  it('renders the step heading', () => {
    renderStep2({});
    expect(screen.getByText('הוספת חומרים')).toBeInTheDocument();
  });

  it('renders the skip hint paragraph', () => {
    renderStep2({});
    expect(screen.getByText(/ניתן לדלג/i)).toBeInTheDocument();
  });

  it('renders YouTube URL input with placeholder', () => {
    renderStep2({ lessonId: 'lesson-1' });
    expect(screen.getByPlaceholderText(/youtube\.com/i)).toBeInTheDocument();
  });

  it('renders file input for PDF upload', () => {
    renderStep2({});
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', '.pdf,.docx,.txt');
  });

  it('shows "הוסף" (Add) button when lessonId is provided', () => {
    renderStep2({ lessonId: 'lesson-1' });
    expect(screen.getByRole('button', { name: /הוסף/i })).toBeInTheDocument();
  });

  it('does NOT show "הוסף" button when lessonId is empty', () => {
    renderStep2({ lessonId: '' });
    expect(
      screen.queryByRole('button', { name: /הוסף/i })
    ).not.toBeInTheDocument();
  });

  it('shows deferred hint text when lessonId is empty', () => {
    renderStep2({ lessonId: '' });
    expect(
      screen.getByText(/הקישור יתווסף לאחר יצירת השיעור/i)
    ).toBeInTheDocument();
  });

  it('shows validation error for invalid YouTube URL', async () => {
    renderStep2({ lessonId: 'lesson-1' });
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com/i), {
      target: { value: 'https://vimeo.com/123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /הוסף/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/חייב להיות כתובת YouTube תקינה/i)
      ).toBeInTheDocument()
    );
  });

  it('calls addAsset mutation with valid YouTube URL', async () => {
    renderStep2({ lessonId: 'lesson-1' });
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com/i), {
      target: { value: 'https://youtube.com/watch?v=abc123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /הוסף/i }));
    await waitFor(() =>
      expect(NOOP_EXECUTE).toHaveBeenCalledWith(
        expect.objectContaining({
          lessonId: 'lesson-1',
          input: expect.objectContaining({ assetType: 'VIDEO' }),
        })
      )
    );
  });

  it('calls onNext when "דלג" (Skip) button is clicked', () => {
    const onNext = vi.fn();
    renderStep2({ onNext });
    fireEvent.click(screen.getByRole('button', { name: /דלג/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when "המשך" (Continue) button is clicked', () => {
    const onNext = vi.fn();
    renderStep2({ onNext });
    fireEvent.click(screen.getByRole('button', { name: /המשך לבחירת תבנית/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
