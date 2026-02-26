import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  closeAllPools,
} from '@edusphere/db';

export interface ScormSessionData {
  id: string;
  userId: string;
  contentItemId: string;
  tenantId: string;
  lessonStatus: string;
  scoreRaw: number | null;
  suspendData: string | null;
  completedAt: string | null;
  updatedAt: string;
}

const COMPLETED_STATUSES = ['passed', 'completed'];

function mapSession(
  row: typeof schema.scormSessions.$inferSelect
): ScormSessionData {
  return {
    id: row.id,
    userId: row.user_id,
    contentItemId: row.content_item_id,
    tenantId: row.tenant_id,
    lessonStatus: row.lesson_status,
    scoreRaw: row.score_raw ?? null,
    suspendData: row.suspend_data ?? null,
    completedAt: row.completed_at?.toISOString() ?? null,
    updatedAt: row.updated_at.toISOString(),
  };
}

@Injectable()
export class ScormSessionService implements OnModuleDestroy {
  private readonly logger = new Logger(ScormSessionService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async initSession(
    userId: string,
    contentItemId: string,
    tenantId: string
  ): Promise<ScormSessionData> {
    // Return existing session if present, otherwise create
    const [existing] = await this.db
      .select()
      .from(schema.scormSessions)
      .where(
        and(
          eq(schema.scormSessions.user_id, userId),
          eq(schema.scormSessions.content_item_id, contentItemId)
        )
      )
      .limit(1);

    if (existing) {
      this.logger.debug(`Resuming SCORM session: id=${existing.id}`);
      return mapSession(existing);
    }

    const [created] = await this.db
      .insert(schema.scormSessions)
      .values({
        user_id: userId,
        content_item_id: contentItemId,
        tenant_id: tenantId,
        lesson_status: 'not attempted',
      })
      .returning();

    if (!created) throw new Error('Failed to create SCORM session');
    this.logger.log(`Created SCORM session: id=${created.id} userId=${userId}`);
    return mapSession(created);
  }

  async updateSession(
    sessionId: string,
    userId: string,
    cmiData: Record<string, string>
  ): Promise<void> {
    const lessonStatus = cmiData['cmi.core.lesson_status'] ?? undefined;
    const scoreRaw = cmiData['cmi.core.score.raw']
      ? parseFloat(cmiData['cmi.core.score.raw'])
      : undefined;
    const scoreMin = cmiData['cmi.core.score.min']
      ? parseFloat(cmiData['cmi.core.score.min'])
      : undefined;
    const scoreMax = cmiData['cmi.core.score.max']
      ? parseFloat(cmiData['cmi.core.score.max'])
      : undefined;
    const suspendData = cmiData['cmi.suspend_data'] ?? undefined;
    const sessionTime = cmiData['cmi.core.session_time'] ?? undefined;

    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (lessonStatus !== undefined) updates['lesson_status'] = lessonStatus;
    if (scoreRaw !== undefined && !isNaN(scoreRaw))
      updates['score_raw'] = scoreRaw;
    if (scoreMin !== undefined && !isNaN(scoreMin))
      updates['score_min'] = scoreMin;
    if (scoreMax !== undefined && !isNaN(scoreMax))
      updates['score_max'] = scoreMax;
    if (suspendData !== undefined) updates['suspend_data'] = suspendData;
    if (sessionTime !== undefined) updates['session_time'] = sessionTime;

    await this.db
      .update(schema.scormSessions)
      .set(updates)
      .where(
        and(
          eq(schema.scormSessions.id, sessionId),
          eq(schema.scormSessions.user_id, userId)
        )
      );

    this.logger.debug(`Updated SCORM session: id=${sessionId}`);
  }

  async finishSession(
    sessionId: string,
    userId: string,
    cmiData: Record<string, string>
  ): Promise<void> {
    await this.updateSession(sessionId, userId, cmiData);

    const lessonStatus = cmiData['cmi.core.lesson_status'] ?? '';
    if (COMPLETED_STATUSES.includes(lessonStatus)) {
      await this.db
        .update(schema.scormSessions)
        .set({ completed_at: new Date(), updated_at: new Date() })
        .where(
          and(
            eq(schema.scormSessions.id, sessionId),
            eq(schema.scormSessions.user_id, userId)
          )
        );
      this.logger.log(`SCORM session completed: id=${sessionId}`);
    }
  }

  async findSession(
    userId: string,
    contentItemId: string
  ): Promise<ScormSessionData | null> {
    const [row] = await this.db
      .select()
      .from(schema.scormSessions)
      .where(
        and(
          eq(schema.scormSessions.user_id, userId),
          eq(schema.scormSessions.content_item_id, contentItemId)
        )
      )
      .limit(1);

    return row ? mapSession(row) : null;
  }

  async findSessionById(sessionId: string): Promise<ScormSessionData> {
    const [row] = await this.db
      .select()
      .from(schema.scormSessions)
      .where(eq(schema.scormSessions.id, sessionId))
      .limit(1);

    if (!row)
      throw new NotFoundException(`SCORM session ${sessionId} not found`);
    return mapSession(row);
  }
}
