import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('lucide-react', () => ({
  BookOpen: () => <span>book</span>,
}));

vi.mock('@/components/VideoPlayerCore', () => ({
  VideoPlayerCore: () => <div data-testid="video-player" />,
}));

vi.mock('@/components/TranscriptPanel', () => ({
  TranscriptPanel: () => <div data-testid="transcript-panel" />,
}));

vi.mock('@/components/VideoProgressMarkers', () => ({
  VideoProgressMarkers: () => <div />,
}));

vi.mock('@/components/AddAnnotationOverlay', () => ({
  AddAnnotationOverlay: () => <div />,
}));

vi.mock('./ContentViewerHelpers', () => ({
  SkeletonLine: () => <div />,
}));

import { VideoSection } from './VideoSection';

describe('VideoSection', () => {
  it('renders without crash', () => {
    const { container } = render(
      <VideoSection
        videoUrl="https://example.com/video.mp4"
        hlsManifestUrl={null}
        videoTitle="Test Video"
        contentFetching={false}
        transcript={[]}
        currentTime={0}
        duration={100}
        seekTarget={undefined}
        bookmarks={[]}
        annotations={[]}
        onTimeUpdate={vi.fn()}
        onDurationChange={vi.fn()}
        onSeek={vi.fn()}
        onOverlayAnnotation={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });
});
