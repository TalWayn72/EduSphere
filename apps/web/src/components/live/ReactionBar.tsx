/**
 * ReactionBar — floating emoji reaction buttons.
 * 5 reaction emojis. 3-second cooldown enforced via store.
 * Sends sendLiveReaction mutation on click.
 */
import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useLiveSessionStore } from '@/stores/live-session.store';

const REACTIONS = ['👏', '❓', '💡', '🔥', '👍'] as const;

interface ReactionBarProps {
  onSend: (emoji: string) => Promise<void>;
  className?: string;
}

export function ReactionBar({ onSend, className }: ReactionBarProps) {
  const { reactionCooldown, setReactionCooldown } = useLiveSessionStore();

  const handleClick = useCallback(
    async (emoji: string) => {
      if (reactionCooldown) return;
      setReactionCooldown(true);
      await onSend(emoji);
      setTimeout(() => setReactionCooldown(false), 3000);
    },
    [reactionCooldown, setReactionCooldown, onSend]
  );

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-3 py-1.5 rounded-full',
        'bg-black/50 backdrop-blur-sm',
        className
      )}
      role="toolbar"
      aria-label="Send reaction"
    >
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => { void handleClick(emoji); }}
          disabled={reactionCooldown}
          className={cn(
            'text-xl leading-none p-1 rounded-full transition-transform',
            'hover:scale-125 active:scale-95',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-white'
          )}
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
