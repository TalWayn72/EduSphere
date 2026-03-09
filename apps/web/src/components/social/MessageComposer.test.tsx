import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as urql from 'urql';
import MessageComposer from './MessageComposer';

vi.mock('urql', async () => ({ ...await vi.importActual('urql'), useMutation: vi.fn() }));

const mockMutate = vi.fn().mockResolvedValue({ data: undefined, error: undefined });
const NOOP_MUTATION = [{ fetching: false }, mockMutate] as never;

describe('MessageComposer', () => {
  beforeEach(() => {
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
  });

  it('renders textarea with correct test id', () => {
    render(<MessageComposer discussionId="d1" />);
    expect(screen.getByTestId('message-composer')).toBeInTheDocument();
  });

  it('submit button is disabled when textarea is empty', () => {
    render(<MessageComposer discussionId="d1" />);
    expect(screen.getByRole('button', { name: /Send/i })).toBeDisabled();
  });

  it('calls mutation with text on submit', async () => {
    render(<MessageComposer discussionId="d1" />);
    const textarea = screen.getByTestId('message-composer');
    fireEvent.change(textarea, { target: { value: 'Hello world' } });
    fireEvent.click(screen.getByRole('button', { name: /Send/i }));
    expect(mockMutate).toHaveBeenCalledWith(
      { discussionId: 'd1', input: { content: 'Hello world', parentMessageId: null } },
      expect.anything(),
    );
  });

  it('shows reply preview when replyToId and replyToContent are set', () => {
    render(
      <MessageComposer
        discussionId="d1"
        replyToId="msg-1"
        replyToContent="Original message text"
      />,
    );
    expect(screen.getByText(/Replying to:/i)).toBeInTheDocument();
    expect(screen.getByText(/Original message text/i)).toBeInTheDocument();
  });

  it('calls onReplyCleared when X button is clicked', () => {
    const onReplyCleared = vi.fn();
    render(
      <MessageComposer
        discussionId="d1"
        replyToId="msg-1"
        replyToContent="Original message text"
        onReplyCleared={onReplyCleared}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Clear reply/i }));
    expect(onReplyCleared).toHaveBeenCalledTimes(1);
  });
});
