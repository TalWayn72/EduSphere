/**
 * LiveKitClient — Server-side client for LiveKit room and token management.
 *
 * Uses livekit-server-sdk to create rooms, generate access tokens,
 * delete rooms, and list participants.
 *
 * Gracefully degrades when LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET
 * are not set (dev / BBB-only environments).
 */
import { Logger } from '@nestjs/common';

const logger = new Logger('LiveKitClient');

export interface LiveKitParticipant {
  identity: string;
  name?: string;
  joinedAt?: number;
}

export interface LiveKitTokenOptions {
  userId: string;
  roomName: string;
  isPublisher: boolean;
  displayName?: string;
}

/**
 * Thin wrapper around livekit-server-sdk.
 * Import is lazy to avoid hard dependency when SDK is not installed.
 */
export class LiveKitClient {
  private readonly serverUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(serverUrl: string, apiKey: string, apiSecret: string) {
    this.serverUrl = serverUrl;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  async createRoom(roomName: string): Promise<string> {
    try {
      // Dynamic import to allow graceful degradation when package is absent
      const { RoomServiceClient } = await import('livekit-server-sdk');
      const roomService = new RoomServiceClient(
        this.serverUrl,
        this.apiKey,
        this.apiSecret
      );
      const room = await roomService.createRoom({ name: roomName });
      logger.log(`LiveKit room created: ${roomName}`);
      return room.sid ?? roomName;
    } catch (err) {
      logger.warn(`LiveKit createRoom failed: ${String(err)}`);
      return roomName;
    }
  }

  async generateToken(opts: LiveKitTokenOptions): Promise<string> {
    try {
      const { AccessToken, VideoGrant } = await import('livekit-server-sdk');
      const at = new AccessToken(this.apiKey, this.apiSecret, {
        identity: opts.userId,
        name: opts.displayName ?? opts.userId,
      });

      const grant = new VideoGrant({
        room: opts.roomName,
        roomJoin: true,
        canPublish: opts.isPublisher,
        canSubscribe: true,
        canPublishData: opts.isPublisher,
      });

      at.addGrant(grant);
      return await at.toJwt();
    } catch (err) {
      logger.warn(`LiveKit generateToken failed: ${String(err)}`);
      return '';
    }
  }

  async deleteRoom(roomName: string): Promise<void> {
    try {
      const { RoomServiceClient } = await import('livekit-server-sdk');
      const roomService = new RoomServiceClient(
        this.serverUrl,
        this.apiKey,
        this.apiSecret
      );
      await roomService.deleteRoom(roomName);
      logger.log(`LiveKit room deleted: ${roomName}`);
    } catch (err) {
      logger.warn(`LiveKit deleteRoom failed: ${String(err)}`);
    }
  }

  async getParticipants(roomName: string): Promise<LiveKitParticipant[]> {
    try {
      const { RoomServiceClient } = await import('livekit-server-sdk');
      const roomService = new RoomServiceClient(
        this.serverUrl,
        this.apiKey,
        this.apiSecret
      );
      const participants = await roomService.listParticipants(roomName);
      return participants.map((p) => ({
        identity: p.identity,
        name: p.name,
        joinedAt: p.joinedAt ? Number(p.joinedAt) : undefined,
      }));
    } catch (err) {
      logger.warn(`LiveKit getParticipants failed: ${String(err)}`);
      return [];
    }
  }
}

/**
 * Returns a LiveKitClient or null when env vars are missing.
 */
export function createLiveKitClient(): LiveKitClient | null {
  const url = process.env['LIVEKIT_URL'];
  const key = process.env['LIVEKIT_API_KEY'];
  const secret = process.env['LIVEKIT_API_SECRET'];

  if (!url || !key || !secret) {
    logger.debug('LiveKit not configured — LIVEKIT_URL/API_KEY/API_SECRET not set');
    return null;
  }

  return new LiveKitClient(url, key, secret);
}
