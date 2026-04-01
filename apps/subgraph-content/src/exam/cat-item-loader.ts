/**
 * CatItemLoader — DB access helpers for CAT item selection.
 *
 * Extracted from CatEngineService for modularity and 150-line compliance.
 */
import { schema, eq, and, isNull, withTenantContext } from '@edusphere/db';
import type {
  TenantContext,
  ExamItem,
  ExamSession,
  DrizzleDB,
} from '@edusphere/db';
import type { CatState } from './cat-engine.types.js';

export class CatItemLoader {
  constructor(private readonly db: DrizzleDB) {}

  async loadEligibleItems(
    courseId: string,
    excludeIds: string[],
    ctx: TenantContext
  ): Promise<ExamItem[]> {
    const all = await withTenantContext(this.db, ctx, (tx) =>
      tx
        .select()
        .from(schema.examItems)
        .where(
          and(
            eq(schema.examItems.courseId, courseId),
            eq(schema.examItems.calibrationStatus, 'CALIBRATED'),
            isNull(schema.examItems.deletedAt),
            eq(schema.examItems.difFlagged, false)
          )
        )
    );
    const excludeSet = new Set(excludeIds);
    return all.filter((i) => !excludeSet.has(i.id));
  }

  async loadAdministeredItems(
    ids: string[],
    ctx: TenantContext
  ): Promise<ExamItem[]> {
    if (ids.length === 0) return [];
    const all = await withTenantContext(this.db, ctx, (tx) =>
      tx
        .select()
        .from(schema.examItems)
        .where(isNull(schema.examItems.deletedAt))
    );
    const idSet = new Set(ids);
    const map = new Map(
      all.filter((i) => idSet.has(i.id)).map((i) => [i.id, i])
    );
    return ids.map((id) => map.get(id)).filter(Boolean) as ExamItem[];
  }

  async saveCatState(
    sessionId: string,
    state: CatState,
    ctx: TenantContext
  ): Promise<void> {
    await withTenantContext(this.db, ctx, (tx) =>
      tx
        .update(schema.examSessions)
        .set({ catState: state })
        .where(eq(schema.examSessions.id, sessionId))
    );
  }

  parseCatState(session: ExamSession): CatState {
    const raw = session.catState as CatState | null;
    return (
      raw ?? {
        currentTheta: 0,
        currentSE: 9.99,
        administeredItemIds: [],
        responsePattern: [],
      }
    );
  }
}
