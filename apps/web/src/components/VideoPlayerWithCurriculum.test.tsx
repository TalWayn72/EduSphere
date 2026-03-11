import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { VideoPlayerWithCurriculum } from './VideoPlayerWithCurriculum';

vi.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="icon-chevron-left" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
  ChevronLeftIcon: () => <span data-testid="icon-prev" />,
  ChevronRightIcon: () => <span data-testid="icon-next" />,
  CheckCircle2: () => <span data-testid="icon-check-circle" />,
  Circle: () => <span data-testid="icon-circle" />,
}));

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_CURRICULUM = [
  {
    sectionTitle: 'Section 1: Basics',
    lessons: [
      { id: 'l1', title: 'Introduction', duration: '5:00', completed: true },
      { id: 'l2', title: 'Core Concepts', duration: '10:30', completed: false },
    ],
  },
  {
    sectionTitle: 'Section 2: Advanced',
    lessons: [
      { id: 'l3', title: 'Deep Dive', duration: '15:00', completed: false },
    ],
  },
];

function renderComponent(overrides: Partial<Parameters<typeof VideoPlayerWithCurriculum>[0]> = {}) {
  const onLessonSelect = vi.fn();
  const props = {
    courseTitle: 'React Mastery',
    currentLessonId: 'l1',
    videoUrl: 'https://example.com/video.mp4',
    curriculum: MOCK_CURRICULUM,
    onLessonSelect,
    ...overrides,
  };
  const result = render(<VideoPlayerWithCurriculum {...props} />);
  return { ...result, onLessonSelect };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VideoPlayerWithCurriculum', () => {
  it('renders the video player area', () => {
    renderComponent();
    expect(screen.getByTestId('video-player')).toBeInTheDocument();
  });

  it('renders curriculum sidebar by default', () => {
    renderComponent();
    expect(screen.getByTestId('curriculum-sidebar')).toBeInTheDocument();
  });

  it('highlights current lesson with indigo classes', () => {
    renderComponent({ currentLessonId: 'l2' });
    const lessonBtn = screen.getByTestId('lesson-item-l2');
    expect(lessonBtn.className).toContain('indigo');
  });

  it('calls onLessonSelect when a lesson is clicked', () => {
    const { onLessonSelect } = renderComponent();
    fireEvent.click(screen.getByTestId('lesson-item-l3'));
    expect(onLessonSelect).toHaveBeenCalledWith('l3');
  });

  it('collapses sidebar when toggle button is clicked', () => {
    renderComponent();
    const toggle = screen.getByTestId('sidebar-toggle');
    const sidebar = screen.getByTestId('curriculum-sidebar');
    // Initially open — has w-80
    expect(sidebar.className).toContain('w-80');
    fireEvent.click(toggle);
    expect(sidebar.className).toContain('w-0');
  });

  it('shows correct progress count in sidebar', () => {
    renderComponent();
    // 1 completed out of 3 total
    expect(screen.getByTestId('progress-count')).toHaveTextContent('1 of 3 lessons completed');
  });

  it('renders completed icon for completed lessons', () => {
    renderComponent();
    // l1 is completed — should render CheckCircle2
    const l1Item = screen.getByTestId('lesson-item-l1');
    expect(l1Item.querySelector('[data-testid="icon-check-circle"]')).toBeInTheDocument();
  });

  it('renders prev and next lesson buttons', () => {
    renderComponent({ currentLessonId: 'l2' });
    expect(screen.getByTestId('prev-lesson-btn')).toBeInTheDocument();
    expect(screen.getByTestId('next-lesson-btn')).toBeInTheDocument();
  });

  it('shows the course title in the sidebar', () => {
    renderComponent();
    expect(screen.getByTestId('course-title')).toHaveTextContent('React Mastery');
  });

  it('has all required data-testid attributes', () => {
    renderComponent();
    expect(screen.getByTestId('video-player')).toBeInTheDocument();
    expect(screen.getByTestId('curriculum-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('course-title')).toBeInTheDocument();
    expect(screen.getByTestId('progress-count')).toBeInTheDocument();
    expect(screen.getByTestId('prev-lesson-btn')).toBeInTheDocument();
    expect(screen.getByTestId('next-lesson-btn')).toBeInTheDocument();
  });
});

// ── Captions / WCAG 1.2.2 ─────────────────────────────────────────────────────

describe('VideoPlayerWithCurriculum — captions (WCAG 1.2.2)', () => {
  const CAPTIONS_URL = 'https://minio.example.com/captions/tenant/course/asset/en.vtt';

  function renderWithCaptions(captionsUrl?: string) {
    return render(
      <VideoPlayerWithCurriculum
        courseTitle="Test Course"
        currentLessonId="l1"
        videoUrl="https://example.com/video.mp4"
        curriculum={MOCK_CURRICULUM}
        onLessonSelect={vi.fn()}
        captionsUrl={captionsUrl}
      />
    );
  }

  it('renders <track> element when captionsUrl is provided', () => {
    renderWithCaptions(CAPTIONS_URL);
    const track = screen.getByTestId('captions-track');
    expect(track).toBeInTheDocument();
    expect(track).toHaveAttribute('kind', 'captions');
    expect(track).toHaveAttribute('src', CAPTIONS_URL);
  });

  it('does NOT render <track> when captionsUrl is not provided', () => {
    renderWithCaptions();
    expect(screen.queryByTestId('captions-track')).not.toBeInTheDocument();
  });

  it('renders CC toggle button when captionsUrl is provided', () => {
    renderWithCaptions(CAPTIONS_URL);
    const btn = screen.getByTestId('cc-toggle-btn');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('CC');
  });

  it('does NOT render CC toggle button when captionsUrl is not provided', () => {
    renderWithCaptions();
    expect(screen.queryByTestId('cc-toggle-btn')).not.toBeInTheDocument();
  });

  it('CC button has aria-label="Toggle captions"', () => {
    renderWithCaptions(CAPTIONS_URL);
    expect(screen.getByTestId('cc-toggle-btn')).toHaveAttribute(
      'aria-label',
      'Toggle captions'
    );
  });

  it('CC button has aria-pressed=true when captions are enabled (default)', () => {
    renderWithCaptions(CAPTIONS_URL);
    const btn = screen.getByTestId('cc-toggle-btn');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('CC button aria-pressed toggles to false after click', () => {
    renderWithCaptions(CAPTIONS_URL);
    const btn = screen.getByTestId('cc-toggle-btn');
    act(() => { fireEvent.click(btn); });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('CC button aria-pressed toggles back to true on second click', () => {
    renderWithCaptions(CAPTIONS_URL);
    const btn = screen.getByTestId('cc-toggle-btn');
    act(() => { fireEvent.click(btn); });
    act(() => { fireEvent.click(btn); });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('track has srcLang defaulting to "en"', () => {
    renderWithCaptions(CAPTIONS_URL);
    expect(screen.getByTestId('captions-track')).toHaveAttribute('srclang', 'en');
  });

  it('track has label defaulting to "English"', () => {
    renderWithCaptions(CAPTIONS_URL);
    expect(screen.getByTestId('captions-track')).toHaveAttribute('label', 'English');
  });

  it('video element has crossOrigin=anonymous when captionsUrl is provided', () => {
    renderWithCaptions(CAPTIONS_URL);
    const video = screen.getByTestId('video-element');
    expect(video).toHaveAttribute('crossorigin', 'anonymous');
  });

  it('video element does NOT have crossOrigin when captionsUrl is absent', () => {
    renderWithCaptions();
    const video = screen.getByTestId('video-element');
    expect(video).not.toHaveAttribute('crossorigin');
  });
});
