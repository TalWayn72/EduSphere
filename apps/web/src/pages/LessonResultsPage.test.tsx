import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: vi.fn(() => ({ courseId: 'course-1', lessonId: 'lesson-1' })),
    useNavigate: vi.fn(() => mockNavigate),
  };
});

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/components/Layout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Layout: ({ children }: any) => children,
}));

vi.mock('@/lib/graphql/lesson.queries', () => ({
  LESSON_QUERY: 'LESSON_QUERY',
  ADD_LESSON_ASSET_MUTATION: 'ADD_LESSON_ASSET_MUTATION',
}));

import { LessonResultsPage } from './LessonResultsPage';
import * as urql from 'urql';

// ── Full-featured mock data ────────────────────────────────────────────────────

const MOCK_RESULTS_FULL = [
  {
    id: 'r-ingestion',
    moduleName: 'INGESTION',
    outputType: 'INGESTION',
    outputData: { sourceUrl: 'https://youtube.com/watch?v=abc123', assetType: 'VIDEO' },
    fileUrl: null,
  },
  {
    id: 'r-asr',
    moduleName: 'ASR',
    outputType: 'ASR',
    outputData: {
      transcript: 'ברוכים הבאים לשיעור על הלכות שבת. היום נלמד על מלאכת הבערה.',
      language: 'he',
      duration: 3600,
    },
    fileUrl: null,
  },
  {
    id: 'r-cleaning',
    moduleName: 'CONTENT_CLEANING',
    outputType: 'CONTENT_CLEANING',
    outputData: { cleanedText: 'ברוכים הבאים לשיעור על הלכות שבת היום נלמד על מלאכת הבערה' },
    fileUrl: null,
  },
  {
    id: 'r-ner',
    moduleName: 'NER_SOURCE_LINKING',
    outputType: 'NER_SOURCE_LINKING',
    outputData: {
      entities: [{ text: 'שבת', type: 'CONCEPT' }, { text: 'הבערה', type: 'CONCEPT' }],
      linkedSources: [{ title: 'שולחן ערוך, אורח חיים', url: null }],
    },
    fileUrl: null,
  },
  {
    id: 'r-summarize',
    moduleName: 'SUMMARIZATION',
    outputType: 'SUMMARIZATION',
    outputData: {
      shortSummary: 'סיכום קצר לשיעור על הלכות שבת',
      keyPoints: ['נקודה א', 'נקודה ב', 'נקודה ג'],
    },
    fileUrl: null,
  },
  {
    id: 'r-notes',
    moduleName: 'STRUCTURED_NOTES',
    outputType: 'STRUCTURED_NOTES',
    outputData: { outputMarkdown: '## הלכות שבת\n- מלאכת הבערה אסורה מהתורה' },
    fileUrl: null,
  },
  {
    id: 'r-diagram',
    moduleName: 'DIAGRAM_GENERATOR',
    outputType: 'DIAGRAM_GENERATOR',
    outputData: { mermaidSrc: 'graph LR\n  A[שבת] --> B[הבערה]' },
    fileUrl: null,
  },
  {
    id: 'r-citations',
    moduleName: 'CITATION_VERIFIER',
    outputType: 'CITATION_VERIFIER',
    outputData: {
      verifiedCitations: [{ sourceText: 'שולחן ערוך' }],
      failedCitations: [],
      matchReport: 'כל הציטוטים אומתו.',
    },
    fileUrl: null,
  },
  {
    id: 'r-qa',
    moduleName: 'QA_GATE',
    outputType: 'QA_GATE',
    outputData: { overallScore: 0.85, fixList: [{ description: 'תקן ציטוט חסר', severity: 'MEDIUM' }] },
    fileUrl: null,
  },
  {
    id: 'r-publish',
    moduleName: 'PUBLISH_SHARE',
    outputType: 'PUBLISH_SHARE',
    outputData: { publishReady: true, publishedUrl: 'https://cdn.example.com/lesson-abc' },
    fileUrl: null,
  },
];

const MOCK_LESSON = {
  lesson: {
    id: 'lesson-1',
    title: 'שיעור בעץ חיים',
    status: 'READY',
    assets: [{ id: 'a1', assetType: 'VIDEO', sourceUrl: 'https://youtube.com/watch?v=abc123', fileUrl: null }],
    pipeline: {
      id: 'pipeline-1',
      currentRun: { id: 'run-1', status: 'COMPLETED', startedAt: null, completedAt: '2025-03-01T10:00:00Z', results: MOCK_RESULTS_FULL },
    },
  },
};

function makeQuery(overrides: Record<string, unknown> = {}) {
  return [
    { data: MOCK_LESSON, fetching: false, error: undefined, ...overrides },
    vi.fn(),
  ] as never;
}

const NOOP_MUTATION = [{ fetching: false }, vi.fn().mockResolvedValue({ data: undefined, error: undefined })] as never;

describe('LessonResultsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(urql.useQuery).mockReturnValue(makeQuery());
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
  });

  // ── BUG-049 regression ────────────────────────────────────────────────────────

  it('BUG-049: does NOT call console.error synchronously during render (must use useEffect)', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(urql.useQuery).mockReturnValue(makeQuery({ error: { message: 'query failed' } }));
    const { unmount } = render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    consoleSpy.mockRestore();
    unmount();
  });

  it('BUG-049: renders without "Cannot update a component while rendering" error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation((msg: unknown) => {
      if (typeof msg === 'string' && msg.includes('Cannot update a component')) {
        throw new Error(`React render violation: ${msg}`);
      }
    });
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    spy.mockRestore();
  });

  // ── Loading / empty ───────────────────────────────────────────────────────────

  it('shows loading spinner while fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeQuery({ fetching: true, data: undefined }));
    const { container } = render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows "השיעור לא נמצא" when lesson is null', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeQuery({ data: { lesson: null } }));
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByText('השיעור לא נמצא')).toBeInTheDocument();
  });

  it('shows page heading תוצאות Pipeline', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByText('תוצאות Pipeline')).toBeInTheDocument();
  });

  it('shows lesson title in back button', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByText(/שיעור בעץ חיים/)).toBeInTheDocument();
  });

  // ── Empty state ───────────────────────────────────────────────────────────────

  it('shows empty state with Pipeline Builder button when results are empty', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ data: { lesson: { ...MOCK_LESSON.lesson, pipeline: { id: 'p1', currentRun: { id: 'r', status: 'IDLE', startedAt: null, completedAt: null, results: [] } } } } })
    );
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('empty-results')).toBeInTheDocument();
    expect(screen.getByText(/אין תוצאות עדיין/)).toBeInTheDocument();
    expect(screen.getByTestId('open-pipeline-from-empty')).toBeInTheDocument();
  });

  it('shows video URL input panel in empty state', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ data: { lesson: { ...MOCK_LESSON.lesson, pipeline: null } } })
    );
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('add-video-panel')).toBeInTheDocument();
    expect(screen.getByTestId('video-url-input')).toBeInTheDocument();
    expect(screen.getByTestId('add-video-btn')).toBeInTheDocument();
  });

  it('video URL input: shows validation error if submitted empty', async () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ data: { lesson: { ...MOCK_LESSON.lesson, pipeline: null } } })
    );
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('add-video-btn'));
    expect(await screen.findByTestId('add-video-error')).toBeInTheDocument();
    expect(screen.getByTestId('add-video-error')).toHaveTextContent('קישור');
  });

  it('video URL input: navigates to pipeline after successful asset add', async () => {
    const mockAdd = vi.fn().mockResolvedValue({ data: { addLessonAsset: { id: 'a-new' } }, error: undefined });
    vi.mocked(urql.useMutation).mockReturnValue([{ fetching: false }, mockAdd] as never);
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ data: { lesson: { ...MOCK_LESSON.lesson, pipeline: null } } })
    );
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    fireEvent.change(screen.getByTestId('video-url-input'), { target: { value: 'https://youtube.com/watch?v=xyz' } });
    fireEvent.click(screen.getByTestId('add-video-btn'));
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/courses/course-1/lessons/lesson-1/pipeline');
    });
  });

  // ── Run status badge ──────────────────────────────────────────────────────────

  it('shows COMPLETED badge when run is completed', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('run-status-badge')).toBeInTheDocument();
    expect(screen.getByText(/הושלם/)).toBeInTheDocument();
  });

  it('shows RUNNING badge when run is running', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ data: { lesson: { ...MOCK_LESSON.lesson, pipeline: { id: 'p1', currentRun: { id: 'r', status: 'RUNNING', startedAt: null, completedAt: null, results: MOCK_RESULTS_FULL } } } } })
    );
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByText(/מריץ/)).toBeInTheDocument();
  });

  // ── INGESTION ─────────────────────────────────────────────────────────────────

  it('renders INGESTION section with source URL', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('result-ingestion')).toBeInTheDocument();
    expect(screen.getByTestId('ingestion-url')).toBeInTheDocument();
    expect(document.body.textContent).toContain('youtube.com');
  });

  // ── ASR / Transcription ───────────────────────────────────────────────────────

  it('renders ASR section with transcript text', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('result-asr')).toBeInTheDocument();
    expect(screen.getByTestId('asr-transcript')).toBeInTheDocument();
    expect(document.body.textContent).toContain('ברוכים הבאים לשיעור');
  });

  it('renders ASR language and duration', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('asr-language')).toHaveTextContent('he');
    expect(screen.getByTestId('asr-duration')).toBeInTheDocument();
  });

  it('ASR: expand button appears for long transcripts', () => {
    const longTranscript = 'א'.repeat(900);
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ data: { lesson: { ...MOCK_LESSON.lesson, pipeline: { id: 'p', currentRun: { id: 'r', status: 'COMPLETED', startedAt: null, completedAt: null, results: [{ id: 'r-asr', moduleName: 'ASR', outputType: 'ASR', outputData: { transcript: longTranscript, language: 'he' }, fileUrl: null }] } } } } })
    );
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('asr-transcript-expand')).toBeInTheDocument();
  });

  // ── CONTENT_CLEANING ─────────────────────────────────────────────────────────

  it('renders CONTENT_CLEANING section when present', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('result-cleaning')).toBeInTheDocument();
    expect(screen.getByTestId('cleaned-text')).toBeInTheDocument();
  });

  // ── NER_SOURCE_LINKING ────────────────────────────────────────────────────────

  it('renders NER entities as chips', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('result-ner')).toBeInTheDocument();
    expect(screen.getByTestId('entity-0')).toHaveTextContent('שבת');
    expect(screen.getByTestId('entity-1')).toHaveTextContent('הבערה');
  });

  it('renders NER linked sources', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(document.body.textContent).toContain('שולחן ערוך');
  });

  // ── SUMMARIZATION ─────────────────────────────────────────────────────────────

  it('renders summarization section with short summary', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('result-summarization')).toBeInTheDocument();
    expect(screen.getByTestId('summary-short')).toHaveTextContent('סיכום קצר לשיעור');
  });

  it('renders key points list', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('summary-keypoints')).toBeInTheDocument();
    expect(document.body.textContent).toContain('נקודה א');
    expect(document.body.textContent).toContain('נקודה ב');
  });

  // ── STRUCTURED_NOTES ─────────────────────────────────────────────────────────

  it('renders structured notes section', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('result-structured-notes')).toBeInTheDocument();
    expect(screen.getByTestId('notes-markdown')).toBeInTheDocument();
    expect(document.body.textContent).toContain('הלכות שבת');
  });

  // ── DIAGRAM ───────────────────────────────────────────────────────────────────

  it('renders diagram mermaid section', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('result-diagram')).toBeInTheDocument();
    expect(screen.getByTestId('diagram-mermaid')).toHaveTextContent('graph LR');
  });

  // ── CITATION_VERIFIER ────────────────────────────────────────────────────────

  it('renders citation verifier with verified count', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('result-citations')).toBeInTheDocument();
    expect(screen.getByTestId('citations-verified')).toHaveTextContent('1');
    expect(screen.getByTestId('citations-failed')).toHaveTextContent('0');
  });

  it('renders citation match report', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('citations-report')).toHaveTextContent('כל הציטוטים אומתו');
  });

  // ── QA_GATE ───────────────────────────────────────────────────────────────────

  it('renders QA score as percentage', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('result-qa')).toBeInTheDocument();
    expect(screen.getByTestId('qa-score')).toHaveTextContent('85%');
  });

  it('renders QA fix list', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('qa-fix-list')).toBeInTheDocument();
    expect(document.body.textContent).toContain('תקן ציטוט חסר');
  });

  // ── QA_GATE with raw score (e.g. 92 instead of 0.85) ─────────────────────────

  it('renders QA score correctly when raw value > 1 (e.g. 92)', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ data: { lesson: { ...MOCK_LESSON.lesson, pipeline: { id: 'p', currentRun: { id: 'r', status: 'COMPLETED', startedAt: null, completedAt: null, results: [
        { id: 'r-qa', moduleName: 'QA_GATE', outputType: 'QA_GATE', outputData: { overallScore: 92, fixList: [] }, fileUrl: null }
      ] } } } } })
    );
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('qa-score')).toHaveTextContent('92%');
  });

  // ── PUBLISH_SHARE ────────────────────────────────────────────────────────────

  it('renders publish section with publishReady and URL', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('result-publish')).toBeInTheDocument();
    expect(screen.getByTestId('publish-ready')).toBeInTheDocument();
    expect(screen.getByTestId('publish-url')).toHaveAttribute('href', 'https://cdn.example.com/lesson-abc');
  });

  // ── "Run Again" button ────────────────────────────────────────────────────────

  it('shows run pipeline again button', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(screen.getByTestId('run-pipeline-again-btn')).toBeInTheDocument();
  });

  it('run pipeline again navigates to pipeline page', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('run-pipeline-again-btn'));
    expect(mockNavigate).toHaveBeenCalledWith('/courses/course-1/lessons/lesson-1/pipeline');
  });

  // ── Regression: no raw technical strings ─────────────────────────────────────

  it('does NOT show raw [GraphQL] or [object Object] strings', () => {
    render(<MemoryRouter><LessonResultsPage /></MemoryRouter>);
    expect(document.body.textContent).not.toContain('[GraphQL]');
    expect(document.body.textContent).not.toContain('[object Object]');
    expect(document.body.textContent).not.toContain('undefined');
    expect(document.body.textContent).not.toContain('Unexpected error');
  });
});
