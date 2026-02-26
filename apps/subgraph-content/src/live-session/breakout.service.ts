import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';
import { createBbbClient } from './bbb.client';

export interface CreateBreakoutRoomInput {
  roomName: string;
  capacity: number;
  assignedUserIds?: string[];
}

export interface BreakoutRoomResult {
  id: string;
  sessionId: string;
  roomName: string;
  capacity: number;
  assignedUserIds: string[];
}

@Injectable()
export class BreakoutService implements OnModuleDestroy {
  private readonly logger = new Logger(BreakoutService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async createBreakoutRooms(
    sessionId: string,
    rooms: CreateBreakoutRoomInput[],
    tenantId: string,
    instructorUserId: string
  ): Promise<BreakoutRoomResult[]> {
    const inserted = await withTenantContext(
      this.db,
      { tenantId, userId: instructorUserId, userRole: 'INSTRUCTOR' },
      async (tx) => {
        const values = rooms.map((r, i) => ({
          sessionId,
          tenantId,
          roomName: r.roomName,
          capacity: r.capacity,
          assignedUserIds: r.assignedUserIds ?? [],
          bbbBreakoutId: `${sessionId}-br-${i + 1}`,
        }));
        return tx.insert(schema.breakoutRooms).values(values).returning();
      }
    );

    this.logger.log(
      `Created ${inserted.length} breakout rooms for session=${sessionId}`
    );

    // Attempt BBB API call (non-fatal if BBB not configured)
    const [session] = await this.db
      .select()
      .from(schema.liveSessions)
      .where(
        and(
          eq(schema.liveSessions.id, sessionId),
          eq(schema.liveSessions.tenantId, tenantId)
        )
      )
      .limit(1);

    if (session) {
      const bbb = createBbbClient();
      if (bbb) {
        try {
          await bbb.sendBreakoutRooms(
            session.bbbMeetingId,
            rooms.map((r, i) => ({
              name: r.roomName,
              sequence: i + 1,
              durationMinutes: 30,
            }))
          );
        } catch (err) {
          this.logger.warn(`BBB sendBreakoutRooms failed (non-fatal): ${err}`);
        }
      }
    } else {
      throw new NotFoundException(`LiveSession ${sessionId} not found`);
    }

    return inserted.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      roomName: r.roomName,
      capacity: r.capacity,
      assignedUserIds: r.assignedUserIds as string[],
    }));
  }

  async assignUsersToRoom(
    roomId: string,
    userIds: string[],
    tenantId: string,
    callerUserId: string
  ): Promise<void> {
    await withTenantContext(
      this.db,
      { tenantId, userId: callerUserId, userRole: 'INSTRUCTOR' },
      async (tx) => {
        await tx
          .update(schema.breakoutRooms)
          .set({ assignedUserIds: userIds })
          .where(
            and(
              eq(schema.breakoutRooms.id, roomId),
              eq(schema.breakoutRooms.tenantId, tenantId)
            )
          );
      }
    );
    this.logger.log(`Assigned ${userIds.length} users to room=${roomId}`);
  }

  async listRooms(
    sessionId: string,
    tenantId: string,
    callerUserId: string
  ): Promise<BreakoutRoomResult[]> {
    const rows = await withTenantContext(
      this.db,
      { tenantId, userId: callerUserId, userRole: 'STUDENT' },
      async (tx) =>
        tx
          .select()
          .from(schema.breakoutRooms)
          .where(
            and(
              eq(schema.breakoutRooms.sessionId, sessionId),
              eq(schema.breakoutRooms.tenantId, tenantId)
            )
          )
    );

    return rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      roomName: r.roomName,
      capacity: r.capacity,
      assignedUserIds: r.assignedUserIds as string[],
    }));
  }
}
