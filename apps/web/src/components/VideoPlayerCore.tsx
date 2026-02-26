/**
 * VideoPlayerCore — production-grade HLS video player.
 *
 * Features:
 *  - HLS adaptive streaming via hls.js (Chrome/Firefox/Edge)
 *  - Safari native HLS fallback
 *  - Quality selector (Auto / 360p / 720p / 1080p)
 *  - Playback speed selector (0.5× – 2×)
 *  - Keyboard shortcuts: Space=play/pause, ←/→=seek 5s, F=fullscreen, M=mute
 *  - Picture-in-Picture support
 *  - Bookmark markers on seek bar
 *  - Exposes currentTime via onTimeUpdate for transcript sync
 *  - Accepts seekTo prop for transcript-click seek
 *
 * Memory safety: HLS instance destroyed on unmount + src change.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls, { type Level } from 'hls.js';
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
import type { Bookmark } from '@/lib/mock-content-data';

interface VideoPlayerCoreProps {
  /** Direct URL for the original video file (fallback when HLS unavailable). */
  src: string;
  /** HLS master manifest URL (.m3u8). Preferred over src when present. */
  hlsSrc?: string | null;
  /** Bookmark markers to display on the seek bar. */
  bookmarks?: Bookmark[];
  /**
   * Controlled seek target in seconds.
   * Change this value to seek the player externally (e.g. transcript click).
   * Uses the numeric value as trigger — same value twice has no effect.
   */
  seekTo?: number;
  /** Called on every timeupdate event; use to sync transcript panel. */
  onTimeUpdate?: (currentTime: number) => void;
  /** Called once when video metadata is loaded (total duration). */
  onDurationChange?: (duration: number) => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
type SpeedOption = (typeof SPEED_OPTIONS)[number];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoPlayerCore({
  src,
  hlsSrc,
  bookmarks = [],
  seekTo,
  onTimeUpdate,
  onDurationChange,
}: VideoPlayerCoreProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speed, setSpeed] = useState<SpeedOption>(1);
  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = Auto

  // ── HLS initialisation ──────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setLevels([]);
    setCurrentLevel(-1);

    const effectiveUrl = hlsSrc ?? src;
    const isHlsUrl = effectiveUrl.includes('.m3u8');

    if (isHlsUrl && Hls.isSupported()) {
      const hls = new Hls({ startLevel: -1 });
      hls.loadSource(effectiveUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setLevels(data.levels);
      });
      hlsRef.current = hls;
    } else if (isHlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = effectiveUrl; // Safari native HLS
    } else {
      video.src = src;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src, hlsSrc]);

  // ── External seek (transcript click) ───────────────────────────────────────
  useEffect(() => {
    if (seekTo !== undefined && videoRef.current) {
      videoRef.current.currentTime = seekTo;
      setCurrentTime(seekTo);
    }
  }, [seekTo]);

  // ── Playback speed ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  // ── Fullscreen change tracking ──────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          if (videoRef.current)
            videoRef.current.currentTime = Math.max(
              0,
              videoRef.current.currentTime - 5
            );
          break;
        case 'ArrowRight':
          if (videoRef.current)
            videoRef.current.currentTime = Math.min(
              duration,
              videoRef.current.currentTime + 5
            );
          break;
        case 'KeyF':
          if (!document.fullscreenElement) {
            void containerRef.current?.requestFullscreen();
          } else {
            void document.exitFullscreen();
          }
          break;
        case 'KeyM':
          if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [duration, togglePlay]);

  // ── Quality level change ────────────────────────────────────────────────────
  const selectLevel = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentLevel(level);
    }
  };

  // ── Helpers for quality label ───────────────────────────────────────────────
  const qualityLabel = (level: number): string => {
    if (level === -1) return 'Auto';
    const l = levels[level];
    if (!l) return `${level + 1}`;
    if (l.height >= 1080) return '1080p';
    if (l.height >= 720) return '720p';
    if (l.height >= 480) return '480p';
    if (l.height >= 360) return '360p';
    return `${l.height}p`;
  };

  // ── Seek bar click ──────────────────────────────────────────────────────────
  const handleSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const t = frac * duration;
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden group select-none"
      data-testid="video-player-core"
    >
      <video
        ref={videoRef}
        className="w-full aspect-video"
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setCurrentTime(t);
          onTimeUpdate?.(t);
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          setDuration(d);
          onDurationChange?.(d);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Gradient overlay + controls (show on hover / when paused) */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent',
          'p-3 transition-opacity duration-200',
          isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
        )}
      >
        {/* Seek bar */}
        <div
          className="relative h-1.5 bg-white/30 rounded-full cursor-pointer mb-3"
          onClick={handleSeekBarClick}
          role="slider"
          aria-label="Seek"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={duration}
        >
          <div
            className="h-full bg-primary rounded-full"
            style={{
              width: `${duration ? (currentTime / duration) * 100 : 0}%`,
            }}
          />
          {/* Bookmark markers */}
          {bookmarks.map((bm) => (
            <div
              key={bm.id}
              className="absolute top-0 h-full w-0.5 rounded-full cursor-pointer"
              style={{
                left: `${(bm.timestamp / duration) * 100}%`,
                backgroundColor: bm.color ?? '#3b82f6',
              }}
              title={bm.label}
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current)
                  videoRef.current.currentTime = bm.timestamp;
              }}
            />
          ))}
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2 text-white">
          {/* Play/Pause */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          {/* Mute */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => {
              if (!videoRef.current) return;
              const newMuted = !isMuted;
              videoRef.current.muted = newMuted;
              setIsMuted(newMuted);
            }}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>

          {/* Volume slider */}
          <div className="w-20 hidden sm:block">
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.05}
              onValueChange={([v = 1]) => {
                setVolume(v);
                setIsMuted(v === 0);
                if (videoRef.current) {
                  videoRef.current.volume = v;
                  videoRef.current.muted = v === 0;
                }
              }}
              className="cursor-pointer"
            />
          </div>

          {/* Timestamp */}
          <span className="text-xs font-mono ml-1 tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Speed selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-xs font-mono px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 min-w-[3rem] text-center flex items-center gap-0.5">
                {speed}×
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SPEED_OPTIONS.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(speed === s && 'font-semibold text-primary')}
                >
                  {s}×
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quality selector (only when HLS levels available) */}
          {levels.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-xs px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 min-w-[3.5rem] text-center flex items-center gap-0.5">
                  {qualityLabel(currentLevel)}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => selectLevel(-1)}
                  className={cn(
                    currentLevel === -1 && 'font-semibold text-primary'
                  )}
                >
                  Auto
                </DropdownMenuItem>
                {levels.map((_, idx) => (
                  <DropdownMenuItem
                    key={idx}
                    onClick={() => selectLevel(idx)}
                    className={cn(
                      currentLevel === idx && 'font-semibold text-primary'
                    )}
                  >
                    {qualityLabel(idx)}
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
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={() => {
                if (document.pictureInPictureElement) {
                  void document.exitPictureInPicture();
                } else {
                  void videoRef.current?.requestPictureInPicture();
                }
              }}
              aria-label="Picture in Picture"
            >
              <PictureInPicture2 className="h-4 w-4" />
            </Button>
          )}

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => {
              if (!document.fullscreenElement) {
                void containerRef.current?.requestFullscreen();
              } else {
                void document.exitFullscreen();
              }
            }}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
