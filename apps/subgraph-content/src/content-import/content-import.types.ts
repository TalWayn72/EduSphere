export interface YouTubePlaylistItem {
  title: string;
  description: string;
  videoId: string;
  thumbnailUrl: string | null;
  position: number;
  durationSecs: number;
}

export interface FirecrawlPage {
  url: string;
  markdown: string;
  title: string;
}

export interface ImportJobResult {
  jobId: string;
  status: 'COMPLETE' | 'PENDING' | 'RUNNING' | 'FAILED' | 'CANCELLED';
  lessonCount: number;
  estimatedMinutes: number;
}
