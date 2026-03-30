import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNotNull } from 'drizzle-orm';
import { createDatabaseConnection, schema } from '@edusphere/db';
import {
  extractContentTypeFromKey,
  LANG_LABELS,
  type MediaAssetResult,
} from './media-helpers';

/**
 * Handles media asset read/query operations:
 * subtitle tracks, HLS manifest URLs, alt-text updates.
 */
@Injectable()
export class MediaQueriesService {
  private readonly logger = new Logger(MediaQueriesService.name);
  private readonly db = createDatabaseConnection();

  /**
   * Returns available translated subtitle tracks for a media asset.
   * Only returns tracks where vtt_key is set (VTT file has been generated).
   */
  async getSubtitleTracks(
    assetId: string,
    downloadUrlFn: (key: string) => Promise<string>
  ): Promise<{ language: string; label: string; src: string }[]> {
    const transcripts = await this.db
      .select({
        language: schema.transcripts.language,
        vttKey: schema.transcripts.vtt_key,
      })
      .from(schema.transcripts)
      .where(
        and(
          eq(schema.transcripts.asset_id, assetId),
          isNotNull(schema.transcripts.vtt_key)
        )
      );

    const tracks: { language: string; label: string; src: string }[] = [];
    for (const t of transcripts) {
      if (!t.vttKey) continue;
      try {
        const src = await downloadUrlFn(t.vttKey);
        tracks.push({
          language: t.language,
          label: LANG_LABELS[t.language] ?? t.language.toUpperCase(),
          src,
        });
      } catch {
        this.logger.warn(
          `Could not generate VTT URL for assetId=${assetId} lang=${t.language}`
        );
      }
    }
    return tracks;
  }

  async updateAltText(
    mediaId: string,
    altText: string,
    tenantId: string,
    downloadUrlFn: (key: string) => Promise<string>
  ): Promise<MediaAssetResult> {
    const [updated] = await this.db
      .update(schema.media_assets)
      .set({ alt_text: altText })
      .where(eq(schema.media_assets.id, mediaId))
      .returning();
    if (!updated) {
      throw new NotFoundException('Media asset ' + mediaId + ' not found');
    }
    this.logger.log(
      'Alt-text updated: mediaId=' + mediaId + ' tenant=' + tenantId
    );
    let downloadUrl: string | null = null;
    try {
      downloadUrl = await downloadUrlFn(updated.file_url);
    } catch {
      this.logger.warn('Could not generate download URL for asset ' + mediaId);
    }
    const contentType = extractContentTypeFromKey(updated.file_url);
    return {
      id: updated.id,
      courseId: updated.course_id ?? '',
      fileKey: updated.file_url,
      title: updated.title,
      contentType,
      status: 'READY',
      downloadUrl,
      hlsManifestUrl: null,
      captionsUrl: null,
      altText: updated.alt_text ?? null,
    };
  }
}
