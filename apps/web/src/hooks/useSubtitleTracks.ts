/**
 * useSubtitleTracks — fetches subtitle tracks for a given content item.
 * Falls back to empty array when the query errors or returns nothing.
 */
import { useQuery } from 'urql';
import { gql } from 'urql';
import type { SubtitleTrack } from '@/components/VideoSubtitleSelector';

const GET_SUBTITLE_TRACKS = gql`
  query GetSubtitleTracks($contentId: ID!) {
    contentItem(id: $contentId) {
      mediaAsset {
        subtitleTracks {
          language
          label
          src
        }
      }
    }
  }
`;

interface GetSubtitleTracksResult {
  contentItem?: {
    mediaAsset?: {
      subtitleTracks?: SubtitleTrack[];
    } | null;
  } | null;
}

export function useSubtitleTracks(contentId: string): SubtitleTrack[] {
  const [result] = useQuery<GetSubtitleTracksResult>({
    query: GET_SUBTITLE_TRACKS,
    variables: { contentId },
    pause: !contentId,
  });
  return result.data?.contentItem?.mediaAsset?.subtitleTracks ?? [];
}
