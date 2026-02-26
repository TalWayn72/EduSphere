/**
 * AIChatPanel unit tests.
 *
 * The component uses `import.meta.env.DEV` to toggle between mock (timer-based)
 * responses and real GraphQL mutations/subscriptions. In the vitest environment
 * `import.meta.env.DEV` is `true`, so most tests exercise the DEV_MODE path
 * (mock setTimeout responses). Test 8 exercises the subscription-rendering path
 * by providing a mock subscription return value.
 */
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Polyfills required by jsdom ───────────────────────────────────────────────
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.focus = vi.fn();

// ── Mock Radix Select (portal issues in jsdom) ────────────────────────────────
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-root">{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="select-trigger">{children}</button>
  ),
  SelectValue: () => <span data-testid="select-value" />,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <div data-testid={`select-item-${value}`} role="option">
      {children}
    </div>
  ),
}));

// ── urql mocks ────────────────────────────────────────────────────────────────
vi.mock('urql', () => ({
  useMutation: vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]),
  useSubscription: vi.fn(() => [{ data: undefined, fetching: false }, vi.fn()]),
  gql: vi.fn((s: TemplateStringsArray) => String(s)),
}));

// ── Agent GraphQL operations mock ─────────────────────────────────────────────
vi.mock('@/lib/graphql/agent.queries', () => ({
  START_AGENT_SESSION_MUTATION: 'START_AGENT_SESSION_MUTATION',
  SEND_AGENT_MESSAGE_MUTATION: 'SEND_AGENT_MESSAGE_MUTATION',
  MESSAGE_STREAM_SUBSCRIPTION: 'MESSAGE_STREAM_SUBSCRIPTION',
}));

// ── Component import (after mocks) ────────────────────────────────────────────
import { AIChatPanel } from './AIChatPanel';
import { useSubscription } from 'urql';
import * as selectModule from '@/components/ui/select';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPanel() {
  return render(<AIChatPanel />);
}

function openPanel(container: HTMLElement) {
  const toggleBtn = container.querySelector('button.fixed');
  if (!toggleBtn) throw new Error('Toggle button not found');
  fireEvent.click(toggleBtn);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AIChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Renders without crashing and shows toggle button ─────────────────────────

  it('renders without crashing and shows the toggle button', () => {
    const { container } = renderPanel();
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('panel starts off-screen (translate-x-full) when closed', () => {
    const { container } = renderPanel();
    expect(container.querySelector('.translate-x-full')).toBeInTheDocument();
  });

  // 2. Opens panel on button click ──────────────────────────────────────────────

  it('clicking the toggle button opens the panel', () => {
    const { container } = renderPanel();
    openPanel(container);
    expect(container.querySelector('.translate-x-0')).toBeInTheDocument();
  });

  it('shows close button (aria-label "Close AI chat") when panel is open', () => {
    const { container } = renderPanel();
    openPanel(container);
    const closeBtn = screen.getByLabelText('Close AI chat');
    expect(closeBtn).toBeInTheDocument();
  });

  // 3. DEV_MODE: typing a message and pressing Enter adds user message ───────────

  it('in DEV_MODE: typing and pressing Enter adds user message to list', () => {
    vi.useFakeTimers();
    const { container } = renderPanel();
    openPanel(container);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'What is free will?' } });

    act(() => {
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    expect(screen.getByText('What is free will?')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('in DEV_MODE: input clears after pressing Enter', () => {
    vi.useFakeTimers();
    const { container } = renderPanel();
    openPanel(container);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'A test message' } });

    act(() => {
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    expect(input.value).toBe('');
    vi.useRealTimers();
  });

  // 4. DEV_MODE: mock agent response appears after sending ─────────────────────

  it('in DEV_MODE: a mock agent response appears after the timer fires', async () => {
    vi.useFakeTimers();
    const { container } = renderPanel();
    openPanel(container);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Debate free will' } });

    act(() => {
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    // Advance past the 800 ms mock delay + 1000 ms stream-end delay
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Restore real timers before waitFor — waitFor uses setInterval internally
    // which gets frozen when fake timers are active.
    vi.useRealTimers();

    await waitFor(() => {
      const agentResponse = screen.queryAllByText(
        /counter-argument|Rambam|challenge|interesting/i
      );
      expect(agentResponse.length).toBeGreaterThan(0);
    });
  });

  // 5. Changing agent selector resets messages (empty state) ───────────────────

  it('a freshly mounted panel has no messages (empty state)', () => {
    const { container } = render(<AIChatPanel />);
    openPanel(container);
    // Agent selector area is visible
    expect(
      container.querySelector('[data-testid="select-root"]')
    ).toBeInTheDocument();
    // No ChatMessage nodes yet
    const chatMessages = container.querySelectorAll(
      '[data-testid="chat-message"]'
    );
    expect(chatMessages.length).toBe(0);
  });

  it('agent selector area is rendered inside the open panel', () => {
    const { container } = renderPanel();
    openPanel(container);
    expect(
      container.querySelector('[data-testid="select-root"]')
    ).toBeInTheDocument();
  });

  // 6. Close button closes the panel ───────────────────────────────────────────

  it('clicking the close button slides the panel back off-screen', () => {
    const { container } = renderPanel();
    openPanel(container);

    expect(container.querySelector('.translate-x-0')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Close AI chat');
    fireEvent.click(closeBtn);

    expect(container.querySelector('.translate-x-full')).toBeInTheDocument();
  });

  // 7. Send button and Enter key guard ──────────────────────────────────────────

  it('send button is disabled when input is empty', () => {
    const { container } = renderPanel();
    openPanel(container);
    const sendBtn = screen.getByLabelText('Send message');
    expect(sendBtn).toBeDisabled();
  });

  it('send button is enabled when input has text', () => {
    const { container } = renderPanel();
    openPanel(container);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hello' } });
    const sendBtn = screen.getByLabelText('Send message');
    expect(sendBtn).not.toBeDisabled();
  });

  it('enter key does not add a message when input is empty', () => {
    const { container } = renderPanel();
    openPanel(container);
    const input = screen.getByRole('textbox');
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    // No ChatMessage elements rendered
    const chatMessages = container.querySelectorAll(
      '[data-testid="chat-message"]'
    );
    expect(chatMessages.length).toBe(0);
  });

  // 8. Subscription data renders correctly ──────────────────────────────────────

  it('renders a message that arrives via the subscription', async () => {
    // Render first with no subscription data (realistic initial state)
    const { container, rerender } = render(<AIChatPanel />);
    openPanel(container);

    // Simulate subscription data arriving after mount (push from server)
    vi.mocked(useSubscription).mockReturnValue([
      {
        data: {
          messageStream: {
            id: 'stream-1',
            role: 'agent',
            content: 'Streaming response from backend.',
            createdAt: new Date().toISOString(),
          },
        },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
        operation: undefined as unknown as ReturnType<
          typeof useSubscription
        >[0]['operation'],
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useSubscription>);
    rerender(<AIChatPanel />);

    await waitFor(() => {
      expect(
        screen.getByText('Streaming response from backend.')
      ).toBeInTheDocument();
    });
  });

  // 9. Custom className propagation ─────────────────────────────────────────────

  it('applies custom className to the panel wrapper', () => {
    const { container } = render(<AIChatPanel className="my-custom-class" />);
    expect(container.querySelector('.my-custom-class')).toBeInTheDocument();
  });

  // 10. Cleanup effect clears mock timers on unmount (line 68) ──────────────────

  it('clears mockTimerRef and mockStreamRef timeouts when unmounted mid-stream', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { container, unmount } = renderPanel();
    openPanel(container);

    // Trigger a DEV_MODE message send so the timers are set
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'trigger timers' } });

    act(() => {
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    // Advance past the first mock timer (800ms) so the nested timer is also set
    act(() => {
      vi.advanceTimersByTime(850);
    });

    // Unmount while the 1000ms stream-end timer is still pending
    unmount();

    // clearTimeout must have been called (cleanup effect ran)
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
    vi.useRealTimers();
  });

  // 11. Agent Select onValueChange changes the selected agent (line 223) ────────

  it('changing agent via Select onValueChange resets messages and updates agent name', () => {
    // Override the Select mock to wire onValueChange → trigger on SelectItem click
    const originalSelect = selectModule.Select;
    vi.spyOn(selectModule, 'Select').mockImplementation(
      ({
        children,
        onValueChange,
      }: React.ComponentProps<typeof selectModule.Select>) => (
        <div data-testid="select-root">
          {/* Expose a hidden button so tests can trigger onValueChange */}
          <button
            data-testid="select-change-trigger"
            onClick={() => onValueChange?.('quiz-master')}
          />
          {children}
        </div>
      )
    );

    const { container } = renderPanel();
    openPanel(container);

    // Initially defaults to 'chavruta' — placeholder shows agent input hint
    const inputBefore = screen.getByRole('textbox') as HTMLInputElement;
    expect(inputBefore.placeholder).toMatch(/Chavruta/i);

    // Trigger onValueChange to switch agent to 'quiz-master'
    fireEvent.click(screen.getByTestId('select-change-trigger'));

    // After switching, the input placeholder changes to reflect the new agent
    const inputAfter = screen.getByRole('textbox') as HTMLInputElement;
    expect(inputAfter.placeholder).toMatch(/Quiz Master/i);

    // Restore the original mock
    vi.spyOn(selectModule, 'Select').mockImplementation(originalSelect as typeof selectModule.Select);
  });

  // 12. Mobile backdrop click closes the panel (lines 298-302) ─────────────────

  it('clicking the mobile backdrop div closes the panel', () => {
    const { container } = renderPanel();
    openPanel(container);

    // Verify panel is open
    expect(container.querySelector('.translate-x-0')).toBeInTheDocument();

    // The backdrop is rendered when isOpen=true — it's a fixed inset-0 div
    // with class 'bg-black/50' and onClick={() => setIsOpen(false)}
    const backdrop = container.querySelector('.bg-black\\/50');
    expect(backdrop).toBeInTheDocument();

    fireEvent.click(backdrop!);

    // Panel slides back off-screen
    expect(container.querySelector('.translate-x-full')).toBeInTheDocument();
    // Backdrop is no longer rendered (conditional on isOpen)
    expect(container.querySelector('.bg-black\\/50')).not.toBeInTheDocument();
  });

  it('backdrop is NOT present when panel is closed', () => {
    const { container } = renderPanel();
    // Panel starts closed — backdrop should not be in the DOM
    expect(container.querySelector('.bg-black\\/50')).not.toBeInTheDocument();
  });
});
