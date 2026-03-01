import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { AnnotationForm } from './AnnotationForm';

vi.mock('@/types/annotations', () => ({
  AnnotationLayer: {
    PERSONAL: 'PERSONAL',
    SHARED: 'SHARED',
    INSTRUCTOR: 'INSTRUCTOR',
    AI_GENERATED: 'AI_GENERATED',
  },
  ANNOTATION_LAYER_CONFIGS: {
    PERSONAL: {
      layer: 'PERSONAL',
      label: 'Private',
      icon: '🔒',
      description: 'Only you can see these',
      color: 'text-blue-600',
      canCreate: () => true,
    },
    SHARED: {
      layer: 'SHARED',
      label: 'Public',
      icon: '👥',
      description: 'All students can see these',
      color: 'text-green-600',
      canCreate: () => true,
    },
    INSTRUCTOR: {
      layer: 'INSTRUCTOR',
      label: 'Authority',
      icon: '🎓',
      description: 'Instructor annotations',
      color: 'text-purple-600',
      canCreate: (role: string) => role === 'instructor',
    },
    AI_GENERATED: {
      layer: 'AI_GENERATED',
      label: 'AI Insights',
      icon: '🤖',
      description: 'AI-generated insights',
      color: 'text-orange-600',
      canCreate: (role: string) => role === 'ai',
    },
  },
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select">{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-testid={`select-item-${value}`}>{children}</div>,
}));

const defaultProps = {
  userRole: 'student' as const,
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AnnotationForm', () => {
  it('renders "Add Annotation" label when no parentId', () => {
    render(<AnnotationForm {...defaultProps} />);
    expect(
      screen.getByText('Add Annotation', { selector: 'label' })
    ).toBeInTheDocument();
  });

  it('renders "Add Reply" label when parentId is provided', () => {
    render(<AnnotationForm {...defaultProps} parentId="parent-1" />);
    expect(screen.getByText('Add Reply')).toBeInTheDocument();
  });

  it('hides layer select and timestamp input when parentId is set', () => {
    render(<AnnotationForm {...defaultProps} parentId="parent-1" />);
    expect(screen.queryByTestId('select')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/mm:ss/i)).not.toBeInTheDocument();
  });

  it('shows layer select and timestamp input when no parentId', () => {
    render(<AnnotationForm {...defaultProps} />);
    expect(screen.getByTestId('select')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/mm:ss/i)).toBeInTheDocument();
  });

  it('submit button is disabled when textarea is empty', () => {
    render(<AnnotationForm {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /add annotation/i })
    ).toBeDisabled();
  });

  it('enables submit button after typing content', () => {
    render(<AnnotationForm {...defaultProps} />);
    fireEvent.change(screen.getByRole('textbox', { name: /add annotation/i }), {
      target: { value: 'My note' },
    });
    expect(
      screen.getByRole('button', { name: /add annotation/i })
    ).not.toBeDisabled();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<AnnotationForm {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onSubmit and clears textarea on form submit', () => {
    const onSubmit = vi.fn();
    render(<AnnotationForm {...defaultProps} onSubmit={onSubmit} />);
    const textarea = screen.getByRole('textbox', { name: /add annotation/i });
    fireEvent.change(textarea, { target: { value: 'Test annotation' } });
    fireEvent.click(screen.getByRole('button', { name: /add annotation/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      'Test annotation',
      'PERSONAL',
      undefined
    );
    expect(textarea).toHaveValue('');
  });

  it('renders only student-available layer options', () => {
    render(<AnnotationForm {...defaultProps} />);
    expect(screen.getByTestId('select-item-PERSONAL')).toBeInTheDocument();
    expect(screen.getByTestId('select-item-SHARED')).toBeInTheDocument();
    expect(
      screen.queryByTestId('select-item-INSTRUCTOR')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('select-item-AI_GENERATED')
    ).not.toBeInTheDocument();
  });

  it('pre-fills timestamp input when contentTimestamp is provided', () => {
    render(<AnnotationForm {...defaultProps} contentTimestamp={90} />);
    expect(screen.getByPlaceholderText(/mm:ss/i)).toHaveValue('01:30');
  });

  it('shows "Post Reply" submit button when parentId is given', () => {
    render(<AnnotationForm {...defaultProps} parentId="parent-1" />);
    expect(
      screen.getByRole('button', { name: /post reply/i })
    ).toBeInTheDocument();
  });

  it('does not call onSubmit when content is whitespace only', () => {
    const onSubmit = vi.fn();
    render(<AnnotationForm {...defaultProps} onSubmit={onSubmit} />);
    const textarea = screen.getByRole('textbox', { name: /add annotation/i });
    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /add annotation/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
