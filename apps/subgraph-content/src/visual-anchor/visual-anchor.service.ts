import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { connect, StringCodec } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import {
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  withTenantContext,
  eq,
  and,
  isNull,
  asc,
  type TenantContext,
} from '@edusphere/db';
import { minioConfig } from '@edusphere/config';
import { ClamavService } from '../clamav/clamav.service';
import { ImageOptimizerService } from '../image-optimizer/image-optimizer.service';
import {
  CreateVisualAnchorSchema,
  UpdateVisualAnchorSchema,
  type CreateVisualAnchorDto,
  type UpdateVisualAnchorDto,
} from './visual-anchor.schemas';
import { computeSimhash } from './simhash.util';
import { runVisualAssetUploadPipeline, type VisualAssetRow } from './visual-asset-upload.helper';

const PRESIGNED_URL_EXPIRY_SECONDS = 900;

export type { VisualAssetRow };

export interface VisualAnchorRow {
  id: string;
  mediaAssetId: string;
  anchorText: string;
  pageNumber: number | null;
  posX: string | null;
  posY: string | null;
  posW: string | null;
  posH: string | null;
  pageEnd: number | null;
  posXEnd: string | null;
  posYEnd: string | null;
  visualAssetId: string | null;
  visualAsset: VisualAssetRow | null;
  documentOrder: number;
  isBroken: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SyncResult {
  synced: number;
  broken: number;
}

@Injectable()
export class VisualAnchorService implements OnModuleDestroy {
  private readonly logger = new Logger(VisualAnchorService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly clamav: ClamavService,
    private readonly imageOptimizer: ImageOptimizerService
  ) {
    this.bucket = minioConfig.bucket;
    this.s3 = new S3Client({
      endpoint: `http://${minioConfig.endpoint}:${minioConfig.port}`,
      region: minioConfig.region,
      credentials: {
        accessKeyId: minioConfig.accessKey,
        secretAccessKey: minioConfig.secretKey,
      },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  async findAllByMediaAsset(mediaAssetId: string, authCtx: TenantContext): Promise<VisualAnchorRow[]> {
    const rows = await withTenantContext(this.db, authCtx, (tx) =>
      tx
        .select()
        .from(schema.visualAnchors)
        .where(
          and(
            eq(schema.visualAnchors.media_asset_id, mediaAssetId),
            isNull(schema.visualAnchors.deleted_at)
          )
        )
        .orderBy(asc(schema.visualAnchors.document_order))
    );
    return rows.map((r) => this.mapAnchor(r));
  }

  async findAllAssetsByCourse(courseId: string, authCtx: TenantContext): Promise<VisualAssetRow[]> {
    const rows = await withTenantContext(this.db, authCtx, (tx) =>
      tx
        .select()
        .from(schema.visualAssets)
        .where(
          and(
            eq(schema.visualAssets.course_id, courseId),
            isNull(schema.visualAssets.deleted_at)
          )
        )
    );
    return Promise.all(rows.map((r) => this.mapAsset(r)));
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  async createAnchor(rawInput: unknown, authCtx: TenantContext): Promise<VisualAnchorRow> {
    const input = CreateVisualAnchorSchema.parse(rawInput) as CreateVisualAnchorDto;
    const anchorHash = computeSimhash(input.anchorText);

    const [row] = await withTenantContext(this.db, authCtx, (tx) =>
      tx
        .insert(schema.visualAnchors)
        .values({
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
        })
        .returning()
    );

    if (!row) throw new Error('Insert failed');

    await this.publishNats('EDUSPHERE.visual.anchor.created', {
      anchorId: row.id,
      mediaAssetId: input.mediaAssetId,
      tenantId: authCtx.tenantId,
    });

    this.logger.log(`[VisualAnchorService] Created anchor: id=${row.id} tenantId=${authCtx.tenantId}`);
    return this.mapAnchor(row);
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

    const [updated] = await withTenantContext(this.db, authCtx, (tx) =>
      tx
        .update(schema.visualAnchors)
        .set(setValues as never)
        .where(and(eq(schema.visualAnchors.id, id), isNull(schema.visualAnchors.deleted_at)))
        .returning()
    );

    if (!updated) throw new NotFoundException(`Visual anchor ${id} not found`);
    this.logger.log(`[VisualAnchorService] Updated anchor: id=${id} tenantId=${authCtx.tenantId}`);
    return this.mapAnchor(updated);
  }

  async deleteAnchor(id: string, authCtx: TenantContext): Promise<boolean> {
    const [deleted] = await withTenantContext(this.db, authCtx, (tx) =>
      tx
        .update(schema.visualAnchors)
        .set({ deleted_at: new Date() } as never)
        .where(and(eq(schema.visualAnchors.id, id), isNull(schema.visualAnchors.deleted_at)))
        .returning({ id: schema.visualAnchors.id, media_asset_id: schema.visualAnchors.media_asset_id })
    );

    if (!deleted) throw new NotFoundException(`Visual anchor ${id} not found`);

    await this.publishNats('EDUSPHERE.visual.anchor.deleted', {
      anchorId: id,
      mediaAssetId: deleted.media_asset_id,
      tenantId: authCtx.tenantId,
    });

    this.logger.log(`[VisualAnchorService] Deleted anchor: id=${id} tenantId=${authCtx.tenantId}`);
    return true;
  }

  async assignAsset(anchorId: string, visualAssetId: string, authCtx: TenantContext): Promise<VisualAnchorRow> {
    // Load anchor to get its media_asset_id for course-id derivation
    const [anchor] = await withTenantContext(this.db, authCtx, (tx) =>
      tx
        .select()
        .from(schema.visualAnchors)
        .where(and(eq(schema.visualAnchors.id, anchorId), isNull(schema.visualAnchors.deleted_at)))
    );
    if (!anchor) throw new NotFoundException(`Visual anchor ${anchorId} not found`);

    // Load the media_asset to get its course_id
    const [mediaAsset] = await withTenantContext(this.db, authCtx, (tx) =>
      tx
        .select({ course_id: schema.media_assets.course_id })
        .from(schema.media_assets)
        .where(eq(schema.media_assets.id, anchor.media_asset_id))
    );
    if (!mediaAsset) throw new NotFoundException(`Media asset ${anchor.media_asset_id} not found`);

    // Load visual asset to verify same-course ownership
    const [asset] = await withTenantContext(this.db, authCtx, (tx) =>
      tx
        .select({ course_id: schema.visualAssets.course_id })
        .from(schema.visualAssets)
        .where(and(eq(schema.visualAssets.id, visualAssetId), isNull(schema.visualAssets.deleted_at)))
    );
    if (!asset) throw new NotFoundException(`Visual asset ${visualAssetId} not found`);

    // Cross-course assignment guard (SI-9)
    if (asset.course_id !== mediaAsset.course_id) {
      this.logger.warn(
        `[VisualAnchorService] Cross-course assignment blocked: anchorId=${anchorId} assetId=${visualAssetId} tenantId=${authCtx.tenantId}`
      );
      throw new BadRequestException('Asset and anchor must belong to the same course');
    }

    const [updated] = await withTenantContext(this.db, authCtx, (tx) =>
      tx
        .update(schema.visualAnchors)
        .set({ visual_asset_id: visualAssetId } as never)
        .where(and(eq(schema.visualAnchors.id, anchorId), isNull(schema.visualAnchors.deleted_at)))
        .returning()
    );
    if (!updated) throw new NotFoundException(`Visual anchor ${anchorId} not found`);
    return this.mapAnchor(updated);
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

    for (const anchor of anchors) {
      // Placeholder: mark as broken if simhash is all-zeros (empty/whitespace text)
      const hash = computeSimhash(anchor.anchorText);
      const isBroken = hash === '0000000000000000';

      await withTenantContext(this.db, authCtx, (tx) =>
        tx
          .update(schema.visualAnchors)
          .set({ is_broken: isBroken } as never)
          .where(eq(schema.visualAnchors.id, anchor.id))
      );

      if (isBroken) broken++;
      else synced++;
    }

    this.logger.log(`[VisualAnchorService] syncAnchors: mediaAssetId=${mediaAssetId} synced=${synced} broken=${broken}`);
    return { synced, broken };
  }

  async confirmVisualAssetUpload(
    fileKey: string,
    courseId: string,
    originalName: string,
    declaredMimeType: string,
    declaredSize: number,
    authCtx: TenantContext
  ): Promise<VisualAssetRow> {
    return runVisualAssetUploadPipeline({
      fileKey,
      courseId,
      originalName,
      declaredMimeType,
      declaredSize,
      authCtx,
      db: this.db,
      s3: this.s3,
      bucket: this.bucket,
      clamav: this.clamav,
      imageOptimizer: this.imageOptimizer,
      logger: this.logger,
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

  private mapAnchor(r: typeof schema.visualAnchors.$inferSelect): VisualAnchorRow {
    return {
      id: r.id,
      mediaAssetId: r.media_asset_id,
      anchorText: r.anchor_text,
      pageNumber: r.page_number ?? null,
      posX: r.pos_x ?? null,
      posY: r.pos_y ?? null,
      posW: r.pos_w ?? null,
      posH: r.pos_h ?? null,
      pageEnd: r.page_end ?? null,
      posXEnd: r.pos_x_end ?? null,
      posYEnd: r.pos_y_end ?? null,
      visualAssetId: r.visual_asset_id ?? null,
      visualAsset: null,
      documentOrder: r.document_order,
      isBroken: r.is_broken,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    };
  }

  private async mapAsset(r: typeof schema.visualAssets.$inferSelect): Promise<VisualAssetRow> {
    let storageUrl = '';
    let webpUrl: string | null = null;
    try {
      storageUrl = await getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: r.storage_key }),
        { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS }
      );
      if (r.webp_key) {
        webpUrl = await getSignedUrl(
          this.s3,
          new GetObjectCommand({ Bucket: this.bucket, Key: r.webp_key }),
          { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS }
        );
      }
    } catch {
      this.logger.warn(`[VisualAnchorService] Could not generate presigned URL for asset ${r.id}`);
    }
    return {
      id: r.id,
      courseId: r.course_id,
      filename: r.original_name,
      mimeType: r.mime_type,
      sizeBytes: Number(r.size_bytes),
      storageUrl,
      webpUrl,
      scanStatus: r.scan_status,
      metadata: r.metadata as Record<string, unknown>,
      createdAt: r.created_at.toISOString(),
    };
  }
}
