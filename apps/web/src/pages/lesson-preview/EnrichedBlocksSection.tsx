/**
 * EnrichedBlocksSection — renders enriched lesson blocks (HEADING + TEXT)
 * with RTL support for Hebrew content.
 */
import type { EnrichedTranscriptBlock } from '@/components/enriched-transcript/enriched-transcript.types';

function getBlockText(block: EnrichedTranscriptBlock): string {
  const content = block.content as Record<string, unknown>;
  return (content['text'] as string) ?? '';
}

interface Props {
  blocks: EnrichedTranscriptBlock[];
}

export function EnrichedBlocksSection({ blocks }: Props) {
  const sorted = [...blocks].sort((a, b) => a.blockOrder - b.blockOrder);
  return (
    <section className="space-y-3" aria-labelledby="enriched-heading">
      <h2 id="enriched-heading" className="text-lg font-semibold">
        תוכן מועשר
      </h2>
      <div className="bg-card rounded-xl border p-4 space-y-3" dir="rtl">
        {sorted.map((block) => {
          if (block.blockType === 'HEADING') {
            return (
              <h3
                key={block.id}
                className="text-base font-bold text-foreground pt-2"
                data-block-id={block.id}
              >
                {getBlockText(block)}
              </h3>
            );
          }
          return (
            <p
              key={block.id}
              className="text-sm leading-relaxed text-foreground"
              data-block-id={block.id}
            >
              {getBlockText(block)}
            </p>
          );
        })}
      </div>
    </section>
  );
}

export function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <section className="mb-4" aria-label="סרטון YouTube">
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full rounded-xl"
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </section>
  );
}
