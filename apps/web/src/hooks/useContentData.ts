/**
 * useContentData — fetches and normalises a single content item.
 *
 * Falls back to mock video/transcript when the query errors or returns nothing
 * (e.g. gateway offline in local dev without VITE_DEV_MODE=true).
 *
 * TODO: Replace ContentQueryResult with the generated ContentItemQuery type
 * from @edusphere/graphql-types once the contentItem query in the supergraph
 * includes mediaAsset and transcript fields (tracked in OPEN_ISSUES.md).
 */
import { useQuery } from 'urql';
import { CONTENT_ITEM_QUERY } from '@/lib/graphql/content.queries';
import {
  mockVideo,
  mockTranscript,
  TranscriptSegment,
} from '@/lib/mock-content-data';

interface MediaAsset {
  id: string;
  url: string;
  duration?: number | null;
  thumbnailUrl?: string | null;
  hlsManifestUrl?: string | null;
}

interface TranscriptSegmentRaw {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number | null;
  speakerId?: string | null;
}

interface ContentItemData {
  id: string;
  title: string;
  description?: string | null;
  mediaAsset?: MediaAsset | null;
  transcript?: { segments: TranscriptSegmentRaw[] } | null;
}

// NOTE: The generated ContentItemQuery type does not include mediaAsset or
// transcript fields — those are not yet exposed in the supergraph schema.
// Keeping the local interface until the schema is updated.
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
}

export function useContentData(contentId: string): ContentData {
  // contentItem(id: ID!) is not yet exposed in the supergraph schema.
  // The query is paused to avoid HTTP 400 validation errors in the console.
  // The hook falls back to mock data below. Tracked in OPEN_ISSUES.md.
  const [result] = useQuery<ContentQueryResult>({
    query: CONTENT_ITEM_QUERY,
    variables: { id: contentId },
    pause: true,
  });

  const item = result.data?.contentItem;
  const hasError = !!result.error && !item;

  const videoUrl = item?.mediaAsset?.url ?? mockVideo.url;
  const hlsManifestUrl = item?.mediaAsset?.hlsManifestUrl ?? null;
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
  };
}
