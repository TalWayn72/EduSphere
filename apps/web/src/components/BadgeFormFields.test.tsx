import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadgeFormFields } from './BadgeFormFields';
import type { BadgeFormData } from './BadgeFormFields';

const DEFAULT_VALUE: BadgeFormData = {
  name: 'Test Badge',
  description: 'A test badge',
  iconEmoji: '🏆',
  category: 'achievement',
  pointsReward: 100,
  conditionType: 'courses_completed',
  conditionValue: 5,
};

const defaultProps = {
  value: DEFAULT_VALUE,
  onChange: vi.fn(),
  onSave: vi.fn(),
  onCancel: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BadgeFormFields', () => {
  it('renders all input placeholders', () => {
    render(<BadgeFormFields {...defaultProps} />);
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/icon emoji/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Category')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/points reward/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/condition type/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/condition value/i)).toBeInTheDocument();
  });

  it('displays current values in inputs', () => {
    render(<BadgeFormFields {...defaultProps} />);
    expect(screen.getByDisplayValue('Test Badge')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A test badge')).toBeInTheDocument();
    expect(screen.getByDisplayValue('🏆')).toBeInTheDocument();
    expect(screen.getByDisplayValue('achievement')).toBeInTheDocument();
  });

  it('calls onChange with updated name when Name input changes', () => {
    const onChange = vi.fn();
    render(<BadgeFormFields {...defaultProps} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Name'), {
      target: { value: 'New Badge' },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_VALUE,
      name: 'New Badge',
    });
  });

  it('calls onChange with updated description', () => {
    const onChange = vi.fn();
    render(<BadgeFormFields {...defaultProps} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Description'), {
      target: { value: 'Updated desc' },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_VALUE,
      description: 'Updated desc',
    });
  });

  it('calls onChange with numeric pointsReward', () => {
    const onChange = vi.fn();
    render(<BadgeFormFields {...defaultProps} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText(/points reward/i), {
      target: { value: '200' },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_VALUE,
      pointsReward: 200,
    });
  });

  it('calls onChange with numeric conditionValue', () => {
    const onChange = vi.fn();
    render(<BadgeFormFields {...defaultProps} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText(/condition value/i), {
      target: { value: '10' },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_VALUE,
      conditionValue: 10,
    });
  });

  it('calls onSave when Save button is clicked', () => {
    const onSave = vi.fn();
    render(<BadgeFormFields {...defaultProps} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<BadgeFormFields {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows "Saving..." text when saving=true', () => {
    render(<BadgeFormFields {...defaultProps} saving={true} />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
  });

  it('disables Save button when saving=true', () => {
    render(<BadgeFormFields {...defaultProps} saving={true} />);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });

  it('uses custom saveLabel when provided', () => {
    render(<BadgeFormFields {...defaultProps} saveLabel="Create Badge" />);
    expect(
      screen.getByRole('button', { name: /create badge/i })
    ).toBeInTheDocument();
  });

  it('defaults saveLabel to "Save"', () => {
    render(<BadgeFormFields {...defaultProps} />);
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
  });
});
