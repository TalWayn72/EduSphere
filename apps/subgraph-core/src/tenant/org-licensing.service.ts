/**
 * OrgLicensingService — Course licensing for marketplace content.
 *
 * Features:
 *   - License a course from marketplace (UNLIMITED, PER_SEAT, TIME_LIMITED)
 *   - Revoke license
 *   - List active licenses for an organization
 *   - Seat tracking for PER_SEAT licenses
 *   - All queries scoped via withTenantContext (RLS enforced)
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface LicenseCourseInput {
  courseId: string;
  licenseType: string;
  maxSeats?: number;
  durationMonths?: number;
}

export interface CourseLicense {
  id: string;
  courseId: string;
  licenseType: string;
  maxSeats: number | null;
  usedSeats: number;
  status: string;
  licensedAt: Date;
  expiresAt: Date | null;
}

@Injectable()
export class OrgLicensingService implements OnModuleDestroy {
  private readonly logger = new Logger(OrgLicensingService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[OrgLicensingService] onModuleDestroy: cleaned up');
  }

  async licenseCourse(
    input: LicenseCourseInput,
    ctx: TenantContext
  ): Promise<CourseLicense> {
    if (input.licenseType === 'PER_SEAT' && !input.maxSeats) {
      throw new BadRequestException('maxSeats required for PER_SEAT license');
    }

    let expiresAt: Date | null = null;
    if (input.durationMonths) {
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + input.durationMonths);
    }

    return withTenantContext(this.db, ctx, async (tx) => {
      // Check for existing active license
      const existing = await tx.execute<{ id: string }>(sql`
        SELECT id FROM course_licenses
        WHERE tenant_id = ${ctx.tenantId}::uuid
          AND course_id = ${input.courseId}::uuid
          AND status = 'ACTIVE'
        LIMIT 1
      `);

      if (existing.rows.length > 0) {
        throw new BadRequestException('Active license already exists');
      }

      const result = await tx.execute<{
        id: string;
        course_id: string;
        license_type: string;
        max_seats: number | null;
        used_seats: number;
        status: string;
        licensed_at: Date;
        expires_at: Date | null;
      }>(sql`
        INSERT INTO course_licenses (
          tenant_id, course_id, license_type,
          max_seats, used_seats, licensor_tenant_id,
          status, expires_at
        ) VALUES (
          ${ctx.tenantId}::uuid,
          ${input.courseId}::uuid,
          ${input.licenseType},
          ${input.maxSeats ?? null},
          0,
          ${ctx.tenantId}::uuid,
          'ACTIVE',
          ${expiresAt?.toISOString() ?? null}::timestamptz
        )
        RETURNING id, course_id, license_type, max_seats,
                  used_seats, status, licensed_at, expires_at
      `);

      const row = result.rows[0]!;
      this.logger.log(
        {
          tenantId: ctx.tenantId,
          courseId: input.courseId,
          type: input.licenseType,
        },
        '[OrgLicensingService] Course licensed'
      );

      return {
        id: row.id,
        courseId: row.course_id,
        licenseType: row.license_type,
        maxSeats: row.max_seats,
        usedSeats: row.used_seats,
        status: row.status,
        licensedAt: new Date(row.licensed_at),
        expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      };
    });
  }

  async revokeLicense(id: string, ctx: TenantContext): Promise<boolean> {
    await withTenantContext(this.db, ctx, async (tx) => {
      await tx.execute(sql`
        UPDATE course_licenses
        SET status = 'REVOKED', updated_at = NOW()
        WHERE id = ${id}::uuid
          AND tenant_id = ${ctx.tenantId}::uuid
          AND status = 'ACTIVE'
      `);
    });

    this.logger.log(
      { tenantId: ctx.tenantId, licenseId: id },
      '[OrgLicensingService] License revoked'
    );
    return true;
  }

  async listLicenses(ctx: TenantContext): Promise<CourseLicense[]> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const result = await tx.execute<{
        id: string;
        course_id: string;
        license_type: string;
        max_seats: number | null;
        used_seats: number;
        status: string;
        licensed_at: Date;
        expires_at: Date | null;
      }>(sql`
        SELECT id, course_id, license_type, max_seats,
               used_seats, status, licensed_at, expires_at
        FROM course_licenses
        WHERE tenant_id = ${ctx.tenantId}::uuid
        ORDER BY licensed_at DESC
      `);

      return result.rows.map((r) => ({
        id: r.id,
        courseId: r.course_id,
        licenseType: r.license_type,
        maxSeats: r.max_seats,
        usedSeats: r.used_seats,
        status: r.status,
        licensedAt: new Date(r.licensed_at),
        expiresAt: r.expires_at ? new Date(r.expires_at) : null,
      }));
    });
  }
}
