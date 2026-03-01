import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Imports ───────────────────────────────────────────────────────────────────

import { CreateLessonStep1 } from './CreateLessonPage.step1';
import type { LessonFormData } from './CreateLessonPage';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DEFAULT_INITIAL: LessonFormData = {
  title: '',
  type: 'THEMATIC',
  series: '',
  lessonDate: '',
};

const renderStep1 = (onSubmit = vi.fn(), initialData = DEFAULT_INITIAL) =>
  render(<CreateLessonStep1 initialData={initialData} onSubmit={onSubmit} />);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CreateLessonStep1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the step heading', () => {
    renderStep1();
    expect(screen.getByText('פרטי שיעור')).toBeInTheDocument();
  });

  it('renders the title input with correct placeholder', () => {
    renderStep1();
    expect(
      screen.getByPlaceholderText(/שיעור עץ חיים/i)
    ).toBeInTheDocument();
  });

  it('renders THEMATIC and SEQUENTIAL radio options', () => {
    renderStep1();
    expect(screen.getByText('הגות (נושאי)')).toBeInTheDocument();
    expect(screen.getByText('על הסדר')).toBeInTheDocument();
  });

  it('renders series input field', () => {
    renderStep1();
    expect(screen.getByPlaceholderText(/ספר עץ חיים/i)).toBeInTheDocument();
  });

  it('renders lesson date input (type=date)', () => {
    renderStep1();
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders submit button', () => {
    renderStep1();
    expect(
      screen.getByRole('button', { name: /המשך לחומרים/i })
    ).toBeInTheDocument();
  });

  it('shows validation error when title is too short (< 3 chars)', async () => {
    renderStep1();
    fireEvent.click(screen.getByRole('button', { name: /המשך לחומרים/i }));
    await waitFor(() => {
      expect(
        screen.getByText('כותרת חייבת להכיל לפחות 3 תווים')
      ).toBeInTheDocument();
    });
  });

  it('calls onSubmit with title and THEMATIC type when form is submitted', async () => {
    const onSubmit = vi.fn();
    renderStep1(onSubmit);
    fireEvent.change(screen.getByPlaceholderText(/שיעור עץ חיים/i), {
      target: { value: 'שיעור בדיקה' },
    });
    fireEvent.click(screen.getByRole('button', { name: /המשך לחומרים/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const callArg = onSubmit.mock.calls[0]![0]! as LessonFormData;
    expect(callArg.title).toBe('שיעור בדיקה');
    expect(callArg.type).toBe('THEMATIC');
  });

  it('switches type to SEQUENTIAL when that radio is clicked', async () => {
    const onSubmit = vi.fn();
    renderStep1(onSubmit);
    const radios = screen.getAllByRole('radio');
    // SEQUENTIAL is the second radio
    fireEvent.click(radios[1]!);
    fireEvent.change(screen.getByPlaceholderText(/שיעור עץ חיים/i), {
      target: { value: 'שיעור בדיקה' },
    });
    fireEvent.click(screen.getByRole('button', { name: /המשך לחומרים/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const callArg = onSubmit.mock.calls[0]![0]! as LessonFormData;
    expect(callArg.type).toBe('SEQUENTIAL');
  });

  it('populates initial data from props', () => {
    const initial: LessonFormData = {
      title: 'קיים',
      type: 'SEQUENTIAL',
      series: 'סדרה',
      lessonDate: '2026-03-01',
    };
    renderStep1(vi.fn(), initial);
    expect(screen.getByDisplayValue('קיים')).toBeInTheDocument();
  });
});
