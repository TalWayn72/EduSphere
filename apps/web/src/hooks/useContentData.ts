/**
 * useContentData — fetches and normalises a single content item.
 *
 * Falls back to mock video/transcript when the query errors or returns nothing
 * (e.g. gateway offline in local dev without VITE_DEV_MODE=true).
 *
 * YouTube detection: ContentItem with contentType === 'YOUTUBE' stores the
 * YouTube video ID in the `content` field. The supergraph ContentItem type does
 * NOT expose a mediaAsset field, so youtubeVideoId is derived from content
 * rather than mediaAsset.youtubeVideoId.
 */
import { useQuery } from 'urql';
import { CONTENT_ITEM_QUERY } from '@/lib/graphql/content.queries';
import { DEV_MODE } from '@/lib/auth';
import {
  mockVideo,
  mockTranscript,
  TranscriptSegment,
} from '@/lib/mock-content-data';

interface TranscriptSegmentRaw {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number | null;
  speakerId?: string | null;
}

/**
 * Shape returned by CONTENT_ITEM_QUERY.
 * NOTE: ContentItem in the supergraph schema does not have a mediaAsset field.
 * youtubeVideoId is derived from the `content` field when contentType is 'YOUTUBE'.
 */
interface ContentItemData {
  id: string;
  title: string;
  contentType?: string | null;
  /** For YOUTUBE items: stores the YouTube video ID. For others: lesson body/url. */
  content?: string | null;
  transcript?: { segments: TranscriptSegmentRaw[] } | null;
}

interface ContentQueryResult {
  contentItem?: ContentItemData | null;
}

export interface ContentData {
  videoUrl: string;
  /** HLS master manifest URL if adaptive streaming is available, otherwise null. */
  hlsManifestUrl: string | null;
  videoTitle: string;
  transcript: TranscriptSegment[];
  fetching: boolean;
  error: string | null;
  /** YouTube video ID when the content is a YouTube embed (enriched lesson). */
  youtubeVideoId: string | null;
  /** True when the content source is a YouTube embed rather than a hosted video. */
  isYouTubeContent: boolean;
}

export function useContentData(contentId: string): ContentData {
  const [result] = useQuery<ContentQueryResult>({
    query: CONTENT_ITEM_QUERY,
    variables: { id: contentId },
    pause: !contentId || DEV_MODE,
  });

  const item = result.data?.contentItem;
  const hasError = !!result.error && !item;

  // YouTube video ID is stored in the `content` field for YOUTUBE-type items.
  const youtubeVideoId =
    item?.contentType === 'YOUTUBE' && item.content ? item.content : null;
  const isYouTubeContent = !!youtubeVideoId;

  // For hosted video items, `content` may hold a direct URL; fall back to mock.
  const videoUrl =
    !isYouTubeContent && item?.content ? item.content : mockVideo.url;
  // HLS manifests are not yet surfaced on ContentItem — always null until schema is extended.
  const hlsManifestUrl: string | null = null;
  const videoTitle = item?.title ?? mockVideo.title;

  const transcript: TranscriptSegment[] =
    item?.transcript?.segments && item.transcript.segments.length > 0
      ? item.transcript.segments.map((s) => ({
          id: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          text: s.text,
        }))
      : mockTranscript;

  return {
    videoUrl,
    hlsManifestUrl,
    videoTitle,
    transcript,
    fetching: result.fetching,
    error: hasError
      ? (result.error?.message ?? 'Failed to load content')
      : null,
    youtubeVideoId,
    isYouTubeContent,
  };
}
