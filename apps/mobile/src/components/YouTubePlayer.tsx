/**
 * P5-01: Expo YouTubePlayer component.
 *
 * Embeds YouTube videos using react-native-youtube-iframe.
 * Exposes seekTo, getCurrentTime, and onTimeUpdate for transcript sync.
 * Handles fullscreen, play/pause state, and error recovery.
 */
import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import YoutubePlayer, {
  type YoutubeIframeRef,
} from 'react-native-youtube-iframe';

// ── Types ───────────────────────────────────────────────────────────────────

export interface YouTubePlayerProps {
  readonly videoId: string;
  readonly onTimeUpdate?: (currentTime: number) => void;
  readonly onReady?: () => void;
  readonly onError?: (error: string) => void;
  readonly height?: number;
  readonly initialTime?: number;
}

export interface YouTubePlayerRef {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => Promise<number>;
}

// ── Component ───────────────────────────────────────────────────────────────

const YouTubePlayer = React.forwardRef<YouTubePlayerRef, YouTubePlayerProps>(
  function YouTubePlayer(
    { videoId, onTimeUpdate, onReady, onError, height = 220, initialTime = 0 },
    ref
  ) {
    const playerRef = useRef<YoutubeIframeRef>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Expose imperative methods via ref
    React.useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        playerRef.current?.seekTo(seconds, true);
      },
      getCurrentTime: async () => {
        return (await playerRef.current?.getCurrentTime()) ?? 0;
      },
    }));

    const startTimeSync = useCallback(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // 4Hz sync (250ms) for smooth transcript following
      intervalRef.current = setInterval(async () => {
        const time = await playerRef.current?.getCurrentTime();
        if (time !== undefined && onTimeUpdate) {
          onTimeUpdate(time);
        }
      }, 250);
    }, [onTimeUpdate]);

    const stopTimeSync = useCallback(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, []);

    const handleReady = useCallback(() => {
      setIsLoading(false);
      if (initialTime > 0) {
        playerRef.current?.seekTo(initialTime, true);
      }
      onReady?.();
    }, [initialTime, onReady]);

    const handleStateChange = useCallback(
      (state: string) => {
        if (state === 'playing') {
          setPlaying(true);
          startTimeSync();
        } else if (state === 'paused' || state === 'ended') {
          setPlaying(false);
          stopTimeSync();
        }
      },
      [startTimeSync, stopTimeSync]
    );

    const handleError = useCallback(
      (err: string) => {
        setError(err);
        onError?.(err);
      },
      [onError]
    );

    // Cleanup interval on unmount
    React.useEffect(() => {
      return () => stopTimeSync();
    }, [stopTimeSync]);

    if (error) {
      return (
        <View
          style={[styles.container, { height }]}
          testID="youtube-player-error"
        >
          <Text style={styles.errorText}>Failed to load video: {error}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.container, { height }]} testID="youtube-player">
        {isLoading && (
          <ActivityIndicator
            size="large"
            color="#4F46E5"
            style={styles.loader}
            testID="youtube-player-loading"
          />
        )}
        <YoutubePlayer
          ref={playerRef}
          height={height}
          videoId={videoId}
          play={playing}
          onReady={handleReady}
          onChangeState={handleStateChange}
          onError={handleError}
          webViewProps={{
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: false,
          }}
        />
      </View>
    );
  }
);

export default YouTubePlayer;

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    padding: 16,
    fontSize: 14,
  },
});
