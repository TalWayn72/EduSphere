import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  desc,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';
import { buildLayerVisibilityConditions } from './annotation-access';

@Injectable()
export class AnnotationQueriesService {
  private db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  private toTenantContext(authContext: AuthContext): TenantContext {
    return {
      tenantId: authContext.tenantId || '',
      userId: authContext.userId,
      userRole: authContext.roles[0] || 'STUDENT',
    };
  }

  async findAll(
    filters: {
      assetId?: string;
      userId?: string;
      layer?: string;
      limit: number;
      offset: number;
    },
    authContext?: AuthContext
  ) {
    if (!authContext || !authContext.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const conditions = [sql`${schema.annotations.deleted_at} IS NULL`];

      if (filters.assetId) {
        conditions.push(eq(schema.annotations.asset_id, filters.assetId));
      }
      if (filters.userId) {
        conditions.push(eq(schema.annotations.user_id, filters.userId));
      }

      conditions.push(
        ...buildLayerVisibilityConditions(
          schema.annotations, authContext, filters.layer
        )
      );

      return tx
        .select()
        .from(schema.annotations)
        .where(and(...conditions))
        .orderBy(desc(schema.annotations.created_at))
        .limit(filters.limit)
        .offset(filters.offset);
    });
  }

  async findByAsset(
    assetId: string,
    layer?: string,
    authContext?: AuthContext
  ) {
    if (!authContext || !authContext.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const conditions = [
        eq(schema.annotations.asset_id, assetId),
        sql`${schema.annotations.deleted_at} IS NULL`,
      ];

      conditions.push(
        ...buildLayerVisibilityConditions(
          schema.annotations, authContext, layer
        )
      );

      return tx
        .select()
        .from(schema.annotations)
        .where(and(...conditions))
        .orderBy(desc(schema.annotations.created_at));
    });
  }

  async findByUser(
    userId: string,
    limit: number,
    offset: number,
    authContext?: AuthContext
  ) {
    if (!authContext || !authContext.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      return tx
        .select()
        .from(schema.annotations)
        .where(
          and(
            eq(schema.annotations.user_id, userId),
            sql`${schema.annotations.deleted_at} IS NULL`
          )
        )
        .orderBy(desc(schema.annotations.created_at))
        .limit(limit)
        .offset(offset);
    });
  }
}
