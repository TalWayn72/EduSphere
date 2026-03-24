import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Imports ───────────────────────────────────────────────────────────────────

import { CreateLessonStep1 } from './CreateLessonPage.step1';
import type { LessonFormData } from './CreateLessonPage';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DEFAULT_INITIAL: LessonFormData = {
  title: '',
  type: 'THEMATIC',
  lessonDate: '',
};

const renderStep1 = (onSubmit = vi.fn(), initialData = DEFAULT_INITIAL) =>
  render(<CreateLessonStep1 initialData={initialData} onSubmit={onSubmit} />);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CreateLessonStep1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the step heading via i18n', () => {
    renderStep1();
    expect(screen.getByText('Lesson Details')).toBeInTheDocument();
  });

  it('renders the title input with i18n placeholder', () => {
    renderStep1();
    expect(screen.getByPlaceholderText(/Tree of Life lesson/i)).toBeInTheDocument();
  });

  it('renders THEMATIC and SEQUENTIAL radio options via i18n', () => {
    renderStep1();
    expect(screen.getByText('General (Thematic)')).toBeInTheDocument();
    expect(screen.getByText('Sequential')).toBeInTheDocument();
  });

  it('series field is not visible (removed)', () => {
    renderStep1();
    expect(screen.queryByPlaceholderText(/ספר עץ חיים/i)).not.toBeInTheDocument();
  });

  it('renders lesson date input (type=date)', () => {
    renderStep1();
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders submit button with i18n text', () => {
    renderStep1();
    expect(
      screen.getByRole('button', { name: /Continue to Materials/i })
    ).toBeInTheDocument();
  });

  it('shows i18n validation error when title is too short (< 3 chars)', async () => {
    renderStep1();
    fireEvent.click(screen.getByRole('button', { name: /Continue to Materials/i }));
    await waitFor(() => {
      expect(
        screen.getByText('Title must contain at least 3 characters')
      ).toBeInTheDocument();
    });
  });

  it('calls onSubmit with title and THEMATIC type when form is submitted', async () => {
    const onSubmit = vi.fn();
    renderStep1(onSubmit);
    fireEvent.change(screen.getByPlaceholderText(/Tree of Life lesson/i), {
      target: { value: 'Test Lesson' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue to Materials/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const callArg = onSubmit.mock.calls[0]![0]! as LessonFormData;
    expect(callArg.title).toBe('Test Lesson');
    expect(callArg.type).toBe('THEMATIC');
  });

  it('switches type to SEQUENTIAL when that radio is clicked', async () => {
    const onSubmit = vi.fn();
    renderStep1(onSubmit);
    const radios = screen.getAllByRole('radio');
    // SEQUENTIAL is the second radio
    fireEvent.click(radios[1]!);
    fireEvent.change(screen.getByPlaceholderText(/Tree of Life lesson/i), {
      target: { value: 'Test Lesson' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue to Materials/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const callArg = onSubmit.mock.calls[0]![0]! as LessonFormData;
    expect(callArg.type).toBe('SEQUENTIAL');
  });

  it('populates initial data from props', () => {
    const initial: LessonFormData = {
      title: 'Existing',
      type: 'SEQUENTIAL',
      lessonDate: '2026-03-01',
    };
    renderStep1(vi.fn(), initial);
    expect(screen.getByDisplayValue('Existing')).toBeInTheDocument();
  });
});
