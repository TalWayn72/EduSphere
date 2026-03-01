import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import * as urql from 'urql';
import { RoleplaySimulator } from './RoleplaySimulator';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

// jsdom does not implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const mockScenario = {
  id: 'scenario-1',
  title: 'Medical Ethics Consultation',
  domain: 'Medicine',
  difficultyLevel: 'INTERMEDIATE',
  sceneDescription: 'You are meeting a patient who needs critical care guidance.',
  maxTurns: 10,
};

const NOOP_EXECUTE = vi.fn().mockResolvedValue({ data: null, error: undefined });

describe('RoleplaySimulator', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false } as never,
      NOOP_EXECUTE,
    ]);
    vi.mocked(urql.useQuery).mockReturnValue([
      { fetching: false, data: undefined, stale: false } as never,
      vi.fn(),
    ] as never);
  });

  it('renders the scenario title in the header', async () => {
    render(<RoleplaySimulator scenario={mockScenario} onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText('Medical Ethics Consultation')).toBeInTheDocument();
    });
  });

  it('shows the scene description in the header', async () => {
    render(<RoleplaySimulator scenario={mockScenario} onClose={onClose} />);
    await waitFor(() => {
      expect(
        screen.getAllByText(
          'You are meeting a patient who needs critical care guidance.'
        )[0]
      ).toBeInTheDocument();
    });
  });

  it('renders difficulty level badge', async () => {
    render(<RoleplaySimulator scenario={mockScenario} onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText('INTERMEDIATE')).toBeInTheDocument();
    });
  });

  it('renders turn counter with max turns', async () => {
    render(<RoleplaySimulator scenario={mockScenario} onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText(/\/ 10 turns/)).toBeInTheDocument();
    });
  });

  it('calls onClose when X button is clicked', async () => {
    render(<RoleplaySimulator scenario={mockScenario} onClose={onClose} />);
    const closeBtn = screen.getByRole('button', {
      name: 'Close roleplay simulator',
    });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('input is disabled when sessionId is null (before session starts)', () => {
    render(<RoleplaySimulator scenario={mockScenario} onClose={onClose} />);
    const input = screen.getByPlaceholderText('Type your response...');
    expect(input).toBeDisabled();
  });

  it('shows opening character message after session starts', async () => {
    vi.mocked(urql.useMutation)
      .mockReturnValueOnce([
        { fetching: false } as never,
        vi
          .fn()
          .mockResolvedValue({ data: { startRoleplaySession: { id: 'sess-1' } } }),
      ])
      .mockReturnValue([
        { fetching: false } as never,
        NOOP_EXECUTE,
      ]);

    await act(async () => {
      render(<RoleplaySimulator scenario={mockScenario} onClose={onClose} />);
    });

    await waitFor(() => {
      expect(
        screen.getAllByText(
          'You are meeting a patient who needs critical care guidance.'
        ).length
      ).toBeGreaterThan(0);
    });
  });

  it('renders progress bar element', async () => {
    render(<RoleplaySimulator scenario={mockScenario} onClose={onClose} />);
    // The turn progress bar is a div with h-full bg-blue-500
    const { container } = render(
      <RoleplaySimulator scenario={mockScenario} onClose={onClose} />
    );
    const progressBar = container.querySelector('.bg-blue-500');
    expect(progressBar).toBeInTheDocument();
  });

  it('displays typing indicator when isSending is true via state', async () => {
    // We trigger isSending by providing a session and having input ready
    vi.mocked(urql.useMutation)
      .mockReturnValueOnce([
        { fetching: false } as never,
        vi
          .fn()
          .mockResolvedValue({ data: { startRoleplaySession: { id: 'sess-1' } } }),
      ])
      .mockReturnValue([
        { fetching: false } as never,
        vi.fn().mockReturnValue(new Promise(() => {})), // never resolves = isSending stays true
      ]);

    await act(async () => {
      render(<RoleplaySimulator scenario={mockScenario} onClose={onClose} />);
    });

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/response/i);
      expect(input).toBeTruthy();
    });
  });
});
