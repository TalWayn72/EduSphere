import {
  Injectable,
  Logger,
  OnModuleDestroy,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
  sql,
  closeAllPools,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';
import { isInstructorRole } from './annotation-access';
import type {
  CreateAnnotationInput,
  UpdateAnnotationInput,
} from './annotation-access';
import { AnnotationQueriesService } from './annotation-queries.service';

export type {
  CreateAnnotationInput,
  UpdateAnnotationInput,
} from './annotation-access';
export type {
  AnnotationLayer,
  AnnotationType,
  TextRange,
} from './annotation-access';

@Injectable()
export class AnnotationService implements OnModuleDestroy {
  private readonly logger = new Logger(AnnotationService.name);
  private db: Database;

  constructor(private readonly queries: AnnotationQueriesService) {
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
      throw new UnauthorizedException('Authentication required');
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
    return this.queries.findAll(filters, authContext);
  }

  async findByAsset(
    assetId: string,
    layer?: string,
    authContext?: AuthContext
  ) {
    return this.queries.findByAsset(assetId, layer, authContext);
  }

  async findByUser(
    userId: string,
    limit: number,
    offset: number,
    authContext?: AuthContext
  ) {
    return this.queries.findByUser(userId, limit, offset, authContext);
  }

  async create(input: CreateAnnotationInput, authContext: AuthContext) {
    if (!authContext || !authContext.tenantId) {
      throw new UnauthorizedException('Authentication required');
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
          text_start: input.textRange?.start ?? null,
          text_end: input.textRange?.end ?? null,
          range_type: input.textRange?.rangeType ?? null,
          parent_id: input.parentId || null,
          is_resolved: false,
        })
        .returning();

      if (!annotation) {
        throw new InternalServerErrorException('Failed to create annotation');
      }
      this.logger.log(
        `Annotation created: ${annotation.id} by user ${authContext.userId}`
      );
      return annotation;
    });
  }

  async update(
    id: string,
    input: UpdateAnnotationInput,
    authContext: AuthContext
  ) {
    if (!authContext || !authContext.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
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

      if (!existing) throw new NotFoundException('Annotation not found');

      const isOwner = existing.user_id === authContext.userId;
      if (!isOwner && !isInstructorRole(authContext)) {
        throw new ForbiddenException(
          'You can only update your own annotations'
        );
      }

      const updateData: Record<string, unknown> = {};
      if (input.content !== undefined) updateData.content = input.content;
      if (input.spatialData !== undefined)
        updateData.spatial_data = input.spatialData;
      if (input.isResolved !== undefined)
        updateData.is_resolved = input.isResolved;

      const [annotation] = await tx
        .update(schema.annotations)
        .set(updateData)
        .where(eq(schema.annotations.id, id))
        .returning();

      if (!annotation) {
        throw new InternalServerErrorException('Failed to update annotation');
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

  async promote(id: string, authContext: AuthContext) {
    if (!authContext || !authContext.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!isInstructorRole(authContext)) {
      throw new ForbiddenException('Only instructors can promote annotations');
    }

    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
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

      if (!existing) throw new NotFoundException('Annotation not found');

      const [promoted] = await tx
        .update(schema.annotations)
        .set({ layer: 'INSTRUCTOR' })
        .where(eq(schema.annotations.id, id))
        .returning();

      if (!promoted) {
        throw new InternalServerErrorException('Failed to promote annotation');
      }
      this.logger.log(
        `Annotation promoted to INSTRUCTOR: ${id} by user ${authContext.userId}`
      );
      return promoted;
    });
  }

  async replyTo(parentId: string, content: string, authContext: AuthContext) {
    if (!authContext || !authContext.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    const parent = await this.findById(parentId, authContext);
    if (!parent) throw new NotFoundException('Parent annotation not found');

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
      throw new UnauthorizedException('Authentication required');
    }
    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
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

      if (!existing) throw new NotFoundException('Annotation not found');

      const isOwner = existing.user_id === authContext.userId;
      if (!isOwner && !isInstructorRole(authContext)) {
        throw new ForbiddenException(
          'You can only delete your own annotations'
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
