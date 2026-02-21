import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { join } from 'path';
import { mkdir, readdir, unlink, rmdir } from 'fs/promises';
import { createReadStream } from 'fs';
import { tmpdir } from 'os';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { lookup as mimeLookup } from 'mime-types';
import { randomUUID } from 'crypto';

export interface HlsResult {
  /** MinIO key for the .m3u8 master manifest */
  manifestKey: string;
  /** MinIO keys for all variant playlists + .ts segments */
  segmentKeys: string[];
  /** Total video duration in seconds (parsed from FFmpeg stderr) */
  duration: number;
}

const VIDEO_MIME_PREFIXES = ['video/'];
const HLS_SEGMENT_DURATION = 6; // seconds per segment
const PRESIGNED_EXPIRY_SECONDS = 3600; // 1 hour

@Injectable()
export class HlsService {
  private readonly logger = new Logger(HlsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    this.s3 = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT ?? 'http://localhost:9000',
      region: process.env.MINIO_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
      },
      forcePathStyle: true,
    });
    this.bucket = process.env.MINIO_BUCKET ?? 'edusphere-media';
    this.logger.log(
      `HlsService initialized: bucket=${this.bucket}`,
    );
  }

  /**
   * Transcodes a source video from MinIO into adaptive HLS (3 renditions)
   * and uploads all segments + manifests back to MinIO.
   *
   * Returns the master manifest key and list of all segment keys.
   * Skips silently (returns null) if the source file is not a video.
   */
  async transcodeToHls(
    sourceKey: string,
    outputPrefix: string,
  ): Promise<HlsResult | null> {
    const contentType = this.inferContentType(sourceKey);
    if (!VIDEO_MIME_PREFIXES.some((p) => contentType.startsWith(p))) {
      this.logger.debug(
        `Skipping HLS transcode for non-video asset: key=${sourceKey} type=${contentType}`,
      );
      return null;
    }

    const workDir = join(tmpdir(), `hls-${randomUUID()}`);
    let sourcePath: string | null = null;

    try {
      await mkdir(workDir, { recursive: true });
      sourcePath = join(workDir, 'source.mp4');

      // Step 1 – Download source from MinIO
      this.logger.log(`HLS: downloading source key=${sourceKey}`);
      await this.downloadFromMinIO(sourceKey, sourcePath);

      // Step 2 – Run FFmpeg (multi-rendition HLS)
      const outputDir = join(workDir, 'output');
      await mkdir(outputDir, { recursive: true });
      const duration = await this.runFFmpeg(sourcePath, outputDir);
      this.logger.log(
        `HLS: FFmpeg complete duration=${duration}s key=${sourceKey}`,
      );

      // Step 3 – Write master manifest
      const masterManifest = this.buildMasterManifest();
      const masterPath = join(outputDir, 'master.m3u8');
      const { writeFile } = await import('fs/promises');
      await writeFile(masterPath, masterManifest, 'utf-8');

      // Step 4 – Upload everything to MinIO
      const segmentKeys = await this.uploadDirectory(outputDir, outputPrefix);
      const manifestKey = `${outputPrefix}/master.m3u8`;

      this.logger.log(
        `HLS: uploaded ${segmentKeys.length} files; manifest=${manifestKey}`,
      );

      return { manifestKey, segmentKeys, duration };
    } finally {
      // Clean up temp directory regardless of success or failure
      await this.cleanupDir(workDir).catch((e) =>
        this.logger.warn(`HLS: failed to clean up workDir=${workDir}`, e),
      );
    }
  }

  /**
   * Returns a short-lived presigned URL for accessing the HLS master manifest.
   */
  async getManifestPresignedUrl(manifestKey: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: manifestKey,
    });
    return getSignedUrl(this.s3, command, {
      expiresIn: PRESIGNED_EXPIRY_SECONDS,
    });
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async downloadFromMinIO(
    key: string,
    destPath: string,
  ): Promise<void> {
    const { Body } = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!Body) {
      throw new Error(`Empty response body for MinIO key: ${key}`);
    }
    const { pipeline } = await import('stream/promises');
    const { createWriteStream } = await import('fs');
    await pipeline(Body as NodeJS.ReadableStream, createWriteStream(destPath));
  }

  /**
   * Spawns FFmpeg to produce 3 HLS renditions (720p, 480p, 360p).
   * Returns the detected video duration in seconds.
   * Rejects if FFmpeg exits with non-zero code.
   */
  private runFFmpeg(inputPath: string, outputDir: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const seg720 = join(outputDir, '720p_%04d.ts');
      const seg480 = join(outputDir, '480p_%04d.ts');
      const seg360 = join(outputDir, '360p_%04d.ts');

      const args = [
        '-y',
        '-i', inputPath,
        '-filter_complex',
        '[0:v]split=3[v1][v2][v3];' +
        '[v1]scale=w=1280:h=720[v1out];' +
        '[v2]scale=w=854:h=480[v2out];' +
        '[v3]scale=w=640:h=360[v3out]',
        // 720p
        '-map', '[v1out]', '-map', '0:a?',
        '-c:v:0', 'libx264', '-crf', '23', '-maxrate', '2500k', '-bufsize', '5000k',
        '-hls_time', String(HLS_SEGMENT_DURATION),
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', seg720,
        `${outputDir}/720p.m3u8`,
        // 480p
        '-map', '[v2out]', '-map', '0:a?',
        '-c:v:1', 'libx264', '-crf', '24', '-maxrate', '1500k', '-bufsize', '3000k',
        '-hls_time', String(HLS_SEGMENT_DURATION),
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', seg480,
        `${outputDir}/480p.m3u8`,
        // 360p
        '-map', '[v3out]', '-map', '0:a?',
        '-c:v:2', 'libx264', '-crf', '26', '-maxrate', '800k', '-bufsize', '1600k',
        '-hls_time', String(HLS_SEGMENT_DURATION),
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', seg360,
        `${outputDir}/360p.m3u8`,
      ];

      const ffmpeg = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

      let stderrBuf = '';
      ffmpeg.stderr?.on('data', (chunk: Buffer) => {
        stderrBuf += chunk.toString();
      });

      ffmpeg.on('error', (err) => {
        reject(new Error(`FFmpeg spawn error: ${err.message}`));
      });

      ffmpeg.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`FFmpeg exited with code ${code}:\n${stderrBuf}`);
          reject(new Error(`FFmpeg exited with code ${code}`));
          return;
        }
        const duration = this.parseDuration(stderrBuf);
        resolve(duration);
      });
    });
  }

  /**
   * Uploads every file inside localDir to s3Prefix/ in MinIO.
   * Returns the list of uploaded MinIO keys.
   */
  private async uploadDirectory(
    localDir: string,
    s3Prefix: string,
  ): Promise<string[]> {
    const files = await readdir(localDir);
    const uploadedKeys: string[] = [];

    await Promise.all(
      files.map(async (fileName) => {
        const localPath = join(localDir, fileName);
        const s3Key = `${s3Prefix}/${fileName}`;
        const contentType = this.inferContentType(fileName);

        const body = createReadStream(localPath);
        await this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: s3Key,
            Body: body,
            ContentType: contentType,
          }),
        );

        uploadedKeys.push(s3Key);
        this.logger.debug(`HLS: uploaded ${s3Key}`);
      }),
    );

    return uploadedKeys;
  }

  private buildMasterManifest(): string {
    return [
      '#EXTM3U',
      '#EXT-X-VERSION:3',
      '#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720',
      '720p.m3u8',
      '#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480',
      '480p.m3u8',
      '#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360',
      '360p.m3u8',
    ].join('\n') + '\n';
  }

  /** Parses "Duration: HH:MM:SS.ms" from FFmpeg stderr. Returns 0 if not found. */
  private parseDuration(stderr: string): number {
    const match = /Duration:\s+(\d+):(\d+):(\d+\.\d+)/.exec(stderr);
    if (!match) return 0;
    const [, h, m, s] = match;
    return Number(h) * 3600 + Number(m) * 60 + parseFloat(s ?? '0');
  }

  private inferContentType(fileName: string): string {
    return (mimeLookup(fileName) as string | false) || 'application/octet-stream';
  }

  private async cleanupDir(dir: string): Promise<void> {
    const files = await readdir(dir).catch(() => [] as string[]);
    await Promise.all(files.map((f) => unlink(join(dir, f)).catch(() => undefined)));
    await rmdir(dir).catch(() => undefined);
  }
}
