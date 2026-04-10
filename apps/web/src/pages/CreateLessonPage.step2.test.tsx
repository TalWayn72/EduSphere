import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/graphql/lesson.queries', () => ({
  CREATE_LESSON_MUTATION: 'CREATE_LESSON_MUTATION',
  ADD_LESSON_ASSET_MUTATION: 'ADD_LESSON_ASSET_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { CreateLessonStep2 } from './CreateLessonPage.step2';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const renderStep2 = (props: {
  courseId?: string;
  onNext?: (videoUrl?: string) => void;
}) =>
  render(
    <CreateLessonStep2
      courseId={props.courseId ?? 'course-1'}
      onNext={props.onNext ?? vi.fn()}
    />
  );

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CreateLessonStep2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the step heading via i18n', () => {
    renderStep2({});
    expect(screen.getByRole('heading', { name: /Add Materials/i })).toBeInTheDocument();
  });

  it('renders the skip hint paragraph via i18n', () => {
    renderStep2({});
    expect(screen.getByText(/You can skip this step/i)).toBeInTheDocument();
  });

  it('renders YouTube URL input with placeholder', () => {
    renderStep2({});
    expect(screen.getByPlaceholderText(/youtube\.com/i)).toBeInTheDocument();
  });

  it('renders file input for PDF upload', () => {
    renderStep2({});
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('accept', '.pdf,.docx,.txt');
  });

  it('shows deferred hint text (link will be added after creating)', () => {
    renderStep2({});
    expect(
      screen.getByText(/link will be added after creating/i)
    ).toBeInTheDocument();
  });

  it('shows validation error for invalid YouTube URL when continuing', async () => {
    renderStep2({});
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com/i), {
      target: { value: 'https://vimeo.com/123' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Continue to Template/i })
    );
    await waitFor(() =>
      expect(
        screen.getByText(/Must be a valid YouTube URL/i)
      ).toBeInTheDocument()
    );
  });

  it('calls onNext with video URL when valid YouTube URL is entered', async () => {
    const onNext = vi.fn();
    renderStep2({ onNext });
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com/i), {
      target: { value: 'https://youtube.com/watch?v=abc123' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Continue to Template/i })
    );
    await waitFor(() =>
      expect(onNext).toHaveBeenCalledWith('https://youtube.com/watch?v=abc123')
    );
  });

  it('calls onNext when "Skip" button is clicked', () => {
    const onNext = vi.fn();
    renderStep2({ onNext });
    fireEvent.click(screen.getByRole('button', { name: /Skip/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when "Continue to Template" button is clicked with empty URL', () => {
    const onNext = vi.fn();
    renderStep2({ onNext });
    fireEvent.click(
      screen.getByRole('button', { name: /Continue to Template/i })
    );
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
