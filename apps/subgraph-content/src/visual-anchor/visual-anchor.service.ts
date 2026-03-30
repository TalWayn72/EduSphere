import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { connect, StringCodec } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import {
  schema,
  withTenantContext,
  eq,
  and,
  isNull,
  type TenantContext,
} from '@edusphere/db';
import { ClamavService } from '../clamav/clamav.service';
import { ImageOptimizerService } from '../image-optimizer/image-optimizer.service';
import {
  CreateVisualAnchorSchema,
  UpdateVisualAnchorSchema,
  type CreateVisualAnchorDto,
  type UpdateVisualAnchorDto,
} from './visual-anchor.schemas';
import { computeSimhash } from './simhash.util';
import { runVisualAssetUploadPipeline } from './visual-asset-upload.helper';
import { VisualAnchorQueryService } from './visual-anchor-query.service.js';
import type { VisualAnchorRow, SyncResult, VisualAssetSearchResult, VisualAssetRow } from './visual-anchor.types.js';

export type { VisualAnchorRow, SyncResult, VisualAssetSearchResult, VisualAssetRow };

@Injectable()
export class VisualAnchorService implements OnModuleDestroy {
  private readonly logger = new Logger(VisualAnchorService.name);
  private readonly sc = StringCodec();

  constructor(
    private readonly clamav: ClamavService,
    private readonly imageOptimizer: ImageOptimizerService,
    private readonly queryService: VisualAnchorQueryService
  ) {}

  async onModuleDestroy(): Promise<void> {
    // queryService handles its own pool cleanup via OnModuleDestroy
  }

  // ── Query delegates ──────────────────────────────────────────────────────

  findAllByMediaAsset(mediaAssetId: string, authCtx: TenantContext): Promise<VisualAnchorRow[]> {
    return this.queryService.findAllByMediaAsset(mediaAssetId, authCtx);
  }

  findAllAssetsByCourse(courseId: string, authCtx: TenantContext): Promise<VisualAssetRow[]> {
    return this.queryService.findAllAssetsByCourse(courseId, authCtx);
  }

  searchVisualAssets(courseId: string, query: string, authCtx: TenantContext): Promise<VisualAssetSearchResult[]> {
    return this.queryService.searchVisualAssets(courseId, query, authCtx);
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  async createAnchor(rawInput: unknown, authCtx: TenantContext): Promise<VisualAnchorRow> {
    const input = CreateVisualAnchorSchema.parse(rawInput) as CreateVisualAnchorDto;
    const anchorHash = computeSimhash(input.anchorText);
    const db = this.queryService.db;

    const [row] = await withTenantContext(db, authCtx, (tx) =>
      tx.insert(schema.visualAnchors).values({
        id: randomUUID(),
        tenant_id: authCtx.tenantId,
        media_asset_id: input.mediaAssetId,
        created_by: authCtx.userId,
        anchor_text: input.anchorText,
        anchor_hash: anchorHash,
        page_number: input.pageNumber ?? null,
        pos_x: input.posX?.toString() ?? null,
        pos_y: input.posY?.toString() ?? null,
        pos_w: input.posW?.toString() ?? null,
        pos_h: input.posH?.toString() ?? null,
        page_end: input.pageEnd ?? null,
        pos_x_end: input.posXEnd?.toString() ?? null,
        pos_y_end: input.posYEnd?.toString() ?? null,
        document_order: input.documentOrder,
        is_broken: false,
      }).returning()
    );
    if (!row) throw new InternalServerErrorException('Insert failed');

    await this.publishNats('EDUSPHERE.visual.anchor.created', {
      anchorId: row.id, mediaAssetId: input.mediaAssetId, tenantId: authCtx.tenantId,
    });
    this.logger.log(`[VisualAnchorService] Created anchor: id=${row.id} tenantId=${authCtx.tenantId}`);
    return this.queryService.mapAnchor(row);
  }

  async updateAnchor(id: string, rawInput: unknown, authCtx: TenantContext): Promise<VisualAnchorRow> {
    const input = UpdateVisualAnchorSchema.parse(rawInput) as UpdateVisualAnchorDto;
    const setValues: Record<string, unknown> = {};
    if (input.anchorText !== undefined) {
      setValues['anchor_text'] = input.anchorText;
      setValues['anchor_hash'] = computeSimhash(input.anchorText);
    }
    if (input.pageNumber !== undefined) setValues['page_number'] = input.pageNumber;
    if (input.posX !== undefined) setValues['pos_x'] = input.posX.toString();
    if (input.posY !== undefined) setValues['pos_y'] = input.posY.toString();
    if (input.posW !== undefined) setValues['pos_w'] = input.posW.toString();
    if (input.posH !== undefined) setValues['pos_h'] = input.posH.toString();
    if (input.pageEnd !== undefined) setValues['page_end'] = input.pageEnd;
    if (input.posXEnd !== undefined) setValues['pos_x_end'] = input.posXEnd.toString();
    if (input.posYEnd !== undefined) setValues['pos_y_end'] = input.posYEnd.toString();
    if (input.documentOrder !== undefined) setValues['document_order'] = input.documentOrder;

    const db = this.queryService.db;
    const [updated] = await withTenantContext(db, authCtx, (tx) =>
      tx.update(schema.visualAnchors).set(setValues as never)
        .where(and(eq(schema.visualAnchors.id, id), isNull(schema.visualAnchors.deleted_at)))
        .returning()
    );
    if (!updated) throw new NotFoundException(`Visual anchor ${id} not found`);
    this.logger.log(`[VisualAnchorService] Updated anchor: id=${id} tenantId=${authCtx.tenantId}`);
    return this.queryService.mapAnchor(updated);
  }

  async deleteAnchor(id: string, authCtx: TenantContext): Promise<boolean> {
    const db = this.queryService.db;
    const [deleted] = await withTenantContext(db, authCtx, (tx) =>
      tx.update(schema.visualAnchors).set({ deleted_at: new Date() } as never)
        .where(and(eq(schema.visualAnchors.id, id), isNull(schema.visualAnchors.deleted_at)))
        .returning({ id: schema.visualAnchors.id, media_asset_id: schema.visualAnchors.media_asset_id })
    );
    if (!deleted) throw new NotFoundException(`Visual anchor ${id} not found`);
    await this.publishNats('EDUSPHERE.visual.anchor.deleted', {
      anchorId: id, mediaAssetId: deleted.media_asset_id, tenantId: authCtx.tenantId,
    });
    this.logger.log(`[VisualAnchorService] Deleted anchor: id=${id} tenantId=${authCtx.tenantId}`);
    return true;
  }

  async assignAsset(anchorId: string, visualAssetId: string, authCtx: TenantContext): Promise<VisualAnchorRow> {
    const db = this.queryService.db;
    const [anchor] = await withTenantContext(db, authCtx, (tx) =>
      tx.select().from(schema.visualAnchors)
        .where(and(eq(schema.visualAnchors.id, anchorId), isNull(schema.visualAnchors.deleted_at)))
    );
    if (!anchor) throw new NotFoundException(`Visual anchor ${anchorId} not found`);
    const [mediaAsset] = await withTenantContext(db, authCtx, (tx) =>
      tx.select({ course_id: schema.media_assets.course_id }).from(schema.media_assets)
        .where(eq(schema.media_assets.id, anchor.media_asset_id))
    );
    if (!mediaAsset) throw new NotFoundException(`Media asset ${anchor.media_asset_id} not found`);
    const [asset] = await withTenantContext(db, authCtx, (tx) =>
      tx.select({ course_id: schema.visualAssets.course_id }).from(schema.visualAssets)
        .where(and(eq(schema.visualAssets.id, visualAssetId), isNull(schema.visualAssets.deleted_at)))
    );
    if (!asset) throw new NotFoundException(`Visual asset ${visualAssetId} not found`);
    if (asset.course_id !== mediaAsset.course_id) {
      this.logger.warn(`[VisualAnchorService] Cross-course assignment blocked: anchorId=${anchorId} assetId=${visualAssetId}`);
      throw new BadRequestException('Asset and anchor must belong to the same course');
    }
    const [updated] = await withTenantContext(db, authCtx, (tx) =>
      tx.update(schema.visualAnchors).set({ visual_asset_id: visualAssetId } as never)
        .where(and(eq(schema.visualAnchors.id, anchorId), isNull(schema.visualAnchors.deleted_at)))
        .returning()
    );
    if (!updated) throw new NotFoundException(`Visual anchor ${anchorId} not found`);
    return this.queryService.mapAnchor(updated);
  }

  async syncAnchors(mediaAssetId: string, authCtx: TenantContext): Promise<SyncResult> {
    const allowedRoles: TenantContext['userRole'][] = ['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(authCtx.userRole)) {
      this.logger.warn(`[VisualAnchorService] syncAnchors denied: userId=${authCtx.userId} role=${authCtx.userRole}`);
      throw new ForbiddenException('Only instructors and admins can sync anchors');
    }
    const anchors = await this.findAllByMediaAsset(mediaAssetId, authCtx);
    let broken = 0;
    let synced = 0;
    const db = this.queryService.db;
    for (const anchor of anchors) {
      const hash = computeSimhash(anchor.anchorText);
      const isBroken = hash === '0000000000000000';
      await withTenantContext(db, authCtx, (tx) =>
        tx.update(schema.visualAnchors).set({ is_broken: isBroken } as never)
          .where(eq(schema.visualAnchors.id, anchor.id))
      );
      if (isBroken) broken++;
      else synced++;
    }
    this.logger.log(`[VisualAnchorService] syncAnchors: mediaAssetId=${mediaAssetId} synced=${synced} broken=${broken}`);
    return { synced, broken };
  }

  async confirmVisualAssetUpload(
    fileKey: string, courseId: string, originalName: string,
    declaredMimeType: string, declaredSize: number, authCtx: TenantContext
  ): Promise<VisualAssetRow> {
    return runVisualAssetUploadPipeline({
      fileKey, courseId, originalName, declaredMimeType, declaredSize, authCtx,
      db: this.queryService.db, s3: this.queryService.s3,
      bucket: this.queryService.bucket,
      clamav: this.clamav, imageOptimizer: this.imageOptimizer, logger: this.logger,
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async publishNats(subject: string, payload: object): Promise<void> {
    let nc;
    try {
      nc = await connect(buildNatsOptions());
      nc.publish(subject, this.sc.encode(JSON.stringify(payload)));
      await nc.flush();
    } catch (err) {
      this.logger.error(`[VisualAnchorService] NATS publish failed for ${subject}: ${String(err)}`);
    } finally {
      if (nc) await nc.close().catch(() => undefined);
    }
  }
}
