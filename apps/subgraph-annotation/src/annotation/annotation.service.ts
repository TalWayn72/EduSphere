import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  desc,
  withTenantContext,
  sql,
  closeAllPools,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';

interface CreateAnnotationInput {
  assetId: string;
  annotationType: string;
  layer?: string;
  content: unknown;
  spatialData?: unknown;
  parentId?: string;
}

interface UpdateAnnotationInput {
  content?: unknown;
  spatialData?: unknown;
  isResolved?: boolean;
}

@Injectable()
export class AnnotationService implements OnModuleDestroy {
  private readonly logger = new Logger(AnnotationService.name);
  private db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  private toTenantContext(authContext: AuthContext): TenantContext {
    return {
      tenantId: authContext.tenantId || '',
      userId: authContext.userId,
      userRole: authContext.roles[0] || 'STUDENT',
    };
  }

  async findById(id: string, authContext?: AuthContext) {
    if (!authContext || !authContext.tenantId) {
      throw new Error('Authentication required');
    }

    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [annotation] = await tx
        .select()
        .from(schema.annotations)
        .where(
          and(
            eq(schema.annotations.id, id),
            sql`${schema.annotations.deleted_at} IS NULL`
          )
        )
        .limit(1);

      return annotation || null;
    });
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
      throw new Error('Authentication required');
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

      // Layer-based access control
      const userRole = authContext.roles[0] || 'STUDENT';
      const isInstructor = ['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN'].includes(
        userRole
      );

      if (filters.layer) {
        conditions.push(eq(schema.annotations.layer, filters.layer as string));
        // PERSONAL layer only visible to owner
        if (filters.layer === 'PERSONAL') {
          conditions.push(eq(schema.annotations.user_id, authContext.userId));
        }
      } else {
        // Apply default visibility rules if no layer filter specified
        if (isInstructor) {
          // Instructors see everything except others' PERSONAL annotations
          conditions.push(
            sql`(${schema.annotations.layer} != 'PERSONAL' OR ${schema.annotations.user_id} = ${authContext.userId})`
          );
        } else {
          // Students see SHARED, INSTRUCTOR, AI_GENERATED, and own PERSONAL
          conditions.push(
            sql`(${schema.annotations.layer} IN ('SHARED', 'INSTRUCTOR', 'AI_GENERATED') OR (${schema.annotations.layer} = 'PERSONAL' AND ${schema.annotations.user_id} = ${authContext.userId}))`
          );
        }
      }

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
      throw new Error('Authentication required');
    }

    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const conditions = [
        eq(schema.annotations.asset_id, assetId),
        sql`${schema.annotations.deleted_at} IS NULL`,
      ];

      // Layer-based access control
      const userRole = authContext.roles[0] || 'STUDENT';
      const isInstructor = ['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN'].includes(
        userRole
      );

      if (layer) {
        conditions.push(eq(schema.annotations.layer, layer as string));
        // PERSONAL layer only visible to owner
        if (layer === 'PERSONAL') {
          conditions.push(eq(schema.annotations.user_id, authContext.userId));
        }
      } else {
        // If no layer specified, apply visibility rules
        if (isInstructor) {
          // Instructors see everything except others' PERSONAL annotations
          conditions.push(
            sql`(${schema.annotations.layer} != 'PERSONAL' OR ${schema.annotations.user_id} = ${authContext.userId})`
          );
        } else {
          // Students see SHARED, INSTRUCTOR, AI_GENERATED, and own PERSONAL
          conditions.push(
            sql`(${schema.annotations.layer} IN ('SHARED', 'INSTRUCTOR', 'AI_GENERATED') OR (${schema.annotations.layer} = 'PERSONAL' AND ${schema.annotations.user_id} = ${authContext.userId}))`
          );
        }
      }

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
      throw new Error('Authentication required');
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

  async create(input: CreateAnnotationInput, authContext: AuthContext) {
    if (!authContext || !authContext.tenantId) {
      throw new Error('Authentication required');
    }

    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [annotation] = await tx
        .insert(schema.annotations)
        .values({
          tenant_id: authContext.tenantId || '',
          asset_id: input.assetId,
          user_id: authContext.userId,
          annotation_type: input.annotationType,
          layer: input.layer || 'PERSONAL',
          content: input.content,
          spatial_data: input.spatialData || null,
          parent_id: input.parentId || null,
          is_resolved: false,
        })
        .returning();

      if (!annotation) {
        throw new Error('Failed to create annotation');
      }

      this.logger.log(
        `Annotation created: ${annotation.id} by user ${authContext.userId}`
      );
      return annotation;
    });
  }

  async update(id: string, input: UpdateAnnotationInput, authContext: AuthContext) {
    if (!authContext || !authContext.tenantId) {
      throw new Error('Authentication required');
    }

    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      // Check ownership before updating
      const [existing] = await tx
        .select()
        .from(schema.annotations)
        .where(
          and(
            eq(schema.annotations.id, id),
            sql`${schema.annotations.deleted_at} IS NULL`
          )
        )
        .limit(1);

      if (!existing) {
        throw new Error('Annotation not found');
      }

      // Permission check: only owner or instructors can update
      const userRole = authContext.roles[0] || 'STUDENT';
      const isInstructor = ['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN'].includes(
        userRole
      );
      const isOwner = existing.user_id === authContext.userId;

      if (!isOwner && !isInstructor) {
        throw new Error(
          'Unauthorized: You can only update your own annotations'
        );
      }

      const updateData: Record<string, unknown> = {};

      if (input.content !== undefined) {
        updateData.content = input.content;
      }

      if (input.spatialData !== undefined) {
        updateData.spatial_data = input.spatialData;
      }

      if (input.isResolved !== undefined) {
        updateData.is_resolved = input.isResolved;
      }

      const [annotation] = await tx
        .update(schema.annotations)
        .set(updateData)
        .where(eq(schema.annotations.id, id))
        .returning();

      if (!annotation) {
        throw new Error('Failed to update annotation');
      }

      this.logger.log(
        `Annotation updated: ${annotation.id} by user ${authContext.userId}`
      );
      return annotation;
    });
  }

  async resolve(id: string, authContext: AuthContext) {
    return this.update(id, { isResolved: true }, authContext);
  }

  async replyTo(parentId: string, content: string, authContext: AuthContext) {
    if (!authContext || !authContext.tenantId) {
      throw new Error('Authentication required');
    }

    // Load parent to inherit layer and assetId
    const parent = await this.findById(parentId, authContext);
    if (!parent) {
      throw new Error('Parent annotation not found');
    }

    return this.create(
      {
        assetId: parent.asset_id,
        annotationType: parent.annotation_type,
        layer: parent.layer,
        content: { text: content },
        parentId,
      },
      authContext
    );
  }

  async delete(id: string, authContext: AuthContext): Promise<boolean> {
    if (!authContext || !authContext.tenantId) {
      throw new Error('Authentication required');
    }

    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      // Check ownership before deleting
      const [existing] = await tx
        .select()
        .from(schema.annotations)
        .where(
          and(
            eq(schema.annotations.id, id),
            sql`${schema.annotations.deleted_at} IS NULL`
          )
        )
        .limit(1);

      if (!existing) {
        throw new Error('Annotation not found');
      }

      // Permission check: only owner or instructors can delete
      const userRole = authContext.roles[0] || 'STUDENT';
      const isInstructor = ['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN'].includes(
        userRole
      );
      const isOwner = existing.user_id === authContext.userId;

      if (!isOwner && !isInstructor) {
        throw new Error(
          'Unauthorized: You can only delete your own annotations'
        );
      }

      const [deleted] = await tx
        .update(schema.annotations)
        .set({ deleted_at: new Date() })
        .where(eq(schema.annotations.id, id))
        .returning();

      if (deleted) {
        this.logger.log(
          `Annotation soft-deleted: ${id} by user ${authContext.userId}`
        );
        return true;
      }

      return false;
    });
  }
}
