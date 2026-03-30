import { useRef, useState, useEffect, useCallback } from 'react';
import Hls, { type Level } from 'hls.js';
import type { SpeedOption } from './types';

interface UseVideoPlayerOptions {
  src: string;
  hlsSrc?: string | null;
  seekTo?: number;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
}

export function useVideoPlayer({
  src,
  hlsSrc,
  seekTo,
  onTimeUpdate,
  onDurationChange,
}: UseVideoPlayerOptions) {
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
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);

  // HLS initialisation
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
      video.src = effectiveUrl;
    } else {
      video.src = src;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src, hlsSrc]);

  // External seek (transcript click)
  useEffect(() => {
    if (seekTo !== undefined && videoRef.current) {
      videoRef.current.currentTime = seekTo;
      setCurrentTime(seekTo);
    }
  }, [seekTo]);

  // Playback speed
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  // Fullscreen change tracking
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }, []);

  // Keyboard shortcuts
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
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          break;
        case 'ArrowRight':
          if (videoRef.current)
            videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
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

  const selectLevel = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentLevel(level);
    }
  };

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

  const handleSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const t = frac * duration;
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const t = e.currentTarget.currentTime;
    setCurrentTime(t);
    onTimeUpdate?.(t);
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const d = e.currentTarget.duration;
    setDuration(d);
    onDurationChange?.(d);
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    setIsMuted(v === 0);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void containerRef.current?.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  };

  const handleTogglePip = () => {
    if (document.pictureInPictureElement) {
      void document.exitPictureInPicture();
    } else {
      void videoRef.current?.requestPictureInPicture();
    }
  };

  return {
    videoRef,
    containerRef,
    isPlaying,
    setIsPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isFullscreen,
    speed,
    setSpeed,
    levels,
    currentLevel,
    activeSubtitle,
    setActiveSubtitle,
    togglePlay,
    selectLevel,
    qualityLabel,
    handleSeekBarClick,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleToggleMute,
    handleVolumeChange,
    handleToggleFullscreen,
    handleTogglePip,
  };
}
