import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { db, announcements } from '@edusphere/db';
import { count, eq, and, lte, gte, desc, isNull, or } from 'drizzle-orm';

export interface AnnouncementData {
  id: string;
  title: string;
  body: string;
  priority: string;
  targetAudience: string;
  isActive: boolean;
  publishAt: string | null;
  expiresAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface AnnouncementListResult {
  announcements: AnnouncementData[];
  total: number;
}

interface ListOpts { limit: number; offset: number }
interface CreateInput { title: string; body: string; priority: string; targetAudience: string; publishAt?: string | null; expiresAt?: string | null }
interface UpdateInput { title?: string | null; body?: string | null; priority?: string | null; targetAudience?: string | null; isActive?: boolean | null; publishAt?: string | null; expiresAt?: string | null }

function mapRow(row: typeof announcements.$inferSelect): AnnouncementData {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    priority: row.priority,
    targetAudience: row.targetAudience,
    isActive: row.isActive,
    publishAt: row.publishAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdBy: row.createdBy ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class AnnouncementsService implements OnModuleDestroy {
  private readonly logger = new Logger(AnnouncementsService.name);

  onModuleDestroy(): void {
    // No resources to clean up
  }

  async getAdminAnnouncements(tenantId: string, opts: ListOpts): Promise<AnnouncementListResult> {
    try {
      const [rows, totalResult] = await Promise.all([
        db.select().from(announcements)
          .where(eq(announcements.tenantId, tenantId))
          .orderBy(desc(announcements.createdAt))
          .limit(opts.limit)
          .offset(opts.offset),
        db.select({ value: count() }).from(announcements)
          .where(eq(announcements.tenantId, tenantId)),
      ]);
      return { announcements: rows.map(mapRow), total: totalResult[0]?.value ?? 0 };
    } catch (err) {
      this.logger.error({ tenantId, err }, 'Failed to list announcements');
      return { announcements: [], total: 0 };
    }
  }

  async getActiveAnnouncements(tenantId: string): Promise<AnnouncementData[]> {
    const now = new Date();
    try {
      const rows = await db.select().from(announcements).where(
        and(
          eq(announcements.tenantId, tenantId),
          eq(announcements.isActive, true),
          or(isNull(announcements.publishAt), lte(announcements.publishAt, now)),
          or(isNull(announcements.expiresAt), gte(announcements.expiresAt, now)),
        ),
      ).orderBy(desc(announcements.createdAt));
      return rows.map(mapRow);
    } catch (err) {
      this.logger.error({ tenantId, err }, 'Failed to fetch active announcements');
      return [];
    }
  }

  async create(tenantId: string, createdBy: string, input: CreateInput): Promise<AnnouncementData> {
    const [row] = await db.insert(announcements).values({
      tenantId,
      createdBy,
      title: input.title,
      body: input.body,
      priority: input.priority,
      targetAudience: input.targetAudience,
      publishAt: input.publishAt ? new Date(input.publishAt) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      updatedAt: new Date(),
    }).returning();
    return mapRow(row);
  }

  async update(id: string, input: UpdateInput): Promise<AnnouncementData> {
    const patch: Partial<typeof announcements.$inferInsert> = { updatedAt: new Date() };
    if (input.title != null) patch.title = input.title;
    if (input.body != null) patch.body = input.body;
    if (input.priority != null) patch.priority = input.priority;
    if (input.targetAudience != null) patch.targetAudience = input.targetAudience;
    if (input.isActive != null) patch.isActive = input.isActive;
    if (input.publishAt !== undefined) patch.publishAt = input.publishAt ? new Date(input.publishAt) : null;
    if (input.expiresAt !== undefined) patch.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    const [row] = await db.update(announcements).set(patch).where(eq(announcements.id, id)).returning();
    return mapRow(row);
  }

  async delete(id: string): Promise<boolean> {
    await db.delete(announcements).where(eq(announcements.id, id));
    return true;
  }

  async publish(id: string): Promise<AnnouncementData> {
    const [row] = await db.update(announcements)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(announcements.id, id))
      .returning();
    return mapRow(row);
  }
}
