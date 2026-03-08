import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  withTenantContext,
  closeAllPools,
  sql,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';

export interface TeamOverview {
  memberCount: number;
  avgCompletionPct: number;
  avgXpThisWeek: number;
  atRiskCount: number;
  topCourseTitle: string | null;
}

export interface TeamMemberProgress {
  userId: string;
  displayName: string;
  coursesEnrolled: number;
  avgCompletionPct: number;
  totalXp: number;
  level: number;
  lastActiveAt: Date | null;
  isAtRisk: boolean;
}

type MemberRow = { member_id: string };

type OverviewRow = {
  avg_completion: number | null;
  at_risk_count: number;
};

type XpRow = { avg_xp: number | null };

type TopCourseRow = { title: string | null };

type MemberProgressRow = {
  user_id: string;
  display_name: string | null;
  courses_enrolled: number;
  avg_completion: number | null;
  total_xp: number;
  level: number;
  last_active_at: Date | null;
};

@Injectable()
export class ManagerDashboardService implements OnModuleDestroy {
  private readonly logger = new Logger(ManagerDashboardService.name);
  private readonly db = createDatabaseConnection();

  async getTeamOverview(managerId: string, tenantId: string): Promise<TeamOverview> {
    const tenantCtx: TenantContext = {
      tenantId,
      userId: managerId,
      userRole: 'ORG_ADMIN',
    };

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const memberRows = (await tx.execute(sql`
        SELECT member_id::text AS member_id FROM team_members
        WHERE manager_id = ${managerId}::uuid AND tenant_id = ${tenantId}::uuid
      `)) as unknown as MemberRow[];

      if (memberRows.length === 0) {
        return { memberCount: 0, avgCompletionPct: 0, avgXpThisWeek: 0, atRiskCount: 0, topCourseTitle: null };
      }

      const memberIds = memberRows.map((r) => r.member_id);
      const memberIdList = memberIds.map((id) => `'${id}'::uuid`).join(', ');

      const overviewRows = (await tx.execute(sql`
        SELECT
          AVG(uc.progress_pct)::float AS avg_completion,
          COUNT(DISTINCT CASE WHEN uc.last_activity_at < NOW() - INTERVAL '14 days' THEN uc.user_id END)::int AS at_risk_count
        FROM user_courses uc
        WHERE uc.user_id = ANY(ARRAY[${sql.raw(memberIdList)}])
          AND uc.tenant_id = ${tenantId}::uuid
      `)) as unknown as OverviewRow[];

      const xpRows = (await tx.execute(sql`
        SELECT AVG(xp_awarded)::float AS avg_xp
        FROM user_xp_events
        WHERE user_id = ANY(ARRAY[${sql.raw(memberIdList)}])
          AND tenant_id = ${tenantId}::uuid
          AND created_at >= NOW() - INTERVAL '7 days'
      `)) as unknown as XpRow[];

      const topCourseRows = (await tx.execute(sql`
        SELECT ci.title
        FROM user_courses uc
        JOIN content_items ci ON ci.id = uc.course_id
        WHERE uc.user_id = ANY(ARRAY[${sql.raw(memberIdList)}])
          AND uc.tenant_id = ${tenantId}::uuid
        GROUP BY ci.title
        ORDER BY COUNT(*) DESC
        LIMIT 1
      `)) as unknown as TopCourseRow[];

      return {
        memberCount: memberIds.length,
        avgCompletionPct: Math.round((overviewRows[0]?.avg_completion ?? 0) * 10) / 10,
        avgXpThisWeek: Math.round(xpRows[0]?.avg_xp ?? 0),
        atRiskCount: overviewRows[0]?.at_risk_count ?? 0,
        topCourseTitle: topCourseRows[0]?.title ?? null,
      };
    });
  }

  async getTeamMemberProgress(managerId: string, tenantId: string): Promise<TeamMemberProgress[]> {
    const tenantCtx: TenantContext = {
      tenantId,
      userId: managerId,
      userRole: 'ORG_ADMIN',
    };

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const rows = (await tx.execute(sql`
        SELECT
          tm.member_id::text AS user_id,
          u.display_name,
          COUNT(DISTINCT uc.course_id)::int AS courses_enrolled,
          AVG(uc.progress_pct)::float AS avg_completion,
          COALESCE(xp.total_xp, 0)::int AS total_xp,
          COALESCE(xp.level, 1)::int AS level,
          MAX(uc.last_activity_at) AS last_active_at
        FROM team_members tm
        LEFT JOIN users u ON u.id = tm.member_id
        LEFT JOIN user_courses uc ON uc.user_id = tm.member_id AND uc.tenant_id = ${tenantId}::uuid
        LEFT JOIN user_xp_totals xp ON xp.user_id = tm.member_id AND xp.tenant_id = ${tenantId}::uuid
        WHERE tm.manager_id = ${managerId}::uuid AND tm.tenant_id = ${tenantId}::uuid
        GROUP BY tm.member_id, u.display_name, xp.total_xp, xp.level
        ORDER BY total_xp DESC
      `)) as unknown as MemberProgressRow[];

      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      return rows.map((r) => ({
        userId: r.user_id,
        displayName: r.display_name ?? 'Unknown User',
        coursesEnrolled: r.courses_enrolled,
        avgCompletionPct: Math.round((r.avg_completion ?? 0) * 10) / 10,
        totalXp: r.total_xp,
        level: r.level,
        lastActiveAt: r.last_active_at,
        isAtRisk: r.last_active_at ? r.last_active_at < fourteenDaysAgo : true,
      }));
    });
  }

  async addTeamMember(managerId: string, memberId: string, tenantId: string): Promise<boolean> {
    const tenantCtx: TenantContext = {
      tenantId,
      userId: managerId,
      userRole: 'ORG_ADMIN',
    };

    await withTenantContext(this.db, tenantCtx, async (tx) => {
      await tx.execute(sql`
        INSERT INTO team_members (manager_id, member_id, tenant_id)
        VALUES (${managerId}::uuid, ${memberId}::uuid, ${tenantId}::uuid)
        ON CONFLICT (manager_id, member_id, tenant_id) DO NOTHING
      `);
    });
    this.logger.log(`[ManagerDashboardService] addTeamMember: member ${memberId} added to team of manager ${managerId}`);
    return true;
  }

  async removeTeamMember(managerId: string, memberId: string, tenantId: string): Promise<boolean> {
    const tenantCtx: TenantContext = {
      tenantId,
      userId: managerId,
      userRole: 'ORG_ADMIN',
    };

    await withTenantContext(this.db, tenantCtx, async (tx) => {
      await tx.execute(sql`
        DELETE FROM team_members
        WHERE manager_id = ${managerId}::uuid
          AND member_id = ${memberId}::uuid
          AND tenant_id = ${tenantId}::uuid
      `);
    });
    this.logger.log(`[ManagerDashboardService] removeTeamMember: member ${memberId} removed from team of manager ${managerId}`);
    return true;
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[ManagerDashboardService] onModuleDestroy: DB pools closed');
  }
}
