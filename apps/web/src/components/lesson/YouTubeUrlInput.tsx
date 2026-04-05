/**
 * YouTubeUrlInput — paste a YouTube URL, preview thumbnail, trigger ingest.
 *
 * Extracts video ID from various YouTube URL formats, shows a thumbnail
 * preview, and calls onSubmit with the validated URL.
 */
import { useState, useCallback } from 'react';
import { Play, Link, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface YouTubeUrlInputProps {
  onSubmit: (url: string, videoId: string) => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const YT_URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
];

function extractVideoId(url: string): string | null {
  for (const pattern of YT_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function getThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

export function YouTubeUrlInput({
  onSubmit,
  loading = false,
  disabled = false,
  className = '',
}: YouTubeUrlInputProps) {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrl(val);
    setError(null);
    if (!val.trim()) {
      setVideoId(null);
      return;
    }
    const id = extractVideoId(val);
    setVideoId(id);
    if (val.trim() && !id) setError('Invalid YouTube URL');
  }, []);

  const handleSubmit = useCallback(() => {
    if (!videoId) return;
    onSubmit(url, videoId);
  }, [url, videoId, onSubmit]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={url}
            onChange={handleChange}
            placeholder="Paste YouTube URL..."
            className="ps-9"
            disabled={disabled || loading}
            aria-label="YouTube video URL"
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!videoId || disabled || loading}
          size="default"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin me-1" />
          ) : (
            <Play className="h-4 w-4 me-1" />
          )}
          Ingest
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}

      {videoId && !error && (
        <div className="flex items-center gap-3 rounded-md border p-2">
          <img
            src={getThumbnailUrl(videoId)}
            alt="Video thumbnail"
            className="w-32 h-18 rounded object-cover"
          />
          <div className="text-sm text-muted-foreground">
            <p>
              Video ID: <code className="text-xs">{videoId}</code>
            </p>
            <p className="text-xs mt-1">Click Ingest to extract transcript</p>
          </div>
        </div>
      )}
    </div>
  );
}
