import React, { useRef, useState, useEffect } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Bookmark } from '@/lib/mock-content-data';

interface VideoPlayerProps {
  /** Direct URL for the original video file (fallback when HLS is unavailable). */
  src: string;
  /**
   * Optional HLS master manifest URL (.m3u8).
   * When provided, HLS adaptive streaming is used in preference to `src`.
   * Falls back to `src` on browsers/devices that do not support HLS.js and
   * lack native HLS support.
   */
  hlsSrc?: string | null;
  bookmarks?: Bookmark[];
  onTimeUpdate?: (currentTime: number) => void;
  seekTo?: number;
}

export function VideoPlayer({
  src,
  hlsSrc,
  bookmarks = [],
  onTimeUpdate,
  seekTo,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // ── HLS initialisation ──────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Tear down any existing HLS instance before re-initialising
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const effectiveUrl = hlsSrc ?? src;
    const isHlsUrl = effectiveUrl.includes('.m3u8');

    if (isHlsUrl && Hls.isSupported()) {
      // HLS.js path (Chrome, Firefox, Edge, etc.)
      const hls = new Hls({ startLevel: -1 }); // -1 = auto quality selection
      hls.loadSource(effectiveUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (isHlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS path (Safari, iOS)
      video.src = effectiveUrl;
    } else {
      // Non-HLS fallback (direct video URL)
      video.src = src;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src, hlsSrc]);

  // ── Seek from external caller (e.g. transcript click) ──────────────────────
  useEffect(() => {
    if (seekTo !== undefined && videoRef.current) {
      videoRef.current.currentTime = seekTo;
    }
  }, [seekTo]);

  // ── Playback controls ───────────────────────────────────────────────────────
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      void videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0] ?? 0;
      setCurrentTime(value[0] ?? 0);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] ?? 1;
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
    if (newMuted) {
      setVolume(0);
    } else {
      setVolume(videoRef.current.volume || 1);
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void videoRef.current.requestFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBookmarkPosition = (timestamp: number) =>
    (timestamp / duration) * 100;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative bg-black rounded-lg overflow-hidden group">
      <video
        ref={videoRef}
        className="w-full aspect-video"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative mb-2">
          <Slider
            value={[currentTime]}
            max={duration}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="absolute top-0 h-2 w-1 rounded-full"
              style={{
                left: `${getBookmarkPosition(bookmark.timestamp)}%`,
                backgroundColor: bookmark.color || '#3b82f6',
              }}
              title={bookmark.label}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayPause}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            <span className="text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white hover:bg-white/20"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>

            <div className="w-24">
              <Slider
                value={[volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="cursor-pointer"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
