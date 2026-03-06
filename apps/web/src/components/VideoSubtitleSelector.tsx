/**
 * VideoSubtitleSelector — language picker dropdown for subtitle tracks.
 * Renders only when at least one subtitle track is available.
 */
import { useState } from 'react';
import { Captions } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SubtitleTrack {
  language: string;
  label: string;
  src: string;
}

const LANG_LABELS: Record<string, string> = {
  en: 'English',
  he: 'Hebrew',
  ar: 'Arabic',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  ru: 'Russian',
};

interface Props {
  tracks: SubtitleTrack[];
  active: string | null;
  onChange: (language: string | null) => void;
}

export function VideoSubtitleSelector({ tracks, active, onChange }: Props) {
  const [open, setOpen] = useState(false);

  if (tracks.length === 0) return null;

  const choose = (lang: string | null) => {
    onChange(lang);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        className={cn(
          'flex items-center justify-center rounded p-1 text-white hover:bg-white/20 transition-colors',
          active && 'text-indigo-400'
        )}
        onClick={() => setOpen((o) => !o)}
        aria-label="Subtitle language"
        aria-expanded={open}
        aria-haspopup="listbox"
        data-testid="subtitle-selector-btn"
      >
        <Captions className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Subtitle language"
          className="absolute bottom-full right-0 mb-1 min-w-[110px] rounded bg-black/90 py-1 shadow-lg"
          data-testid="subtitle-menu"
        >
          <button
            role="option"
            aria-selected={!active}
            className={cn(
              'block w-full px-3 py-1.5 text-left text-sm text-white hover:bg-white/10',
              !active && 'text-indigo-400 font-medium'
            )}
            onClick={() => choose(null)}
            data-testid="subtitle-lang-off"
          >
            Off
          </button>
          {tracks.map((track) => (
            <button
              key={track.language}
              role="option"
              aria-selected={active === track.language}
              className={cn(
                'block w-full px-3 py-1.5 text-left text-sm text-white hover:bg-white/10',
                active === track.language && 'text-indigo-400 font-medium'
              )}
              onClick={() => choose(track.language)}
              data-testid={`subtitle-lang-${track.language}`}
            >
              {track.label ||
                LANG_LABELS[track.language] ||
                track.language.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
