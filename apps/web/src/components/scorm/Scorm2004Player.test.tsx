import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

vi.mock('@/lib/scorm/scorm2004-data-model', () => ({
  createDefaultCmiModel: (learnerId: string, learnerName: string) => ({
    'cmi.completion_status': 'not attempted',
    'cmi.success_status': 'unknown',
    'cmi.score.scaled': null,
    'cmi.score.raw': null,
    'cmi.score.min': 0,
    'cmi.score.max': 100,
    'cmi.progress_measure': null,
    'cmi.session_time': 'PT0S',
    'cmi.total_time': 'PT0S',
    'cmi.suspend_data': '',
    'cmi.location': '',
    'cmi.learner_id': learnerId,
    'cmi.learner_name': learnerName,
    'cmi.entry': 'ab-initio',
    'cmi.exit': '',
    'cmi.mode': 'normal',
  }),
  SCORM2004_ERROR_CODES: {
    NO_ERROR: '0',
    GENERAL_EXCEPTION: '101',
    DATA_MODEL_ELEMENT_NOT_IMPLEMENTED: '401',
    DATA_MODEL_ELEMENT_NOT_SUPPORTED: '402',
    DATA_MODEL_ELEMENT_VALUE_NOT_INITIALIZED: '403',
    DATA_MODEL_INVALID_VALUE: '406',
    DATA_MODEL_DEPENDENCY_NOT_ESTABLISHED: '407',
  },
}));

import { Scorm2004Player } from './Scorm2004Player';

function dispatchScormMessage(
  action: string,
  extra: Record<string, unknown> = {},
): ReturnType<typeof vi.fn> {
  const postMessageMock = vi.fn();
  const event = new MessageEvent('message', {
    data: { action, ...extra },
    source: { postMessage: postMessageMock } as unknown as Window,
  });
  window.dispatchEvent(event);
  return postMessageMock;
}

describe('Scorm2004Player', () => {
  const defaultProps = {
    packageUrl: 'https://example.com/scorm2004/index.html',
    learnerId: 'learner-1',
    learnerName: 'Test Learner',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an iframe with data-testid="scorm2004-player"', () => {
    render(<Scorm2004Player {...defaultProps} />);
    expect(screen.getByTestId('scorm2004-player')).toBeInTheDocument();
  });

  it('iframe src is the packageUrl prop', () => {
    render(<Scorm2004Player {...defaultProps} />);
    const iframe = screen.getByTestId('scorm2004-player') as HTMLIFrameElement;
    expect(iframe.src).toBe(defaultProps.packageUrl);
  });

  it('iframe has title "SCORM 2004 Content"', () => {
    render(<Scorm2004Player {...defaultProps} />);
    expect(screen.getByTitle('SCORM 2004 Content')).toBeInTheDocument();
  });

  it('applies default className when no className prop', () => {
    render(<Scorm2004Player {...defaultProps} />);
    const iframe = screen.getByTestId('scorm2004-player') as HTMLIFrameElement;
    expect(iframe.className).toBe('w-full h-full min-h-[600px] border-0');
  });

  it('applies custom className when provided', () => {
    render(<Scorm2004Player {...defaultProps} className="custom" />);
    const iframe = screen.getByTestId('scorm2004-player') as HTMLIFrameElement;
    expect(iframe.className).toBe('custom');
  });

  it('iframe has sandbox with required permissions', () => {
    render(<Scorm2004Player {...defaultProps} />);
    const iframe = screen.getByTestId('scorm2004-player') as HTMLIFrameElement;
    const sandbox = iframe.getAttribute('sandbox') ?? '';
    expect(sandbox).toContain('allow-scripts');
    expect(sandbox).toContain('allow-same-origin');
  });

  it('adds message event listener on mount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    render(<Scorm2004Player {...defaultProps} />);
    expect(addSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('removes message event listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<Scorm2004Player {...defaultProps} />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('Initialize action replies "true"', async () => {
    render(<Scorm2004Player {...defaultProps} />);
    let reply: ReturnType<typeof vi.fn>;
    await act(async () => {
      reply = dispatchScormMessage('Initialize');
    });
    expect(reply!).toHaveBeenCalledWith(
      { action: 'InitializeResult', result: 'true' },
      { targetOrigin: '*' },
    );
  });

  it('SetValue sets CMI value and calls onProgress', async () => {
    const onProgress = vi.fn();
    render(<Scorm2004Player {...defaultProps} onProgress={onProgress} />);

    // First initialize
    await act(async () => {
      dispatchScormMessage('Initialize');
    });

    let reply: ReturnType<typeof vi.fn>;
    await act(async () => {
      reply = dispatchScormMessage('SetValue', {
        element: 'cmi.location',
        value: 'page-5',
      });
    });

    expect(reply!).toHaveBeenCalledWith(
      { action: 'SetValueResult', result: 'true' },
      { targetOrigin: '*' },
    );
    expect(onProgress).toHaveBeenCalledWith({ 'cmi.location': 'page-5' });
  });

  it('SetValue with completion_status="completed" calls onComplete', async () => {
    const onComplete = vi.fn();
    render(<Scorm2004Player {...defaultProps} onComplete={onComplete} />);

    await act(async () => {
      dispatchScormMessage('Initialize');
    });

    await act(async () => {
      dispatchScormMessage('SetValue', {
        element: 'cmi.completion_status',
        value: 'completed',
      });
    });

    expect(onComplete).toHaveBeenCalledWith('completed');
  });

  it('SetValue before Initialize replies "false"', async () => {
    render(<Scorm2004Player {...defaultProps} />);

    let reply: ReturnType<typeof vi.fn>;
    await act(async () => {
      reply = dispatchScormMessage('SetValue', {
        element: 'cmi.location',
        value: 'page-1',
      });
    });

    expect(reply!).toHaveBeenCalledWith(
      { action: 'SetValueResult', result: 'false' },
      { targetOrigin: '*' },
    );
  });

  it('SetValue for unknown element replies "false"', async () => {
    render(<Scorm2004Player {...defaultProps} />);

    await act(async () => {
      dispatchScormMessage('Initialize');
    });

    let reply: ReturnType<typeof vi.fn>;
    await act(async () => {
      reply = dispatchScormMessage('SetValue', {
        element: 'cmi.nonexistent.field',
        value: 'test',
      });
    });

    expect(reply!).toHaveBeenCalledWith(
      { action: 'SetValueResult', result: 'false' },
      { targetOrigin: '*' },
    );
  });

  it('GetValue returns stored CMI value', async () => {
    render(<Scorm2004Player {...defaultProps} />);

    let reply: ReturnType<typeof vi.fn>;
    await act(async () => {
      reply = dispatchScormMessage('GetValue', {
        element: 'cmi.learner_id',
      });
    });

    expect(reply!).toHaveBeenCalledWith(
      { action: 'GetValueResult', result: 'learner-1' },
      { targetOrigin: '*' },
    );
  });

  it('GetValue for unknown element returns ""', async () => {
    render(<Scorm2004Player {...defaultProps} />);

    let reply: ReturnType<typeof vi.fn>;
    await act(async () => {
      reply = dispatchScormMessage('GetValue', {
        element: 'cmi.unknown',
      });
    });

    expect(reply!).toHaveBeenCalledWith(
      { action: 'GetValueResult', result: '' },
      { targetOrigin: '*' },
    );
  });

  it('Commit action replies "true"', async () => {
    render(<Scorm2004Player {...defaultProps} />);

    let reply: ReturnType<typeof vi.fn>;
    await act(async () => {
      reply = dispatchScormMessage('Commit');
    });

    expect(reply!).toHaveBeenCalledWith(
      { action: 'CommitResult', result: 'true' },
      { targetOrigin: '*' },
    );
  });

  it('Terminate action replies "true"', async () => {
    render(<Scorm2004Player {...defaultProps} />);

    await act(async () => {
      dispatchScormMessage('Initialize');
    });

    let reply: ReturnType<typeof vi.fn>;
    await act(async () => {
      reply = dispatchScormMessage('Terminate');
    });

    expect(reply!).toHaveBeenCalledWith(
      { action: 'TerminateResult', result: 'true' },
      { targetOrigin: '*' },
    );
  });

  it('ignores messages without action property', async () => {
    const onProgress = vi.fn();
    render(<Scorm2004Player {...defaultProps} onProgress={onProgress} />);

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { element: 'cmi.location', value: 'page-1' },
        }),
      );
    });

    expect(onProgress).not.toHaveBeenCalled();
  });

  it('ignores non-object messages', async () => {
    const onProgress = vi.fn();
    render(<Scorm2004Player {...defaultProps} onProgress={onProgress} />);

    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', { data: 'string' }));
      window.dispatchEvent(new MessageEvent('message', { data: null }));
      window.dispatchEvent(new MessageEvent('message', { data: 42 }));
    });

    expect(onProgress).not.toHaveBeenCalled();
  });

  it('SetValue without element replies "false"', async () => {
    render(<Scorm2004Player {...defaultProps} />);

    await act(async () => {
      dispatchScormMessage('Initialize');
    });

    let reply: ReturnType<typeof vi.fn>;
    await act(async () => {
      reply = dispatchScormMessage('SetValue', { value: 'test' });
    });

    expect(reply!).toHaveBeenCalledWith(
      { action: 'SetValueResult', result: 'false' },
      { targetOrigin: '*' },
    );
  });

  it('GetValue without element returns ""', async () => {
    render(<Scorm2004Player {...defaultProps} />);

    let reply: ReturnType<typeof vi.fn>;
    await act(async () => {
      reply = dispatchScormMessage('GetValue');
    });

    expect(reply!).toHaveBeenCalledWith(
      { action: 'GetValueResult', result: '' },
      { targetOrigin: '*' },
    );
  });

  it('onComplete with passed success_status returns "passed"', async () => {
    const onComplete = vi.fn();
    render(<Scorm2004Player {...defaultProps} onComplete={onComplete} />);

    await act(async () => {
      dispatchScormMessage('Initialize');
    });

    // Set success_status to passed first
    await act(async () => {
      dispatchScormMessage('SetValue', {
        element: 'cmi.success_status',
        value: 'passed',
      });
    });

    // Then set completion_status to completed
    await act(async () => {
      dispatchScormMessage('SetValue', {
        element: 'cmi.completion_status',
        value: 'completed',
      });
    });

    expect(onComplete).toHaveBeenCalledWith('passed');
  });

  it('onComplete with failed success_status returns "failed"', async () => {
    const onComplete = vi.fn();
    render(<Scorm2004Player {...defaultProps} onComplete={onComplete} />);

    await act(async () => {
      dispatchScormMessage('Initialize');
    });

    await act(async () => {
      dispatchScormMessage('SetValue', {
        element: 'cmi.success_status',
        value: 'failed',
      });
    });

    await act(async () => {
      dispatchScormMessage('SetValue', {
        element: 'cmi.completion_status',
        value: 'completed',
      });
    });

    expect(onComplete).toHaveBeenCalledWith('failed');
  });
});
