import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('urql', () => ({ useMutation: vi.fn(() => [{}, vi.fn()]) }));
vi.mock('@/components/ui/button', () => ({ Button: (p: any) => <button {...p} /> }));
vi.mock('lucide-react', () => ({ ThumbsUp: () => <span>Like</span>, CornerDownRight: () => <span>Reply</span> }));
vi.mock('@/lib/graphql/discussion.queries', () => ({ LIKE_MESSAGE_MUTATION: 'LIKE_MESSAGE_MUTATION' }));

import MessageItem from './MessageItem';

const MSG = {
  id: "m1", userId: "u1", content: "Hello world",
  parentMessageId: null, likesCount: 5, isLikedByMe: false, createdAt: "2026-03-10T10:00:00Z",
};

describe('MessageItem', () => {
  it('renders message content', () => {
    render(<MessageItem message={MSG} onReply={vi.fn()} />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it('shows likes count', () => {
    render(<MessageItem message={MSG} onReply={vi.fn()} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it('uses display name initials', () => {
    render(<MessageItem message={MSG} onReply={vi.fn()} displayName="John Doe" />);
    expect(screen.getByText("J")).toBeInTheDocument();
  });
});