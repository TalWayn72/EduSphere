/**
 * ProctoringService — Remote Proctoring session lifecycle (PRD §7.2 G-4).
 * Memory safety: implements OnModuleDestroy + closes DB pool.
 */
import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  proctoring_sessions,
  type Database,
} from '@edusphere/db';
import { eq, and } from 'drizzle-orm';

export interface ProctoringFlagEntry {
  type: string;
  timestamp: string;
  detail?: string | null;
}

export interface MappedProctoringSession {
  id: string;
  assessmentId: string;
  userId: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  flags: ProctoringFlagEntry[];
  flagCount: number;
}

type SessionRow = typeof proctoring_sessions.$inferSelect;

@Injectable()
export class ProctoringService implements OnModuleDestroy {
  private readonly logger = new Logger(ProctoringService.name);
  private readonly db: Database = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async startSession(
    assessmentId: string,
    tenantId: string,
    userId: string
  ): Promise<MappedProctoringSession> {
    const [row] = await this.db
      .insert(proctoring_sessions)
      .values({ assessment_id: assessmentId, tenant_id: tenantId, user_id: userId, status: 'PENDING', flags: [] })
      .returning();

    if (!row) {
      this.logger.error({ assessmentId, tenantId, userId }, '[ProctoringService] startSession: insert failed');
      throw new Error('Failed to create proctoring session');
    }

    this.logger.log({ sessionId: row.id, assessmentId, tenantId, userId }, '[ProctoringService] session created');
    return this.mapSession(row);
  }

  async flagEvent(
    sessionId: string,
    type: string,
    detail: string | null | undefined,
    tenantId: string
  ): Promise<MappedProctoringSession> {
    const existing = await this.getSessionRow(sessionId, tenantId);
    if (!existing) {
      this.logger.error({ sessionId, tenantId }, '[ProctoringService] flagEvent: session not found');
      throw new NotFoundException(`ProctoringSession ${sessionId} not found`);
    }

    const currentFlags = (existing.flags as ProctoringFlagEntry[]) ?? [];
    const newFlag: ProctoringFlagEntry = { type, timestamp: new Date().toISOString(), detail: detail ?? null };
    const updatedFlags = [...currentFlags, newFlag];
    const newStatus = 'FLAGGED';

    const [updated] = await this.db
      .update(proctoring_sessions)
      .set({ flags: updatedFlags, status: newStatus })
      .where(and(eq(proctoring_sessions.id, sessionId), eq(proctoring_sessions.tenant_id, tenantId)))
      .returning();

    if (!updated) throw new NotFoundException(`ProctoringSession ${sessionId} not found`);

    this.logger.log({ sessionId, tenantId, type }, '[ProctoringService] flagEvent recorded');
    return this.mapSession(updated);
  }

  async endSession(sessionId: string, tenantId: string): Promise<MappedProctoringSession> {
    const existing = await this.getSessionRow(sessionId, tenantId);
    if (!existing) {
      this.logger.error({ sessionId, tenantId }, '[ProctoringService] endSession: session not found');
      throw new NotFoundException(`ProctoringSession ${sessionId} not found`);
    }

    const [updated] = await this.db
      .update(proctoring_sessions)
      .set({ status: 'COMPLETED', ended_at: new Date() })
      .where(and(eq(proctoring_sessions.id, sessionId), eq(proctoring_sessions.tenant_id, tenantId)))
      .returning();

    if (!updated) throw new NotFoundException(`ProctoringSession ${sessionId} not found`);

    this.logger.log({ sessionId, tenantId }, '[ProctoringService] session ended');
    return this.mapSession(updated);
  }

  async getSession(sessionId: string, tenantId: string): Promise<MappedProctoringSession | null> {
    const row = await this.getSessionRow(sessionId, tenantId);
    return row ? this.mapSession(row) : null;
  }

  async getReport(assessmentId: string, tenantId: string): Promise<MappedProctoringSession[]> {
    const rows = await this.db
      .select()
      .from(proctoring_sessions)
      .where(and(eq(proctoring_sessions.assessment_id, assessmentId), eq(proctoring_sessions.tenant_id, tenantId)));

    return rows.map((r) => this.mapSession(r));
  }

  private async getSessionRow(sessionId: string, tenantId: string): Promise<SessionRow | null> {
    const [row] = await this.db
      .select()
      .from(proctoring_sessions)
      .where(and(eq(proctoring_sessions.id, sessionId), eq(proctoring_sessions.tenant_id, tenantId)))
      .limit(1);
    return row ?? null;
  }

  private mapSession(row: SessionRow): MappedProctoringSession {
    const flags = (row.flags as ProctoringFlagEntry[]) ?? [];
    return {
      id: row.id,
      assessmentId: row.assessment_id,
      userId: row.user_id,
      status: row.status,
      startedAt: row.started_at ? row.started_at.toISOString() : null,
      endedAt: row.ended_at ? row.ended_at.toISOString() : null,
      flags,
      flagCount: flags.length,
    };
  }
}
