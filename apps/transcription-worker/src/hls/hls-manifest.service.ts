import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { join } from 'path';
import { readdir, unlink, rmdir } from 'fs/promises';
import { createReadStream } from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { lookup as mimeLookup } from 'mime-types';
import { minioConfig } from '@edusphere/config';

const HLS_SEGMENT_DURATION = 6;

/**
 * HLS manifest generation, FFmpeg transcoding, and S3 upload helpers.
 * Extracted from HlsService to keep each file under 300 lines.
 */
@Injectable()
export class HlsManifestService {
  private readonly logger = new Logger(HlsManifestService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    this.s3 = new S3Client({
      endpoint: minioConfig.endpoint,
      region: minioConfig.region,
      credentials: {
        accessKeyId: minioConfig.accessKey,
        secretAccessKey: minioConfig.secretKey,
      },
      forcePathStyle: true,
    });
    this.bucket = minioConfig.bucket;
  }

  /**
   * Spawns FFmpeg to produce 3 HLS renditions (720p, 480p, 360p).
   * Returns the detected video duration in seconds.
   */
  runFFmpeg(inputPath: string, outputDir: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const seg720 = join(outputDir, '720p_%04d.ts');
      const seg480 = join(outputDir, '480p_%04d.ts');
      const seg360 = join(outputDir, '360p_%04d.ts');

      const args = [
        '-y',
        '-i',
        inputPath,
        '-filter_complex',
        '[0:v]split=3[v1][v2][v3];' +
          '[v1]scale=w=1280:h=720[v1out];' +
          '[v2]scale=w=854:h=480[v2out];' +
          '[v3]scale=w=640:h=360[v3out]',
        '-map', '[v1out]', '-map', '0:a?',
        '-c:v:0', 'libx264', '-crf', '23',
        '-maxrate', '2500k', '-bufsize', '5000k',
        '-hls_time', String(HLS_SEGMENT_DURATION),
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', seg720,
        `${outputDir}/720p.m3u8`,
        '-map', '[v2out]', '-map', '0:a?',
        '-c:v:1', 'libx264', '-crf', '24',
        '-maxrate', '1500k', '-bufsize', '3000k',
        '-hls_time', String(HLS_SEGMENT_DURATION),
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', seg480,
        `${outputDir}/480p.m3u8`,
        '-map', '[v3out]', '-map', '0:a?',
        '-c:v:2', 'libx264', '-crf', '26',
        '-maxrate', '800k', '-bufsize', '1600k',
        '-hls_time', String(HLS_SEGMENT_DURATION),
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', seg360,
        `${outputDir}/360p.m3u8`,
      ];

      const ffmpeg = spawn('ffmpeg', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

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

  buildMasterManifest(): string {
    return (
      [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        '#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720',
        '720p.m3u8',
        '#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480',
        '480p.m3u8',
        '#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360',
        '360p.m3u8',
      ].join('\n') + '\n'
    );
  }

  async uploadDirectory(
    localDir: string,
    s3Prefix: string
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
          })
        );

        uploadedKeys.push(s3Key);
        this.logger.debug(`HLS: uploaded ${s3Key}`);
      })
    );

    return uploadedKeys;
  }

  /** Parses "Duration: HH:MM:SS.ms" from FFmpeg stderr. Returns 0 if not found. */
  parseDuration(stderr: string): number {
    const match = /Duration:\s+(\d+):(\d+):(\d+\.\d+)/.exec(stderr);
    if (!match) return 0;
    const [, h, m, s] = match;
    return Number(h) * 3600 + Number(m) * 60 + parseFloat(s ?? '0');
  }

  inferContentType(fileName: string): string {
    return (
      (mimeLookup(fileName) as string | false) || 'application/octet-stream'
    );
  }

  async cleanupDir(dir: string): Promise<void> {
    const files = await readdir(dir).catch(() => [] as string[]);
    await Promise.all(
      files.map((f) => unlink(join(dir, f)).catch(() => undefined))
    );
    await rmdir(dir).catch(() => undefined);
  }
}
