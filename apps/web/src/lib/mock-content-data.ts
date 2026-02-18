/**
 * Mock Content Data
 * Video, transcript, and annotations for Content Viewer demo.
 * Large data arrays are split into dedicated .data.ts files for maintainability.
 */

export interface TranscriptSegment {
  id: string;
  startTime: number; // seconds
  endTime: number;
  text: string;
}

export interface Bookmark {
  id: string;
  timestamp: number; // seconds
  label: string;
  color?: string;
}

export interface Annotation {
  id: string;
  timestamp: number; // seconds
  layer: 'PERSONAL' | 'SHARED' | 'INSTRUCTOR' | 'AI_GENERATED';
  author: string;
  content: string;
  createdAt: Date;
}

export interface VideoContent {
  id: string;
  title: string;
  description: string;
  duration: number; // seconds
  url: string;
  thumbnailUrl?: string;
}

export const mockVideo: VideoContent = {
  id: 'video-1',
  title: 'Introduction to Talmudic Reasoning',
  description:
    'Learn the fundamentals of logical argumentation in Jewish texts',
  duration: 300, // 5 minutes
  url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  thumbnailUrl:
    'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
};

export const mockBookmarks: Bookmark[] = [
  { id: 'b1', timestamp: 15, label: 'Pilpul definition', color: '#3b82f6' },
  { id: 'b2', timestamp: 30, label: 'Kal vachomer explained', color: '#10b981' },
  { id: 'b3', timestamp: 75, label: 'Binyan av principle', color: '#f59e0b' },
  { id: 'b4', timestamp: 120, label: 'Analyzing sugya', color: '#8b5cf6' },
  { id: 'b5', timestamp: 210, label: 'Machloket value', color: '#ec4899' },
];

// Large data arrays live in dedicated files for readability
export { mockTranscript } from './mock-transcript.data';
export { mockVideoAnnotations as mockAnnotations } from './mock-video-annotations.data';
