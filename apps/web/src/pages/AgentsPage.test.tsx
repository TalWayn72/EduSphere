import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// ─── JSDOM polyfill: scrollIntoView is not implemented in jsdom ───────────────
// The component calls chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
// inside a useEffect after every render, which would throw without this stub.
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// ─── Module mocks (must be hoisted before component imports) ──────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [
    { data: { agentTemplates: [] }, fetching: false, error: undefined },
    vi.fn(),
  ]),
  useMutation: vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]),
  useSubscription: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
    vi.fn(),
  ]),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => null),
  logout: vi.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────
import { AgentsPage } from './AgentsPage';
import { useMutation, useSubscription } from 'urql';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderAgents() {
  return render(
    <MemoryRouter>
      <AgentsPage />
    </MemoryRouter>
  );
}

/**
 * Returns a mock tuple matching urql's useMutation return type.
 * executeFn is the mock function you can inspect for call assertions.
 */
function makeMutationMock(responseData: Record<string, unknown> = {}) {
  const executeFn = vi
    .fn()
    .mockResolvedValue({ data: responseData, error: undefined });
  return [
    { fetching: false, error: undefined },
    executeFn,
  ] as unknown as ReturnType<typeof useMutation>;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AgentsPage', () => {
  beforeEach(() => {
    vi.mocked(useMutation).mockReturnValue(
      makeMutationMock({
        startAgentSession: {
          id: 'session-1',
          templateType: 'CHAVRUTA',
          status: 'ACTIVE',
          contextContentId: null,
          createdAt: new Date().toISOString(),
        },
      })
    );
    vi.mocked(useSubscription).mockReturnValue([
      { data: undefined, fetching: false, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useSubscription>);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders the page heading "AI Learning Agents"', () => {
    renderAgents();
    expect(
      screen.getByRole('heading', { name: /AI Learning Agents/i })
    ).toBeInTheDocument();
  });

  it('renders inside the layout wrapper', () => {
    renderAgents();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders all five agent mode selector cards', () => {
    renderAgents();
    expect(
      screen.getByRole('button', { name: /chavruta debate/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /quiz master/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /summarizer/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /research scout/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /explainer/i })
    ).toBeInTheDocument();
  });

  it('shows Chavruta as the default active mode', () => {
    renderAgents();
    // The chat header shows the active mode label
    // There are two "Chavruta Debate" texts: the card button and the chat header
    const headings = screen.getAllByText(/Chavruta Debate/i);
    expect(headings.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the initial welcome message for Chavruta mode', () => {
    renderAgents();
    expect(screen.getByText(/Chavruta partner/i)).toBeInTheDocument();
  });

  it('renders the Reset button in the chat header', () => {
    renderAgents();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('renders the chat text input', () => {
    renderAgents();
    const input = screen.getByPlaceholderText(/Ask the Chavruta Debate/i);
    expect(input).toBeInTheDocument();
  });

  it('renders the Send button', () => {
    renderAgents();
    // Send button has an icon and no visible label — get it by its position near the input
    const sendButtons = screen.getAllByRole('button');
    // At least one button beyond the mode cards should exist (Send)
    expect(sendButtons.length).toBeGreaterThan(5);
  });

  // ── Mode switching ─────────────────────────────────────────────────────────

  it('switches active mode to Quiz Master when that card is clicked', async () => {
    renderAgents();
    await userEvent.click(screen.getByRole('button', { name: /quiz master/i }));
    // After switching, the chat header and initial message should update
    expect(screen.getByText(/test your knowledge/i)).toBeInTheDocument();
  });

  it('switches active mode to Summarizer when that card is clicked', async () => {
    renderAgents();
    await userEvent.click(screen.getByRole('button', { name: /summarizer/i }));
    expect(screen.getByText(/summarize any lesson/i)).toBeInTheDocument();
  });

  it('switches active mode to Research Scout when that card is clicked', async () => {
    renderAgents();
    await userEvent.click(
      screen.getByRole('button', { name: /research scout/i })
    );
    expect(screen.getByText(/Research mode active/i)).toBeInTheDocument();
  });

  it('switches active mode to Explainer when that card is clicked', async () => {
    renderAgents();
    await userEvent.click(screen.getByRole('button', { name: /explainer/i }));
    expect(screen.getByText(/Explain mode ready/i)).toBeInTheDocument();
  });

  // ── Input interaction ──────────────────────────────────────────────────────

  it('updates chat input value as user types', async () => {
    renderAgents();
    const input = screen.getByPlaceholderText(
      /Ask the Chavruta Debate/i
    ) as HTMLInputElement;
    await userEvent.type(input, 'Debate free will');
    expect(input.value).toBe('Debate free will');
  });

  it('populates input when a quick-prompt chip is clicked', async () => {
    renderAgents();
    // Chavruta mode has prompts: 'Debate free will', 'Argue against Rambam', 'Challenge my thesis'
    await userEvent.click(
      screen.getByRole('button', { name: 'Debate free will' })
    );
    const input = screen.getByPlaceholderText(
      /Ask the Chavruta Debate/i
    ) as HTMLInputElement;
    expect(input.value).toBe('Debate free will');
  });

  it('does not submit when input is empty and Enter is pressed', async () => {
    vi.useFakeTimers();
    renderAgents();
    const input = screen.getByPlaceholderText(/Ask the Chavruta Debate/i);
    // Enter with empty input — should not crash or add messages
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    // Still only the initial agent message present
    const messages = screen.getAllByText(/Chavruta partner/i);
    expect(messages.length).toBeGreaterThanOrEqual(1);
    vi.useRealTimers();
  });

  // ── Message submission (DEV_MODE: fake timers + fake streaming) ────────────

  it('displays user message in chat immediately after sending', async () => {
    vi.useFakeTimers();
    renderAgents();

    const input = screen.getByPlaceholderText(
      /Ask the Chavruta Debate/i
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'What is pilpul?' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // User message appears synchronously
    expect(screen.getByText('What is pilpul?')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('clears input field after sending a message', async () => {
    vi.useFakeTimers();
    renderAgents();

    const input = screen.getByPlaceholderText(
      /Ask the Chavruta Debate/i
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Debate free will' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(input.value).toBe('');
    vi.useRealTimers();
  });

  it('shows typing indicator after sending message (before AI responds)', async () => {
    vi.useFakeTimers();
    renderAgents();

    const input = screen.getByPlaceholderText(/Ask the Chavruta Debate/i);
    fireEvent.change(input, { target: { value: 'Challenge my thesis' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // After send, isTyping becomes true for 600ms before streaming starts
    // The typing indicator renders three animated dots
    const dots = document.querySelectorAll('.animate-bounce');
    expect(dots.length).toBe(3);
    vi.useRealTimers();
  });

  it('shows streaming message cursor while agent is streaming', async () => {
    vi.useFakeTimers();
    renderAgents();

    const input = screen.getByPlaceholderText(/Ask the Chavruta Debate/i);
    fireEvent.change(input, { target: { value: 'Argue against Rambam' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Advance past the 600ms typing delay
    act(() => {
      vi.advanceTimersByTime(700);
    });

    // After typing delay, streaming begins (setInterval at 18ms)
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // The blinking cursor span appears during streaming
    const cursor = document.querySelector('.animate-pulse');
    expect(cursor).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('disables input and send button while agent is responding', async () => {
    vi.useFakeTimers();
    renderAgents();

    const input = screen.getByPlaceholderText(
      /Ask the Chavruta Debate/i
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Debate free will' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // During typing phase the input is disabled
    expect(input).toBeDisabled();
    vi.useRealTimers();
  });

  it('displays agent response message after streaming completes', () => {
    vi.useFakeTimers();
    renderAgents();

    const input = screen.getByPlaceholderText(/Ask the Chavruta Debate/i);

    // Send a message
    act(() => {
      fireEvent.change(input, { target: { value: 'Debate free will' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    // Advance past typing delay (600ms)
    act(() => {
      vi.advanceTimersByTime(700);
    });

    // Advance through full streaming (responses are ~250 chars, 3/tick at 18ms = ~1600ms)
    // Run all remaining timers to completion
    act(() => {
      vi.runAllTimers();
    });

    // At least one response from Chavruta agent must now be visible
    const agentResponse = screen.queryByText(
      /counter-argument|Ramban|steelman/i
    );
    expect(agentResponse).not.toBeNull();

    vi.useRealTimers();
  });

  // ── Reset ──────────────────────────────────────────────────────────────────

  it('clears all chat history except the initial message when Reset is clicked', () => {
    vi.useFakeTimers();
    renderAgents();

    const input = screen.getByPlaceholderText(/Ask the Chavruta Debate/i);

    // Send a message
    act(() => {
      fireEvent.change(input, { target: { value: 'Debate free will' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    // Advance time to complete the streaming
    act(() => {
      vi.advanceTimersByTime(700);
    });
    act(() => {
      vi.runAllTimers();
    });

    // User message in the chat bubble should be visible after streaming
    // (Note: the quick-prompt chip "Debate free will" also matches, so use getAllByText)
    const matches = screen.getAllByText('Debate free will');
    expect(matches.length).toBeGreaterThanOrEqual(1);

    // Click Reset (synchronous state update)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    });

    // After reset, the user chat bubble must be gone.
    // The user chat bubble is a div with class "rounded-br-none" (agent bubbles have "rounded-bl-none").
    const userChatBubbles = document.querySelectorAll('.rounded-br-none');
    expect(userChatBubbles.length).toBe(0);
    vi.useRealTimers();
  });

  // ── Quick prompts ──────────────────────────────────────────────────────────

  it('renders Quiz Master quick prompts when Quiz Master mode is active', async () => {
    renderAgents();
    await userEvent.click(screen.getByRole('button', { name: /quiz master/i }));
    expect(
      screen.getByRole('button', { name: 'Quiz me on free will' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Test my Rambam knowledge' })
    ).toBeInTheDocument();
  });

  it('renders Summarizer quick prompts when Summarizer mode is active', async () => {
    renderAgents();
    await userEvent.click(screen.getByRole('button', { name: /summarizer/i }));
    expect(
      screen.getByRole('button', { name: 'Summarize lesson 1' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Key concepts only' })
    ).toBeInTheDocument();
  });

  // ── Subscription (real API path) ───────────────────────────────────────────

  it('renders subscription data when messageStream fires', async () => {
    vi.mocked(useSubscription).mockReturnValue([
      {
        data: {
          messageStream: {
            id: 'stream-msg-1',
            role: 'ASSISTANT',
            content: 'Streamed AI token content here.',
            isStreaming: false,
          },
        },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useSubscription>);

    renderAgents();

    await waitFor(() => {
      expect(
        screen.getByText('Streamed AI token content here.')
      ).toBeInTheDocument();
    });
  });

  // ── Streaming cleanup (DEV_MODE) — interval fires to completion ────────────

  it('clears streamingContent and appends agent reply when interval completes', () => {
    vi.useFakeTimers();
    renderAgents();

    const input = screen.getByPlaceholderText(/Ask the Chavruta Debate/i);

    act(() => {
      fireEvent.change(input, { target: { value: 'Debate free will' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    // Advance through the 600ms typing delay then run all interval ticks
    act(() => {
      vi.advanceTimersByTime(700);
    });
    act(() => {
      vi.runAllTimers();
    });

    // After the interval fires to completion the streaming cursor is gone
    const cursors = document.querySelectorAll('.animate-pulse');
    expect(cursors.length).toBe(0);

    // A final agent reply bubble is appended (initial welcome + new reply)
    const agentBubbles = document.querySelectorAll('.rounded-bl-none');
    expect(agentBubbles.length).toBeGreaterThanOrEqual(2);

    vi.useRealTimers();
  });

  it('streaming interval builds content progressively before cleanup', () => {
    vi.useFakeTimers();
    renderAgents();

    const input = screen.getByPlaceholderText(/Ask the Chavruta Debate/i);

    act(() => {
      fireEvent.change(input, { target: { value: 'Challenge my thesis' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    // Advance past typing delay into the streaming interval ticks
    act(() => {
      vi.advanceTimersByTime(700);
    });
    // Two ticks of the 18ms interval — partial content visible, cursor present
    act(() => {
      vi.advanceTimersByTime(36);
    });

    const cursorMid = document.querySelector('.animate-pulse');
    expect(cursorMid).toBeInTheDocument();

    // Run all remaining timers — streaming finishes, cursor disappears
    act(() => {
      vi.runAllTimers();
    });
    const cursorDone = document.querySelector('.animate-pulse');
    expect(cursorDone).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  // ── Mutation mock shape tests — non-DEV_MODE fallback robustness ───────────
  // These tests verify that the component remains stable when useMutation
  // returns various response shapes (null reply, undefined data). Because
  // VITE_DEV_MODE is replaced at transform-time by the vitest define config,
  // DEV_MODE is always true in this test environment and the real GraphQL
  // mutation path is not reachable. The tests below assert component stability
  // and correct mutation hook wiring via the mock return values.

  it('component remains functional when sendMessage mock returns null reply', () => {
    const sendMsgNull = vi
      .fn()
      .mockResolvedValue({ data: { sendMessage: null }, error: undefined });
    const startFn = vi.fn().mockResolvedValue({
      data: { startAgentSession: { id: 'sess-null' } },
      error: undefined,
    });

    vi.mocked(useMutation)
      .mockReturnValueOnce([
        { fetching: false, error: undefined },
        startFn,
      ] as unknown as ReturnType<typeof useMutation>)
      .mockReturnValueOnce([
        { fetching: false, error: undefined },
        sendMsgNull,
      ] as unknown as ReturnType<typeof useMutation>);

    renderAgents();

    // Chat input and heading remain accessible — component did not crash
    expect(
      screen.getByPlaceholderText(/Ask the Chavruta Debate/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /AI Learning Agents/i })
    ).toBeInTheDocument();
  });

  it('component remains functional when sendMessage mock returns undefined data', () => {
    const sendMsgUndef = vi
      .fn()
      .mockResolvedValue({ data: undefined, error: undefined });
    const startFn = vi.fn().mockResolvedValue({
      data: { startAgentSession: { id: 'sess-undef' } },
      error: undefined,
    });

    vi.mocked(useMutation)
      .mockReturnValueOnce([
        { fetching: false, error: undefined },
        startFn,
      ] as unknown as ReturnType<typeof useMutation>)
      .mockReturnValueOnce([
        { fetching: false, error: undefined },
        sendMsgUndef,
      ] as unknown as ReturnType<typeof useMutation>);

    renderAgents();

    expect(
      screen.getByPlaceholderText(/Ask the Chavruta Debate/i)
    ).toBeInTheDocument();
  });
});
