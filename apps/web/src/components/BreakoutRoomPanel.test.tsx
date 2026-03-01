import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as urql from 'urql';
import { BreakoutRoomPanel } from './BreakoutRoomPanel';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/live-session.queries', () => ({
  BREAKOUT_ROOMS_QUERY: 'BREAKOUT_ROOMS_QUERY',
  CREATE_BREAKOUT_ROOMS_MUTATION: 'CREATE_BREAKOUT_ROOMS_MUTATION',
}));

const mockCreateRooms = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(urql.useQuery).mockReturnValue([
    { data: undefined, fetching: false, error: undefined },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([
    {} as never,
    mockCreateRooms as never,
  ]);
  mockCreateRooms.mockResolvedValue({ error: undefined });
});

describe('BreakoutRoomPanel', () => {
  it('renders the Breakout Rooms heading', () => {
    render(<BreakoutRoomPanel sessionId="s1" />);
    expect(screen.getByText('Breakout Rooms')).toBeInTheDocument();
  });

  it('renders the "Add Room" and "Create Rooms" buttons', () => {
    render(<BreakoutRoomPanel sessionId="s1" />);
    expect(
      screen.getByRole('button', { name: /add room/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create rooms/i })
    ).toBeInTheDocument();
  });

  it('renders one room name input by default', () => {
    render(<BreakoutRoomPanel sessionId="s1" />);
    expect(screen.getByPlaceholderText('Room 1 name')).toBeInTheDocument();
  });

  it('adds a second room row when "Add Room" is clicked', () => {
    render(<BreakoutRoomPanel sessionId="s1" />);
    fireEvent.click(screen.getByRole('button', { name: /add room/i }));
    expect(screen.getByPlaceholderText('Room 2 name')).toBeInTheDocument();
  });

  it('shows validation error when creating with empty room name', async () => {
    render(<BreakoutRoomPanel sessionId="s1" />);
    fireEvent.click(screen.getByRole('button', { name: /create rooms/i }));
    expect(
      await screen.findByText(/enter at least one room name/i)
    ).toBeInTheDocument();
  });

  it('does not call mutation when room name is empty', () => {
    render(<BreakoutRoomPanel sessionId="s1" />);
    fireEvent.click(screen.getByRole('button', { name: /create rooms/i }));
    expect(mockCreateRooms).not.toHaveBeenCalled();
  });

  it('calls createRooms mutation with trimmed room name', async () => {
    render(<BreakoutRoomPanel sessionId="s1" />);
    fireEvent.change(screen.getByPlaceholderText('Room 1 name'), {
      target: { value: 'Alpha Group' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create rooms/i }));
    await vi.waitFor(() =>
      expect(mockCreateRooms).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 's1',
          rooms: [
            { roomName: 'Alpha Group', capacity: 10, assignedUserIds: [] },
          ],
        })
      )
    );
  });

  it('shows "No breakout rooms created yet" when no existing rooms', () => {
    render(<BreakoutRoomPanel sessionId="s1" />);
    expect(
      screen.getByText(/no breakout rooms created yet/i)
    ).toBeInTheDocument();
  });

  it('renders existing rooms when data is present', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: {
          breakoutRooms: [
            {
              id: 'r1',
              sessionId: 's1',
              roomName: 'Group A',
              capacity: 10,
              assignedUserIds: [],
            },
          ],
        },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    render(<BreakoutRoomPanel sessionId="s1" />);
    expect(screen.getByText('Group A')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /send to room/i })
    ).toBeInTheDocument();
  });

  it('shows mutation error message when createRooms returns an error', async () => {
    mockCreateRooms.mockResolvedValueOnce({ error: { message: 'Server error' } });
    render(<BreakoutRoomPanel sessionId="s1" />);
    fireEvent.change(screen.getByPlaceholderText('Room 1 name'), {
      target: { value: 'Beta Group' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create rooms/i }));
    expect(await screen.findByText('Server error')).toBeInTheDocument();
  });
});
