/**
 * LiveBookmarkService — CRUD for user bookmarks within a live session.
 * RLS enforces user-owned access; instructors/admins see all bookmarks.
 */
import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
  closeAllPools,
  type Database,
  type TenantContext,
} from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';

@Injectable()
export class LiveBookmarkService implements OnModuleDestroy {
  private readonly logger = new Logger(LiveBookmarkService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  toTenantContext(authContext: AuthContext): TenantContext {
    return {
      tenantId: authContext.tenantId ?? '',
      userId: authContext.userId,
      userRole: authContext.roles?.[0] ?? 'STUDENT',
    };
  }

  async addBookmark(
    sessionId: string,
    streamTs: number,
    authContext: AuthContext,
    label?: string,
    note?: string
  ) {
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const values: Record<string, unknown> = {
        session_id: sessionId,
        user_id: authContext.userId,
        tenant_id: tenantCtx.tenantId,
        stream_ts: streamTs,
      };
      if (label !== undefined) values['label'] = label;
      if (note !== undefined) values['note'] = note;

      const [row] = await tx
        .insert(schema.live_bookmarks)
        .values(values as never)
        .returning();

      this.logger.log(
        `Bookmark added: ${row.id} session=${sessionId} ts=${streamTs}`
      );
      return row;
    });
  }

  async removeBookmark(
    bookmarkId: string,
    authContext: AuthContext
  ): Promise<boolean> {
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.live_bookmarks)
        .where(eq(schema.live_bookmarks.id, bookmarkId))
        .limit(1);

      if (!existing)
        throw new NotFoundException(`Bookmark ${bookmarkId} not found`);

      if (existing.user_id !== authContext.userId) {
        throw new ForbiddenException("Cannot remove another user's bookmark");
      }

      await tx
        .delete(schema.live_bookmarks)
        .where(eq(schema.live_bookmarks.id, bookmarkId));

      this.logger.log(`Bookmark removed: ${bookmarkId}`);
      return true;
    });
  }

  async getBookmarks(sessionId: string, authContext: AuthContext) {
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      return tx
        .select()
        .from(schema.live_bookmarks)
        .where(
          and(
            eq(schema.live_bookmarks.session_id, sessionId),
            eq(schema.live_bookmarks.user_id, authContext.userId)
          )
        )
        .orderBy(schema.live_bookmarks.stream_ts);
    });
  }
}
