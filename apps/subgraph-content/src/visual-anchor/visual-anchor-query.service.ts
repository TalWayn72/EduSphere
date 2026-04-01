/**
 * Read-only queries for visual anchors and visual assets.
 * Extracted from VisualAnchorService for file-size compliance.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  isNull,
  asc,
  type TenantContext,
} from '@edusphere/db';
import { withTenantContext } from '@edusphere/db';
import { minioConfig } from '@edusphere/config';
import type {
  VisualAnchorRow,
  VisualAssetSearchResult,
} from './visual-anchor.types.js';
import type { VisualAssetRow } from './visual-asset-upload.helper';

const PRESIGNED_URL_EXPIRY_SECONDS = 900;

@Injectable()
export class VisualAnchorQueryService implements OnModuleDestroy {
  private readonly logger = new Logger(VisualAnchorQueryService.name);
  readonly db = createDatabaseConnection();
  readonly s3: S3Client;
  readonly bucket: string;

  constructor() {
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

  async findAllByMediaAsset(
    mediaAssetId: string,
    authCtx: TenantContext
  ): Promise<VisualAnchorRow[]> {
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

  async findAllAssetsByCourse(
    courseId: string,
    authCtx: TenantContext
  ): Promise<VisualAssetRow[]> {
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

  async searchVisualAssets(
    courseId: string,
    query: string,
    authCtx: TenantContext
  ): Promise<VisualAssetSearchResult[]> {
    const rows = await withTenantContext(this.db, authCtx, (tx) =>
      tx
        .select({
          id: schema.visualAssets.id,
          filename: schema.visualAssets.filename,
          original_name: schema.visualAssets.original_name,
          storage_key: schema.visualAssets.storage_key,
          mime_type: schema.visualAssets.mime_type,
          size_bytes: schema.visualAssets.size_bytes,
          webp_key: schema.visualAssets.webp_key,
          metadata: schema.visualAssets.metadata,
          created_at: schema.visualAssets.created_at,
          scan_status: schema.visualAssets.scan_status,
        })
        .from(schema.visualAssets)
        .where(
          and(
            eq(schema.visualAssets.course_id, courseId),
            isNull(schema.visualAssets.deleted_at),
            eq(schema.visualAssets.scan_status, 'CLEAN' as const)
          )
        )
        .limit(20)
    );

    const q = query.toLowerCase();
    const matched = rows.filter((r) =>
      r.original_name.toLowerCase().includes(q)
    );

    return matched.map((r) => ({
      asset: {
        id: r.id,
        courseId,
        filename: r.original_name,
        mimeType: r.mime_type,
        sizeBytes: Number(r.size_bytes),
        storageUrl: '',
        webpUrl: null,
        scanStatus: r.scan_status,
        metadata: r.metadata as Record<string, unknown>,
        createdAt: r.created_at.toISOString(),
      },
      anchorText: null,
      thumbnailUrl: null,
    }));
  }

  // ── Mappers ──────────────────────────────────────────────────────────────

  mapAnchor(r: typeof schema.visualAnchors.$inferSelect): VisualAnchorRow {
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

  async mapAsset(
    r: typeof schema.visualAssets.$inferSelect
  ): Promise<VisualAssetRow> {
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
      this.logger.warn(
        `[VisualAnchorQueryService] Could not generate presigned URL for asset ${r.id}`
      );
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
