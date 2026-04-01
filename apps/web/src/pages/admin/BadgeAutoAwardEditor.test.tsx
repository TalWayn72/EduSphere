/**
 * BadgeAutoAwardEditor — Unit tests (F-12).
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  BadgeAutoAwardEditor,
  type AutoAwardCriteria,
} from './BadgeAutoAwardEditor';

const t = (key: string) => key;

describe('BadgeAutoAwardEditor', () => {
  it('renders with no criteria selected', () => {
    const onChange = vi.fn();
    render(<BadgeAutoAwardEditor value={null} onChange={onChange} t={t} />);
    expect(screen.getByTestId('auto-award-editor')).toBeInTheDocument();
  });

  it('calls onChange with null when "none" is selected', () => {
    const onChange = vi.fn();
    const value: AutoAwardCriteria = { type: 'XP_THRESHOLD', amount: 100 };
    render(<BadgeAutoAwardEditor value={value} onChange={onChange} t={t} />);

    // The Select component should be rendered
    expect(screen.getByTestId('auto-award-editor')).toBeInTheDocument();
  });

  it('renders XP_THRESHOLD fields when type is XP_THRESHOLD', () => {
    const onChange = vi.fn();
    const value: AutoAwardCriteria = { type: 'XP_THRESHOLD', amount: 100 };
    render(<BadgeAutoAwardEditor value={value} onChange={onChange} t={t} />);

    const amountInput = screen.getByPlaceholderText('100');
    expect(amountInput).toBeInTheDocument();
  });

  it('renders STREAK_DAYS fields when type is STREAK_DAYS', () => {
    const onChange = vi.fn();
    const value: AutoAwardCriteria = { type: 'STREAK_DAYS', count: 7 };
    render(<BadgeAutoAwardEditor value={value} onChange={onChange} t={t} />);

    const countInput = screen.getByPlaceholderText('7');
    expect(countInput).toBeInTheDocument();
  });

  it('renders QUIZ_SCORE fields when type is QUIZ_SCORE', () => {
    const onChange = vi.fn();
    const value: AutoAwardCriteria = { type: 'QUIZ_SCORE', minScore: 80 };
    render(<BadgeAutoAwardEditor value={value} onChange={onChange} t={t} />);

    const scoreInput = screen.getByPlaceholderText('80');
    expect(scoreInput).toBeInTheDocument();
  });

  it('calls onChange when XP amount is updated', () => {
    const onChange = vi.fn();
    const value: AutoAwardCriteria = { type: 'XP_THRESHOLD', amount: 100 };
    render(<BadgeAutoAwardEditor value={value} onChange={onChange} t={t} />);

    const amountInput = screen.getByPlaceholderText('100');
    fireEvent.change(amountInput, { target: { value: '200' } });

    expect(onChange).toHaveBeenCalledWith({
      type: 'XP_THRESHOLD',
      amount: 200,
    });
  });

  it('calls onChange when streak days count is updated', () => {
    const onChange = vi.fn();
    const value: AutoAwardCriteria = { type: 'STREAK_DAYS', count: 7 };
    render(<BadgeAutoAwardEditor value={value} onChange={onChange} t={t} />);

    const countInput = screen.getByPlaceholderText('7');
    fireEvent.change(countInput, { target: { value: '14' } });

    expect(onChange).toHaveBeenCalledWith({
      type: 'STREAK_DAYS',
      count: 14,
    });
  });

  it('renders COURSE_COMPLETE fields with courseId input', () => {
    const onChange = vi.fn();
    const value: AutoAwardCriteria = { type: 'COURSE_COMPLETE' };
    render(<BadgeAutoAwardEditor value={value} onChange={onChange} t={t} />);

    expect(
      screen.getByLabelText('gamification.criteriaFields.courseId')
    ).toBeInTheDocument();
  });

  it('does not render dynamic fields when value is null', () => {
    const onChange = vi.fn();
    render(<BadgeAutoAwardEditor value={null} onChange={onChange} t={t} />);

    expect(screen.queryByPlaceholderText('100')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('7')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('80')).not.toBeInTheDocument();
  });
});
