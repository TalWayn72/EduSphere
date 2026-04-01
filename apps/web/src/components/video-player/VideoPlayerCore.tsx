/**
 * VideoPlayerCore — production-grade HLS video player.
 *
 * Features:
 *  - HLS adaptive streaming via hls.js (Chrome/Firefox/Edge)
 *  - Safari native HLS fallback
 *  - Quality selector (Auto / 360p / 720p / 1080p)
 *  - Playback speed selector (0.5x - 2x)
 *  - Keyboard shortcuts: Space=play/pause, left/right=seek 5s, F=fullscreen, M=mute
 *  - Picture-in-Picture support
 *  - Bookmark markers on seek bar
 *  - Exposes currentTime via onTimeUpdate for transcript sync
 *  - Accepts seekTo prop for transcript-click seek
 *
 * Memory safety: HLS instance destroyed on unmount + src change.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import type { VideoPlayerCoreProps } from './types';
import { useVideoPlayer } from './useVideoPlayer';
import { VideoControls } from './VideoControls';

export function VideoPlayerCore({
  src,
  hlsSrc,
  bookmarks = [],
  seekTo,
  onTimeUpdate,
  onDurationChange,
  subtitleTracks = [],
}: VideoPlayerCoreProps) {
  const player = useVideoPlayer({
    src,
    hlsSrc,
    seekTo,
    onTimeUpdate,
    onDurationChange,
  });

  return (
    <div
      ref={player.containerRef}
      className="relative bg-black rounded-lg overflow-hidden group select-none dark:bg-black"
      data-testid="video-player-core"
    >
      <video
        ref={player.videoRef}
        className="w-full aspect-video"
        onTimeUpdate={player.handleTimeUpdate}
        onLoadedMetadata={player.handleLoadedMetadata}
        onPlay={() => player.setIsPlaying(true)}
        onPause={() => player.setIsPlaying(false)}
      />

      {/* Gradient overlay + controls (show on hover / when paused) */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent',
          'p-3 transition-opacity duration-200',
          player.isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
        )}
      >
        {/* Seek bar */}
        <div
          className="relative h-1.5 bg-white/30 rounded-full cursor-pointer mb-3"
          onClick={player.handleSeekBarClick}
          role="slider"
          aria-label="Seek"
          aria-valuenow={player.currentTime}
          aria-valuemin={0}
          aria-valuemax={player.duration}
        >
          <div
            className="h-full bg-primary rounded-full"
            style={{
              width: `${player.duration ? (player.currentTime / player.duration) * 100 : 0}%`,
            }}
          />
          {bookmarks.map((bm) => (
            <div
              key={bm.id}
              className="absolute top-0 h-full w-0.5 rounded-full cursor-pointer"
              style={{
                left: `${(bm.timestamp / player.duration) * 100}%`,
                backgroundColor: bm.color ?? '#3b82f6',
              }}
              title={bm.label}
              onClick={(e) => {
                e.stopPropagation();
                if (player.videoRef.current)
                  player.videoRef.current.currentTime = bm.timestamp;
              }}
            />
          ))}
        </div>

        <VideoControls
          isPlaying={player.isPlaying}
          currentTime={player.currentTime}
          duration={player.duration}
          volume={player.volume}
          isMuted={player.isMuted}
          isFullscreen={player.isFullscreen}
          speed={player.speed}
          levels={player.levels}
          currentLevel={player.currentLevel}
          activeSubtitle={player.activeSubtitle}
          subtitleTracks={subtitleTracks}
          onTogglePlay={player.togglePlay}
          onToggleMute={player.handleToggleMute}
          onVolumeChange={player.handleVolumeChange}
          onSpeedChange={player.setSpeed}
          onSelectLevel={player.selectLevel}
          onQualityLabel={player.qualityLabel}
          onTogglePip={player.handleTogglePip}
          onToggleFullscreen={player.handleToggleFullscreen}
          onSubtitleChange={player.setActiveSubtitle}
        />
      </div>
    </div>
  );
}
