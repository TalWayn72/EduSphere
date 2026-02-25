/**
 * BreakoutRoomPanel — instructor-only panel for creating and managing BBB breakout rooms.
 */
import { useState } from 'react';
import { useMutation, useQuery } from 'urql';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Plus, Send } from 'lucide-react';
import {
  BREAKOUT_ROOMS_QUERY,
  CREATE_BREAKOUT_ROOMS_MUTATION,
} from '@/lib/graphql/live-session.queries';

interface BreakoutRoomData {
  id: string;
  sessionId: string;
  roomName: string;
  capacity: number;
  assignedUserIds: string[];
}

interface RoomFormEntry {
  roomName: string;
  capacity: number;
  assignedUserIds: string[];
}

interface BreakoutRoomPanelProps {
  sessionId: string;
}

function RoomRow({ room }: { room: BreakoutRoomData }) {
  return (
    <div className="flex items-center justify-between border rounded p-2 text-sm">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{room.roomName}</span>
        <span className="text-muted-foreground text-xs">
          {room.assignedUserIds.length}/{room.capacity} participants
        </span>
      </div>
      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
        <Send className="h-3 w-3" />
        Send to Room
      </Button>
    </div>
  );
}

export function BreakoutRoomPanel({ sessionId }: BreakoutRoomPanelProps) {
  const [rooms, setRooms] = useState<RoomFormEntry[]>([
    { roomName: '', capacity: 10, assignedUserIds: [] },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [{ data: roomsData }, refetchRooms] = useQuery({
    query: BREAKOUT_ROOMS_QUERY,
    variables: { sessionId },
  });

  const [, createRooms] = useMutation(CREATE_BREAKOUT_ROOMS_MUTATION);

  const existingRooms: BreakoutRoomData[] =
    (roomsData as { breakoutRooms?: BreakoutRoomData[] } | undefined)?.breakoutRooms ?? [];

  const addRoom = () => {
    setRooms([...rooms, { roomName: '', capacity: 10, assignedUserIds: [] }]);
  };

  const updateRoom = (idx: number, field: keyof RoomFormEntry, value: string | number) => {
    const next = [...rooms];
    next[idx] = { ...next[idx], [field]: value } as RoomFormEntry;
    setRooms(next);
  };

  const handleCreate = async () => {
    const valid = rooms.filter((r) => r.roomName.trim().length > 0);
    if (valid.length === 0) { setError('Enter at least one room name.'); return; }
    setError(null);
    setCreating(true);
    try {
      const result = await createRooms({
        sessionId,
        rooms: valid.map((r) => ({
          roomName: r.roomName.trim(),
          capacity: r.capacity,
          assignedUserIds: r.assignedUserIds,
        })),
      });
      if (result.error) { setError(result.error.message); return; }
      setRooms([{ roomName: '', capacity: 10, assignedUserIds: [] }]);
      refetchRooms({ requestPolicy: 'network-only' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4" />
          Breakout Rooms
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create Form */}
        <div className="border rounded p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">New Rooms</p>
          {rooms.map((room, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                placeholder={`Room ${i + 1} name`}
                value={room.roomName}
                onChange={(e) => updateRoom(i, 'roomName', e.target.value)}
                className="text-sm flex-1"
              />
              <Input
                type="number"
                min={2}
                max={50}
                value={room.capacity}
                onChange={(e) => updateRoom(i, 'capacity', Number(e.target.value))}
                className="text-sm w-20"
                aria-label="Capacity"
              />
            </div>
          ))}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addRoom} className="gap-1">
              <Plus className="h-3 w-3" /> Add Room
            </Button>
            <Button size="sm" onClick={() => void handleCreate()} disabled={creating}>
              {creating ? 'Creating...' : 'Create Rooms'}
            </Button>
          </div>
        </div>

        {/* Existing Rooms */}
        {existingRooms.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Active Rooms</p>
            {existingRooms.map((room) => (
              <RoomRow key={room.id} room={room} />
            ))}
          </div>
        )}

        {existingRooms.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No breakout rooms created yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
