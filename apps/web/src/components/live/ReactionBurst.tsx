/**
 * ReactionBurst — animated floating emoji overlay.
 * Each burst floats upward then fades. Random horizontal spread.
 * prefers-reduced-motion: renders a static count badge instead.
 * aria-hidden: purely decorative.
 */
import { useId } from 'react';
import type { LiveReactionBurst } from '@/types/live-session.types';

interface ReactionBurstProps {
  queue: LiveReactionBurst[];
}

/** Deterministic random-ish x offset from a burst key */
function xOffset(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  }
  return 10 + ((Math.abs(h) % 80));
}

export function ReactionBurst({ queue }: ReactionBurstProps) {
  const uid = useId();

  // Reduced-motion: show summary count badges
  const motionQuery =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  const reducedMotion = motionQuery?.matches ?? false;

  if (reducedMotion) {
    const totals: Record<string, number> = {};
    for (const b of queue) {
      totals[b.emoji] = (totals[b.emoji] ?? 0) + b.count;
    }
    return (
      <div className="pointer-events-none absolute bottom-16 inset-x-0 flex justify-center gap-2" aria-hidden="true">
        {Object.entries(totals).map(([emoji, count]) => (
          <span key={emoji} className="bg-black/50 dark:bg-black/70 text-white dark:text-white text-sm rounded-full px-2 py-0.5">
            {emoji} {count}
          </span>
        ))}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes live-float-up {
          0%   { transform: translateY(0)  scale(1);   opacity: 1; }
          80%  { transform: translateY(-80px) scale(1.2); opacity: 0.8; }
          100% { transform: translateY(-120px) scale(0.8); opacity: 0; }
        }
        .live-burst-emoji {
          animation: live-float-up 2s ease-out forwards;
          position: absolute;
          bottom: 64px;
          font-size: 1.75rem;
          line-height: 1;
          pointer-events: none;
        }
      `}</style>
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {queue.map((burst, idx) => {
          const key = `${burst.emoji}-${burst.burstAt}-${uid}-${idx}`;
          const left = xOffset(key);
          return (
            <span
              key={key}
              className="live-burst-emoji"
              style={{ left: `${left}%` }}
            >
              {burst.emoji}
            </span>
          );
        })}
      </div>
    </>
  );
}
