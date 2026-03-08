import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  withTenantContext,
  eq,
  and,
  isNull,
  desc,
  type TenantContext,
} from '@edusphere/db';

export interface DocumentVersionRow {
  id: string;
  mediaAssetId: string;
  versionNumber: number;
  createdBy: string | null;
  anchorCount: number;
  brokenAnchorCount: number;
  diffSummary: string | null;
  aiSuggestions: unknown | null;
  createdAt: string;
}

// Minimal snapshot shape stored in anchors_snapshot JSONB
interface AnchorSnapshot {
  id: string;
  anchor_text: string;
  anchor_hash: string;
  page_number: number | null;
  pos_x: string | null;
  pos_y: string | null;
  pos_w: string | null;
  pos_h: string | null;
  page_end: number | null;
  pos_x_end: string | null;
  pos_y_end: string | null;
  visual_asset_id: string | null;
  document_order: number;
  is_broken: boolean;
}

@Injectable()
export class DocumentVersionService implements OnModuleDestroy {
  private readonly logger = new Logger(DocumentVersionService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getVersionHistory(mediaAssetId: string, authCtx: TenantContext): Promise<DocumentVersionRow[]> {
    const rows = await withTenantContext(this.db, authCtx, (tx) =>
      tx
        .select()
        .from(schema.documentVersions)
        .where(eq(schema.documentVersions.media_asset_id, mediaAssetId))
        .orderBy(desc(schema.documentVersions.version_number))
    );
    return rows.map((r) => this.mapVersion(r));
  }

  async createVersion(
    mediaAssetId: string,
    summary: string | null,
    authCtx: TenantContext
  ): Promise<DocumentVersionRow> {
    // 1. Load current active anchors
    const anchors = await withTenantContext(this.db, authCtx, (tx) =>
      tx
        .select()
        .from(schema.visualAnchors)
        .where(
          and(
            eq(schema.visualAnchors.media_asset_id, mediaAssetId),
            isNull(schema.visualAnchors.deleted_at)
          )
        )
    );

    // 2. Calculate next version number
    const existingVersions = await withTenantContext(this.db, authCtx, (tx) =>
      tx
        .select({ versionNumber: schema.documentVersions.version_number })
        .from(schema.documentVersions)
        .where(eq(schema.documentVersions.media_asset_id, mediaAssetId))
        .orderBy(desc(schema.documentVersions.version_number))
    );
    const nextVersion = (existingVersions[0]?.versionNumber ?? 0) + 1;

    // 3. Build snapshot array
    const snapshot: AnchorSnapshot[] = anchors.map((a) => ({
      id: a.id,
      anchor_text: a.anchor_text,
      anchor_hash: a.anchor_hash,
      page_number: a.page_number ?? null,
      pos_x: a.pos_x ?? null,
      pos_y: a.pos_y ?? null,
      pos_w: a.pos_w ?? null,
      pos_h: a.pos_h ?? null,
      page_end: a.page_end ?? null,
      pos_x_end: a.pos_x_end ?? null,
      pos_y_end: a.pos_y_end ?? null,
      visual_asset_id: a.visual_asset_id ?? null,
      document_order: a.document_order,
      is_broken: a.is_broken,
    }));

    // 4. Compute diff summary vs previous version
    const prevVersion = existingVersions[0];
    let diffSummary: string | null = summary ?? null;
    if (prevVersion && !diffSummary) {
      const prevRow = await withTenantContext(this.db, authCtx, (tx) =>
        tx
          .select()
          .from(schema.documentVersions)
          .where(eq(schema.documentVersions.id, (prevVersion as unknown as { id: string }).id ?? ''))
      );
      if (prevRow[0]) {
        const prevSnap = (prevRow[0].anchors_snapshot ?? []) as AnchorSnapshot[];
        const added = snapshot.length - prevSnap.length;
        diffSummary = added >= 0
          ? `+${added} anchors added`
          : `${Math.abs(added)} anchors removed`;
      }
    }

    // 5. Count broken anchors
    const brokenCount = anchors.filter((a) => a.is_broken).length;

    // 6. Insert version record
    const [version] = await withTenantContext(this.db, authCtx, (tx) =>
      tx
        .insert(schema.documentVersions)
        .values({
          id: randomUUID(),
          tenant_id: authCtx.tenantId,
          media_asset_id: mediaAssetId,
          version_number: nextVersion,
          created_by: authCtx.userId,
          anchors_snapshot: snapshot,
          diff_summary: diffSummary,
          broken_anchors: anchors.filter((a) => a.is_broken).map((a) => a.id),
          ai_suggestions: null,
        })
        .returning()
    );

    if (!version) throw new Error('Failed to create document version');

    this.logger.log(
      `[DocumentVersionService] Created version=${nextVersion} mediaAssetId=${mediaAssetId} tenantId=${authCtx.tenantId}`
    );

    return {
      ...this.mapVersion(version),
      anchorCount: snapshot.length,
      brokenAnchorCount: brokenCount,
    };
  }

  async rollbackToVersion(versionId: string, authCtx: TenantContext): Promise<boolean> {
    const allowedRoles: TenantContext['userRole'][] = ['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(authCtx.userRole)) {
      this.logger.warn(
        `[DocumentVersionService] rollbackToVersion denied: userId=${authCtx.userId} role=${authCtx.userRole}`
      );
      throw new ForbiddenException('Only instructors and admins can roll back document versions');
    }
    // 1. Load the target version
    const [versionRow] = await withTenantContext(this.db, authCtx, (tx) =>
      tx
        .select()
        .from(schema.documentVersions)
        .where(eq(schema.documentVersions.id, versionId))
    );

    if (!versionRow) {
      throw new NotFoundException(`Document version ${versionId} not found`);
    }

    const snapshot = (versionRow.anchors_snapshot ?? []) as AnchorSnapshot[];
    const mediaAssetId = versionRow.media_asset_id;

    // 2. Soft-delete all current active anchors for this document
    await withTenantContext(this.db, authCtx, (tx) =>
      tx
        .update(schema.visualAnchors)
        .set({ deleted_at: new Date() } as never)
        .where(
          and(
            eq(schema.visualAnchors.media_asset_id, mediaAssetId),
            isNull(schema.visualAnchors.deleted_at)
          )
        )
    );

    // 3. Re-insert anchors from snapshot
    if (snapshot.length > 0) {
      await withTenantContext(this.db, authCtx, (tx) =>
        tx
          .insert(schema.visualAnchors)
          .values(
            snapshot.map((s) => ({
              id: randomUUID(), // new UUIDs
              tenant_id: authCtx.tenantId,
              media_asset_id: mediaAssetId,
              created_by: authCtx.userId,
              anchor_text: s.anchor_text,
              anchor_hash: s.anchor_hash,
              page_number: s.page_number,
              pos_x: s.pos_x,
              pos_y: s.pos_y,
              pos_w: s.pos_w,
              pos_h: s.pos_h,
              page_end: s.page_end,
              pos_x_end: s.pos_x_end,
              pos_y_end: s.pos_y_end,
              visual_asset_id: s.visual_asset_id,
              document_order: s.document_order,
              is_broken: false, // reset broken flag on rollback
            }))
          )
      );
    }

    this.logger.log(
      `[DocumentVersionService] Rolled back to version=${versionRow.version_number} mediaAssetId=${mediaAssetId} tenantId=${authCtx.tenantId} anchorCount=${snapshot.length}`
    );
    return true;
  }

  private mapVersion(r: typeof schema.documentVersions.$inferSelect): DocumentVersionRow {
    const snapshot = (r.anchors_snapshot ?? []) as AnchorSnapshot[];
    const broken = (r.broken_anchors ?? []) as string[];
    return {
      id: r.id,
      mediaAssetId: r.media_asset_id,
      versionNumber: r.version_number,
      createdBy: r.created_by ?? null,
      anchorCount: snapshot.length,
      brokenAnchorCount: broken.length,
      diffSummary: r.diff_summary ?? null,
      aiSuggestions: r.ai_suggestions ?? null,
      createdAt: r.created_at.toISOString(),
    };
  }
}
