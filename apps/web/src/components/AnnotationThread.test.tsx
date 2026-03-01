import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnotationThread } from './AnnotationThread';
import type { Annotation } from '@/types/annotations';
import { AnnotationLayer } from '@/types/annotations';

const BASE_ANNOTATION: Annotation = {
  id: 'ann-1',
  content: 'This is important',
  layer: AnnotationLayer.PERSONAL,
  userId: 'u1',
  userName: 'Alice',
  userRole: 'student',
  timestamp: '1:30',
  contentId: 'c1',
  contentTimestamp: 90,
  createdAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
  replies: [],
};

const defaultProps = {
  annotation: BASE_ANNOTATION,
  onSeek: vi.fn(),
  onReply: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AnnotationThread', () => {
  it('renders annotation content', () => {
    render(<AnnotationThread {...defaultProps} />);
    expect(screen.getByText('This is important')).toBeInTheDocument();
  });

  it('renders author name', () => {
    render(<AnnotationThread {...defaultProps} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders timestamp from annotation.timestamp field', () => {
    render(<AnnotationThread {...defaultProps} />);
    expect(screen.getByText('1:30')).toBeInTheDocument();
  });

  it('calls onSeek with contentTimestamp when card is clicked', () => {
    const onSeek = vi.fn();
    render(<AnnotationThread {...defaultProps} onSeek={onSeek} />);
    fireEvent.click(
      screen.getByRole('button', { name: /annotation by alice/i })
    );
    expect(onSeek).toHaveBeenCalledWith(90);
  });

  it('renders the Reply button', () => {
    render(<AnnotationThread {...defaultProps} />);
    expect(screen.getByText('Reply')).toBeInTheDocument();
  });

  it('shows reply input when Reply is clicked', () => {
    render(<AnnotationThread {...defaultProps} />);
    fireEvent.click(screen.getByText('Reply'));
    expect(
      screen.getByPlaceholderText(/reply\.\.\./i)
    ).toBeInTheDocument();
  });

  it('shows reply count button when replies exist', () => {
    const annotationWithReplies: Annotation = {
      ...BASE_ANNOTATION,
      replies: [
        {
          ...BASE_ANNOTATION,
          id: 'r1',
          content: 'A reply',
          userId: 'u2',
          userName: 'Bob',
        },
      ],
    };
    render(
      <AnnotationThread {...defaultProps} annotation={annotationWithReplies} />
    );
    expect(screen.getByText(/1 reply/i)).toBeInTheDocument();
  });

  it('expands replies when count button is clicked', () => {
    const annotationWithReplies: Annotation = {
      ...BASE_ANNOTATION,
      replies: [
        {
          ...BASE_ANNOTATION,
          id: 'r1',
          content: 'Reply content',
          userId: 'u2',
          userName: 'Bob',
        },
      ],
    };
    render(
      <AnnotationThread {...defaultProps} annotation={annotationWithReplies} />
    );
    fireEvent.click(screen.getByText(/1 reply/i));
    expect(screen.getByText('Reply content')).toBeInTheDocument();
  });

  it('calls onReply when reply is submitted via Send button', () => {
    const onReply = vi.fn();
    render(<AnnotationThread {...defaultProps} onReply={onReply} />);
    fireEvent.click(screen.getByText('Reply'));
    fireEvent.change(screen.getByPlaceholderText(/reply\.\.\./i), {
      target: { value: 'My reply text' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reply/i }));
    expect(onReply).toHaveBeenCalledWith(
      'ann-1',
      'My reply text',
      AnnotationLayer.PERSONAL
    );
  });

  it('hides reply input after Escape key', () => {
    render(<AnnotationThread {...defaultProps} />);
    fireEvent.click(screen.getByText('Reply'));
    const input = screen.getByPlaceholderText(/reply\.\.\./i);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(
      screen.queryByPlaceholderText(/reply\.\.\./i)
    ).not.toBeInTheDocument();
  });
});
