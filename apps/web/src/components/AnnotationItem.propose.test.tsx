/**
 * AnnotationItem — Propose to Official button tests (PRD §4.3 regression guard).
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnotationItem } from './AnnotationItem';
import { AnnotationLayer, type Annotation } from '@/types/annotations';

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('./AnnotationForm', () => ({
  AnnotationForm: () => <div data-testid="annotation-form" />,
}));

const PERSONAL_ANNOTATION: Annotation = {
  id: 'ann-personal-1',
  content: 'This is a private annotation about free will.',
  layer: AnnotationLayer.PERSONAL,
  userId: 'user-42',
  userName: 'Alice',
  userRole: 'student',
  timestamp: '1:23',
  contentId: 'content-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  replies: [],
};

const SHARED_ANNOTATION: Annotation = {
  ...PERSONAL_ANNOTATION,
  id: 'ann-shared-1',
  layer: AnnotationLayer.SHARED,
};

const INSTRUCTOR_ANNOTATION: Annotation = {
  ...PERSONAL_ANNOTATION,
  id: 'ann-instructor-1',
  layer: AnnotationLayer.INSTRUCTOR,
  userRole: 'instructor',
};

describe('AnnotationItem — Propose to Official button', () => {
  it('shows Propose button for own PERSONAL annotation when onPropose is provided', () => {
    render(
      <AnnotationItem
        annotation={PERSONAL_ANNOTATION}
        currentUserId="user-42"
        currentUserRole="student"
        onReply={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPropose={vi.fn()}
      />
    );
    expect(screen.getByText('Propose to Official')).toBeInTheDocument();
  });

  it('does NOT show Propose button for SHARED annotations', () => {
    render(
      <AnnotationItem
        annotation={SHARED_ANNOTATION}
        currentUserId="user-42"
        currentUserRole="student"
        onReply={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPropose={vi.fn()}
      />
    );
    expect(screen.queryByText('Propose to Official')).not.toBeInTheDocument();
  });

  it('does NOT show Propose button when onPropose is not provided', () => {
    render(
      <AnnotationItem
        annotation={PERSONAL_ANNOTATION}
        currentUserId="user-42"
        currentUserRole="student"
        onReply={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.queryByText('Propose to Official')).not.toBeInTheDocument();
  });

  it('does NOT show Propose button when annotation belongs to another user', () => {
    render(
      <AnnotationItem
        annotation={PERSONAL_ANNOTATION}
        currentUserId="user-99"  // different user
        currentUserRole="student"
        onReply={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPropose={vi.fn()}
      />
    );
    expect(screen.queryByText('Propose to Official')).not.toBeInTheDocument();
  });

  it('calls onPropose with the annotation id when button is clicked', () => {
    const onPropose = vi.fn();
    render(
      <AnnotationItem
        annotation={PERSONAL_ANNOTATION}
        currentUserId="user-42"
        currentUserRole="student"
        onReply={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPropose={onPropose}
      />
    );
    fireEvent.click(screen.getByText('Propose to Official'));
    expect(onPropose).toHaveBeenCalledWith('ann-personal-1');
  });

  it('does NOT show Propose button for INSTRUCTOR annotations', () => {
    render(
      <AnnotationItem
        annotation={INSTRUCTOR_ANNOTATION}
        currentUserId="user-42"
        currentUserRole="instructor"
        onReply={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPropose={vi.fn()}
      />
    );
    expect(screen.queryByText('Propose to Official')).not.toBeInTheDocument();
  });

  it('propose button has correct aria-label for accessibility', () => {
    render(
      <AnnotationItem
        annotation={PERSONAL_ANNOTATION}
        currentUserId="user-42"
        currentUserRole="student"
        onReply={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPropose={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /propose to official content/i })
    ).toBeInTheDocument();
  });
});
