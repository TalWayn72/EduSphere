/**
 * Tests for ToolsPanel — right panel of UnifiedLearningPage.
 * Covers: tab switching (Annotations / AI / Collab), video + transcript section,
 * prop routing to sub-components.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolsPanel } from './UnifiedLearningPage.tools-panel';
import { AnnotationLayer, type Annotation } from '@/types/annotations';
import type { UseAgentChatReturn } from '@/hooks/useAgentChat';
import type { TranscriptSegment } from '@/lib/mock-content-data';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

// ResizablePanelGroup is aliased to tiptapStub in vitest.config.ts;
// override with a functional implementation so children render.
vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-group">{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-panel">{children}</div>
  ),
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

vi.mock('@/components/VideoPlayerCore', () => ({
  VideoPlayerCore: ({ src }: { src: string }) => (
    <div data-testid="video-player-core" data-src={src} />
  ),
}));

vi.mock('@/components/TranscriptPanel', () => ({
  TranscriptPanel: () => <div data-testid="transcript-panel" />,
}));

vi.mock('@/components/VideoProgressMarkers', () => ({
  VideoProgressMarkers: () => <div data-testid="video-progress-markers" />,
}));

vi.mock('@/components/AddAnnotationOverlay', () => ({
  AddAnnotationOverlay: () => <div data-testid="add-annotation-overlay" />,
}));

vi.mock('@/pages/UnifiedLearningPage.annotations-tab', () => ({
  AnnotationsTab: ({ annotations }: { annotations: Annotation[] }) => (
    <div data-testid="annotations-tab">annotations: {annotations.length}</div>
  ),
}));

vi.mock('@/pages/UnifiedLearningPage.ai-tab', () => ({
  AiTab: () => <div data-testid="ai-tab">ai-tab</div>,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeChat(overrides: Partial<UseAgentChatReturn> = {}): UseAgentChatReturn {
  return {
    messages: [],
    chatInput: '',
    setChatInput: vi.fn(),
    sendMessage: vi.fn(),
    stopGeneration: vi.fn(),
    chatEndRef: { current: null },
    isStreaming: false,
    isSending: false,
    ...overrides,
  };
}

const baseProps = {
  videoUrl: 'https://example.com/video.mp4',
  hlsManifestUrl: null,
  transcript: [] as TranscriptSegment[],
  annotations: [] as Annotation[],
  annotationsFetching: false,
  currentTime: 0,
  duration: 120,
  seekTarget: undefined,
  onTimeUpdate: vi.fn(),
  onDurationChange: vi.fn(),
  onSeek: vi.fn(),
  onAddAnnotation: vi.fn(),
  onReply: vi.fn(),
  onOverlayAnnotation: vi.fn(),
  bookmarks: [],
  chat: makeChat(),
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('ToolsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the resizable panel group', () => {
    render(<ToolsPanel {...baseProps} />);
    expect(screen.getByTestId('resizable-group')).toBeDefined();
  });

  it('renders the video player with the correct src', () => {
    render(<ToolsPanel {...baseProps} />);
    const player = screen.getByTestId('video-player-core');
    expect(player.getAttribute('data-src')).toBe('https://example.com/video.mp4');
  });

  it('renders the transcript panel', () => {
    render(<ToolsPanel {...baseProps} />);
    expect(screen.getByTestId('transcript-panel')).toBeDefined();
  });

  it('renders VideoProgressMarkers and AddAnnotationOverlay', () => {
    render(<ToolsPanel {...baseProps} />);
    expect(screen.getByTestId('video-progress-markers')).toBeDefined();
    expect(screen.getByTestId('add-annotation-overlay')).toBeDefined();
  });

  it('shows the three tab buttons', () => {
    render(<ToolsPanel {...baseProps} />);
    const tabList = screen.getByRole('tablist');
    const tabs = tabList.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(3);
  });

  it('renders AnnotationsTab by default (first active tab)', () => {
    render(<ToolsPanel {...baseProps} />);
    expect(screen.getByTestId('annotations-tab')).toBeDefined();
    expect(screen.queryByTestId('ai-tab')).toBeNull();
  });

  it('switches to AiTab when the AI tab button is clicked', () => {
    render(<ToolsPanel {...baseProps} />);
    const tabList = screen.getByRole('tablist');
    const tabs = tabList.querySelectorAll('[role="tab"]');
    // Second tab is the AI tab
    fireEvent.click(tabs[1]!);
    expect(screen.getByTestId('ai-tab')).toBeDefined();
    expect(screen.queryByTestId('annotations-tab')).toBeNull();
  });

  it('shows collaboration coming-soon message when collab tab is clicked', () => {
    render(<ToolsPanel {...baseProps} />);
    const tabList = screen.getByRole('tablist');
    const tabs = tabList.querySelectorAll('[role="tab"]');
    // Third tab is collab
    fireEvent.click(tabs[2]!);
    expect(screen.getByText('לימוד משותף — בקרוב')).toBeDefined();
    expect(screen.queryByTestId('annotations-tab')).toBeNull();
    expect(screen.queryByTestId('ai-tab')).toBeNull();
  });

  it('passes annotation count to AnnotationsTab', () => {
    const anns: Annotation[] = [
      {
        id: 'a1',
        content: 'note',
        layer: AnnotationLayer.PERSONAL,
        userId: 'u1',
        userName: 'Alice',
        userRole: 'student',
        timestamp: '',
        contentId: 'c1',
        createdAt: '',
        updatedAt: '',
      },
    ];
    render(<ToolsPanel {...baseProps} annotations={anns} />);
    expect(screen.getByText('annotations: 1')).toBeDefined();
  });

  it('marks the annotations tab as selected by default (aria-selected)', () => {
    render(<ToolsPanel {...baseProps} />);
    const tabList = screen.getByRole('tablist');
    const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('false');
    expect(tabs[2]?.getAttribute('aria-selected')).toBe('false');
  });

  it('updates aria-selected when switching tabs', () => {
    render(<ToolsPanel {...baseProps} />);
    const tabList = screen.getByRole('tablist');
    const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
    fireEvent.click(tabs[1]!);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('false');
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true');
  });
});
