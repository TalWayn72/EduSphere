import React from 'react';
import type { Level } from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  VideoSubtitleSelector,
  type SubtitleTrack,
} from '../VideoSubtitleSelector';
import { SPEED_OPTIONS, formatTime } from './types';
import type { SpeedOption } from './types';

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  speed: SpeedOption;
  levels: Level[];
  currentLevel: number;
  activeSubtitle: string | null;
  subtitleTracks: SubtitleTrack[];
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
  onSpeedChange: (s: SpeedOption) => void;
  onSelectLevel: (level: number) => void;
  onQualityLabel: (level: number) => string;
  onTogglePip: () => void;
  onToggleFullscreen: () => void;
  onSubtitleChange: (id: string | null) => void;
}

export function VideoControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isFullscreen,
  speed,
  levels,
  currentLevel,
  activeSubtitle,
  subtitleTracks,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onSpeedChange,
  onSelectLevel,
  onQualityLabel,
  onTogglePip,
  onToggleFullscreen,
  onSubtitleChange,
}: VideoControlsProps) {
  return (
    <div className="flex items-center gap-2 text-white dark:text-white">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-white hover:bg-white/20 dark:text-white"
        onClick={onTogglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-white hover:bg-white/20 dark:text-white"
        onClick={onToggleMute}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>

      <div className="w-20 hidden sm:block">
        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.05}
          onValueChange={([v = 1]) => onVolumeChange(v)}
          className="cursor-pointer"
        />
      </div>

      <span className="text-xs font-mono ml-1 tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <div className="flex-1" />

      {/* Speed selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-xs font-mono px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 min-w-[3rem] text-center flex items-center gap-0.5">
            {speed}x
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {SPEED_OPTIONS.map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() => onSpeedChange(s)}
              className={cn(speed === s && 'font-semibold text-primary')}
            >
              {s}x
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quality selector */}
      {levels.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-xs px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 min-w-[3.5rem] text-center flex items-center gap-0.5">
              {onQualityLabel(currentLevel)}
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onSelectLevel(-1)}
              className={cn(
                currentLevel === -1 && 'font-semibold text-primary'
              )}
            >
              Auto
            </DropdownMenuItem>
            {levels.map((_, idx) => (
              <DropdownMenuItem
                key={idx}
                onClick={() => onSelectLevel(idx)}
                className={cn(
                  currentLevel === idx && 'font-semibold text-primary'
                )}
              >
                {onQualityLabel(idx)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Picture-in-Picture */}
      {'pictureInPictureEnabled' in document && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-white/20 dark:text-white"
          onClick={onTogglePip}
          aria-label="Picture in Picture"
        >
          <PictureInPicture2 className="h-4 w-4" />
        </Button>
      )}

      {/* Subtitles */}
      {subtitleTracks.length > 0 && (
        <VideoSubtitleSelector
          tracks={subtitleTracks}
          active={activeSubtitle}
          onChange={onSubtitleChange}
        />
      )}

      {/* Fullscreen */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-white hover:bg-white/20 dark:text-white"
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? (
          <Minimize className="h-4 w-4" />
        ) : (
          <Maximize className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
