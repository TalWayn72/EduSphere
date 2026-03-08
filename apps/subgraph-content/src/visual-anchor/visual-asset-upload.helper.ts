/**
 * Visual asset upload pipeline helper.
 * Extracted from VisualAnchorService to keep file size manageable.
 * Handles: size-check → download → magic-bytes → ClamAV → WebP → re-upload → DB insert.
 */
import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import type { DrizzleDB, TenantContext } from '@edusphere/db';
import { schema, withTenantContext } from '@edusphere/db';
import type { ClamavService } from '../clamav/clamav.service';
import type { ImageOptimizerService } from '../image-optimizer/image-optimizer.service';

const MAX_VISUAL_ASSET_BYTES = 15 * 1024 * 1024; // 15 MB
const PRESIGNED_URL_EXPIRY_SECONDS = 900; // 15 min

// GIF and SVG do not produce a separate WebP version
const SKIP_WEBP_MIME = new Set(['image/gif', 'image/svg+xml']);

export interface VisualAssetRow {
  id: string;
  courseId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageUrl: string;
  webpUrl: string | null;
  scanStatus: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function runVisualAssetUploadPipeline(opts: {
  fileKey: string;
  courseId: string;
  originalName: string;
  declaredMimeType: string;
  declaredSize: number;
  authCtx: TenantContext;
  db: DrizzleDB;
  s3: S3Client;
  bucket: string;
  clamav: ClamavService;
  imageOptimizer: ImageOptimizerService;
  logger: Logger;
}): Promise<VisualAssetRow> {
  const { fileKey, courseId, originalName, declaredMimeType, declaredSize,
          authCtx, db, s3, bucket, clamav, imageOptimizer, logger } = opts;

  // 1. Declared size guard
  if (declaredSize > MAX_VISUAL_ASSET_BYTES) {
    throw new BadRequestException(
      `File too large. Maximum ${MAX_VISUAL_ASSET_BYTES / 1024 / 1024}MB for visual assets.`
    );
  }

  // 2. Download buffer from MinIO quarantine key
  let buffer: Buffer;
  try {
    const resp = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: fileKey }));
    if (!resp.Body) throw new Error('Empty response body');
    buffer = await streamToBuffer(resp.Body as NodeJS.ReadableStream);
  } catch (err) {
    logger.error(`[VisualAssetUpload] Failed to download quarantine file ${fileKey}: ${String(err)}`);
    throw new InternalServerErrorException('Failed to retrieve uploaded file.');
  }

  // 3. ZIP bomb check
  await imageOptimizer.checkZipBomb(buffer, declaredSize);

  // 4. Magic-byte MIME verification
  const actualMime = await imageOptimizer.verifyMagicBytes(buffer);

  // 5. ClamAV scan
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const scanResult = await clamav.scanBuffer(buffer, sanitizedName);

  if (scanResult.isInfected) {
    // Delete quarantine copy immediately (do not store infected file)
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: fileKey })).catch(() => undefined);
    logger.error(
      `[VisualAssetUpload] INFECTED upload rejected | tenantId=${authCtx.tenantId} userId=${authCtx.userId} filename=${sanitizedName} viruses=${scanResult.viruses.join(',')}`
    );
    throw new BadRequestException('Malicious file detected. Upload rejected.');
  }

  // 6. Extract dimensions
  const { width, height } = await imageOptimizer.extractDimensions(buffer);

  // 7. Convert to WebP (skipped for GIF/SVG)
  const webpBuffer = await imageOptimizer.optimizeToWebP(buffer, actualMime);
  const producesWebp = !SKIP_WEBP_MIME.has(actualMime) && webpBuffer !== buffer;

  // 8. Generate production storage keys
  const assetUuid = randomUUID();
  const productionKey = `${authCtx.tenantId}/${courseId}/visual-assets/${assetUuid}-${sanitizedName}`;
  const webpKey = producesWebp ? `${productionKey}.webp` : null;

  // 9. Upload original to production key
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: productionKey,
    Body: buffer,
    ContentType: actualMime,
    ContentLength: buffer.length,
  }));

  // 10. Upload WebP variant if produced
  if (webpKey && producesWebp) {
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: webpKey,
      Body: webpBuffer,
      ContentType: 'image/webp',
      ContentLength: webpBuffer.length,
    }));
  }

  // 11. Delete quarantine file (best-effort, non-fatal)
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: fileKey })).catch((err: unknown) => {
    logger.warn(`[VisualAssetUpload] Could not delete quarantine key ${fileKey}: ${String(err)}`);
  });

  // 12. Generate presigned read URLs
  const storageUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: productionKey }),
    { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS }
  );
  const webpUrl = webpKey
    ? await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: webpKey }),
        { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS }
      ).catch(() => null)
    : null;

  // 13. Insert into visual_assets (wrapped in withTenantContext for SI-9 compliance)
  const [asset] = await withTenantContext(db, authCtx, (tx) =>
    tx
      .insert(schema.visualAssets)
      .values({
        tenant_id: authCtx.tenantId,
        course_id: courseId,
        uploader_id: authCtx.userId,
        filename: productionKey,
        original_name: originalName,
        mime_type: declaredMimeType,
        size_bytes: buffer.length,
        storage_key: productionKey,
        webp_key: webpKey,
        scan_status: scanResult.hasError ? 'ERROR' : 'CLEAN',
        scan_verdict: null,
        metadata: { width, height, altText: null },
      })
      .returning()
  );

  if (!asset) {
    throw new InternalServerErrorException('Failed to save visual asset record.');
  }

  logger.log(
    `[VisualAssetUpload] Asset saved: id=${asset.id} tenantId=${authCtx.tenantId} courseId=${courseId} size=${buffer.length}`
  );

  return {
    id: asset.id,
    courseId: asset.course_id,
    filename: asset.original_name,
    mimeType: asset.mime_type,
    sizeBytes: Number(asset.size_bytes),
    storageUrl,
    webpUrl,
    scanStatus: asset.scan_status,
    metadata: asset.metadata as Record<string, unknown>,
    createdAt: asset.created_at.toISOString(),
  };
}
