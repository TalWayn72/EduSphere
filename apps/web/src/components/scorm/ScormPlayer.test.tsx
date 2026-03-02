import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

// urql sync mock
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

import { ScormPlayer } from './ScormPlayer';
import * as urql from 'urql';

const NOOP_UPDATE = vi.fn().mockResolvedValue({ data: null, error: undefined });
const NOOP_FINISH = vi.fn().mockResolvedValue({ data: null, error: undefined });

function renderPlayer(
  overrides: Partial<React.ComponentProps<typeof ScormPlayer>> = {}
) {
  return render(
    <ScormPlayer sessionId="session-1" contentItemId="item-1" {...overrides} />
  );
}

describe('ScormPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(urql.useMutation)
      .mockReturnValueOnce([
        {
          fetching: false,
          data: undefined,
          error: undefined,
          stale: false,
          operation: undefined,
        },
        NOOP_UPDATE,
      ] as unknown as ReturnType<typeof urql.useMutation>)
      .mockReturnValue([
        {
          fetching: false,
          data: undefined,
          error: undefined,
          stale: false,
          operation: undefined,
        },
        NOOP_FINISH,
      ] as unknown as ReturnType<typeof urql.useMutation>);
  });

  it('renders an iframe with data-testid="scorm-player"', () => {
    renderPlayer();
    expect(screen.getByTestId('scorm-player')).toBeInTheDocument();
  });

  it('iframe has title "SCORM Content"', () => {
    renderPlayer();
    expect(screen.getByTitle('SCORM Content')).toBeInTheDocument();
  });

  it('iframe src contains the sessionId', () => {
    renderPlayer({ sessionId: 'my-session' });
    const iframe = screen.getByTestId('scorm-player') as HTMLIFrameElement;
    expect(iframe.src).toContain('my-session');
  });

  it('iframe src contains the launch path', () => {
    renderPlayer({ sessionId: 'sess-42' });
    const iframe = screen.getByTestId('scorm-player') as HTMLIFrameElement;
    expect(iframe.src).toContain('/scorm/launch/sess-42');
  });

  it('applies default className when no className prop provided', () => {
    renderPlayer();
    const iframe = screen.getByTestId('scorm-player') as HTMLIFrameElement;
    expect(iframe.className).toBe('w-full h-full border-0');
  });

  it('applies custom className when provided', () => {
    renderPlayer({ className: 'my-custom-class' });
    const iframe = screen.getByTestId('scorm-player') as HTMLIFrameElement;
    expect(iframe.className).toBe('my-custom-class');
  });

  it('iframe has sandbox attribute with required permissions', () => {
    renderPlayer();
    const iframe = screen.getByTestId('scorm-player') as HTMLIFrameElement;
    expect(iframe.getAttribute('sandbox')).toContain('allow-scripts');
    expect(iframe.getAttribute('sandbox')).toContain('allow-same-origin');
  });

  it('adds message event listener on mount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    renderPlayer();
    expect(addSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('removes message event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderPlayer();
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('ignores SCORM messages from unknown origins', async () => {
    // updateSession should NOT be called for messages from foreign origins
    const updateSession = vi
      .fn()
      .mockResolvedValue({ data: null, error: undefined });
    vi.mocked(urql.useMutation).mockReturnValue([
      {
        fetching: false,
        data: undefined,
        error: undefined,
        stale: false,
        operation: undefined,
      },
      updateSession,
    ] as unknown as ReturnType<typeof urql.useMutation>);

    renderPlayer({ sessionId: 'sess-foreign' });

    await act(async () => {
      const event = new MessageEvent('message', {
        origin: 'https://evil.example.com',
        data: {
          type: 'SCORM_COMMIT',
          sessionId: 'sess-foreign',
          data: { 'cmi.core.score.raw': '100' },
        },
      });
      window.dispatchEvent(event);
    });

    expect(updateSession).not.toHaveBeenCalled();
  });
});
