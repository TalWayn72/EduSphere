import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommentCard } from './CommentCard';
import { AnnotationLayer, type Annotation } from '@/types/annotations';

const SHORT_TEXT = 'Short comment text';
// 121 chars — above TRUNCATE_THRESHOLD of 120
const LONG_TEXT = 'A'.repeat(121);

const baseAnnotation: Annotation = {
  id: 'ann-1',
  content: SHORT_TEXT,
  layer: AnnotationLayer.PERSONAL,
  userId: 'user-1',
  userName: 'Alice Student',
  userRole: 'student',
  timestamp: '2026-01-01T00:00:00Z',
  contentId: 'content-1',
  createdAt: new Date(Date.now() - 2 * 60_000).toISOString(), // 2 min ago
  updatedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
};

const makeReply = (id: string, content: string): Annotation => ({
  ...baseAnnotation,
  id,
  content,
  parentId: 'ann-1',
});

describe('CommentCard — basic rendering', () => {
  it('renders the author name', () => {
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.getByText('Alice Student')).toBeTruthy();
  });

  it('renders short comment text without truncation toggle', () => {
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.getByText(SHORT_TEXT)).toBeTruthy();
    expect(screen.queryByText('show more')).toBeNull();
    expect(screen.queryByText('show less')).toBeNull();
  });

  it('calls onFocus with annotation id when card is clicked', () => {
    const onFocus = vi.fn();
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={onFocus}
      />
    );
    fireEvent.click(screen.getByRole('article'));
    expect(onFocus).toHaveBeenCalledWith('ann-1');
  });

  it('applies focused styles when isFocused is true', () => {
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={true}
        onFocus={vi.fn()}
      />
    );
    const article = screen.getByRole('article');
    expect(article.className).toContain('ring-1');
  });
});

describe('CommentCard — long text truncation', () => {
  beforeEach(() => {
    render(
      <CommentCard
        annotation={{ ...baseAnnotation, content: LONG_TEXT }}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
  });

  it('initially shows truncated text with ellipsis and show-more button', () => {
    expect(screen.getByText('show more')).toBeTruthy();
    const p = screen.getByText((text) => text.includes('\u2026'));
    expect(p).toBeTruthy();
  });

  it('clicking "show more" expands to full text and shows "show less"', () => {
    fireEvent.click(screen.getByText('show more'));
    expect(screen.queryByText('show more')).toBeNull();
    expect(screen.getByText('show less')).toBeTruthy();
    // Full text should now be visible (no ellipsis)
    expect(screen.queryByText((text) => text.includes('\u2026'))).toBeNull();
  });

  it('clicking "show less" after expansion collapses text again', () => {
    fireEvent.click(screen.getByText('show more'));
    fireEvent.click(screen.getByText('show less'));
    expect(screen.getByText('show more')).toBeTruthy();
  });

  it('show-more/less click does not propagate to card (onFocus not called)', () => {
    const onFocus = vi.fn();
    render(
      <CommentCard
        annotation={{ ...baseAnnotation, content: LONG_TEXT }}
        isFocused={false}
        onFocus={onFocus}
      />
    );
    fireEvent.click(screen.getAllByText('show more')[0]);
    expect(onFocus).not.toHaveBeenCalled();
  });
});

describe('CommentCard — reply button', () => {
  it('renders Reply button when onReply is provided and depth is 0', () => {
    const onReply = vi.fn();
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
        onReply={onReply}
        depth={0}
      />
    );
    expect(screen.getByText(/Reply/i)).toBeTruthy();
  });

  it('calls onReply with annotation id when Reply is clicked', () => {
    const onReply = vi.fn();
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
        onReply={onReply}
        depth={0}
      />
    );
    fireEvent.click(screen.getByText(/Reply/i));
    expect(onReply).toHaveBeenCalledWith('ann-1');
  });

  it('does not render Reply button at depth=1 (nested reply)', () => {
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
        onReply={vi.fn()}
        depth={1}
      />
    );
    expect(screen.queryByText(/Reply/i)).toBeNull();
  });

  it('does not render Reply button when onReply prop is absent', () => {
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.queryByText(/Reply/i)).toBeNull();
  });
});

describe('CommentCard — replies thread', () => {
  const replies = [
    makeReply('reply-1', 'First reply'),
    makeReply('reply-2', 'Second reply'),
  ];
  const annotationWithReplies: Annotation = {
    ...baseAnnotation,
    replies,
  };

  it('shows reply count toggle button when replies exist', () => {
    render(
      <CommentCard
        annotation={annotationWithReplies}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('replies are hidden by default', () => {
    render(
      <CommentCard
        annotation={annotationWithReplies}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.queryByText('First reply')).toBeNull();
    expect(screen.queryByText('Second reply')).toBeNull();
  });

  it('clicking reply-count button reveals nested reply cards', () => {
    render(
      <CommentCard
        annotation={annotationWithReplies}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('2'));
    expect(screen.getByText('First reply')).toBeTruthy();
    expect(screen.getByText('Second reply')).toBeTruthy();
  });

  it('clicking reply-count button again hides replies', () => {
    render(
      <CommentCard
        annotation={annotationWithReplies}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('2'));
    fireEvent.click(screen.getByText('2'));
    expect(screen.queryByText('First reply')).toBeNull();
  });

  it('does not show reply toggle when annotation has no replies', () => {
    render(
      <CommentCard
        annotation={{ ...baseAnnotation, replies: [] }}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    // No number text for reply count
    expect(screen.queryByText('0')).toBeNull();
  });
});

describe('CommentCard — resolve button', () => {
  it('calls onResolve with annotation id when Resolve is clicked', () => {
    const onResolve = vi.fn();
    render(
      <CommentCard
        annotation={baseAnnotation}
        isFocused={false}
        onFocus={vi.fn()}
        onResolve={onResolve}
      />
    );
    fireEvent.click(screen.getByText(/Resolve/i));
    expect(onResolve).toHaveBeenCalledWith('ann-1');
  });
});

describe('CommentCard — layer badge', () => {
  it('renders INSTRUCTOR layer badge', () => {
    render(
      <CommentCard
        annotation={{
          ...baseAnnotation,
          layer: AnnotationLayer.INSTRUCTOR,
          userRole: 'instructor',
        }}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.getByText(/Authority/i)).toBeTruthy();
  });

  it('renders AI_GENERATED layer badge', () => {
    render(
      <CommentCard
        annotation={{
          ...baseAnnotation,
          layer: AnnotationLayer.AI_GENERATED,
          userRole: 'ai',
        }}
        isFocused={false}
        onFocus={vi.fn()}
      />
    );
    expect(screen.getByText(/AI Insights/i)).toBeTruthy();
  });
});
