import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks (hoisted by vitest) ─────────────────────────────────────────────────

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
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
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
  SAVE_LESSON_PIPELINE_MUTATION: 'SAVE_LESSON_PIPELINE_MUTATION',
  START_PIPELINE_RUN_MUTATION: 'START_PIPELINE_RUN_MUTATION',
}));

const mockStore = {
  nodes: [] as import('@/lib/lesson-pipeline.store').PipelineNode[],
  isDirty: false,
  selectedNodeId: null as string | null,
  setNodes: vi.fn(),
  addNode: vi.fn(),
  removeNode: vi.fn(),
  reorderNodes: vi.fn(),
  toggleNode: vi.fn(),
  updateNodeConfig: vi.fn(),
  loadTemplate: vi.fn(),
  setSelectedNode: vi.fn(),
  resetDirty: vi.fn(),
};

vi.mock('@/lib/lesson-pipeline.store', () => ({
  useLessonPipelineStore: vi.fn(() => mockStore),
  MODULE_LABELS: {
    INGESTION: { en: 'Ingestion', he: 'איסוף חומרים' },
    ASR: { en: 'Transcription (ASR)', he: 'תמלול' },
    NER_SOURCE_LINKING: {
      en: 'NER + Source Linking',
      he: 'זיהוי ישויות ומקורות',
    },
    CONTENT_CLEANING: { en: 'Content Cleaning', he: 'ניקוי תוכן' },
    SUMMARIZATION: { en: 'Summarization', he: 'סיכום' },
    STRUCTURED_NOTES: { en: 'Structured Notes', he: 'תיעוד מובנה' },
    DIAGRAM_GENERATOR: { en: 'Diagram Generator', he: 'יצירת תרשימים' },
    CITATION_VERIFIER: { en: 'Citation Verifier', he: 'אימות ציטוטים' },
    QA_GATE: { en: 'QA Gate', he: 'בקרת איכות' },
    PUBLISH_SHARE: { en: 'Publish & Share', he: 'יצוא והפצה' },
  },
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { LessonPipelinePage } from './LessonPipelinePage';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOOP_EXECUTE = vi
  .fn()
  .mockResolvedValue({ data: null, error: undefined });
const NOOP_MUTATION = [{ fetching: false }, NOOP_EXECUTE] as never;

const MOCK_LESSON = {
  id: 'lesson-1',
  title: 'Test Lesson',
  pipeline: null,
};

function makeQuery(overrides: Record<string, unknown> = {}) {
  return [
    {
      data: { lesson: MOCK_LESSON },
      fetching: false,
      error: undefined,
      ...overrides,
    },
    vi.fn(),
  ] as never;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LessonPipelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.nodes = [];
    mockStore.isDirty = false;
    mockStore.selectedNodeId = null;
    vi.mocked(urql.useQuery).mockReturnValue(makeQuery());
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
  });

  it('renders "Pipeline Builder" label in toolbar', () => {
    render(
      <MemoryRouter>
        <LessonPipelinePage />
      </MemoryRouter>
    );
    expect(screen.getByText('Pipeline Builder')).toBeInTheDocument();
  });

  it('renders lesson title in back button from query data', () => {
    render(
      <MemoryRouter>
        <LessonPipelinePage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Test Lesson/)).toBeInTheDocument();
  });

  it('shows module palette with Hebrew module labels', () => {
    render(
      <MemoryRouter>
        <LessonPipelinePage />
      </MemoryRouter>
    );
    expect(screen.getByText('איסוף חומרים')).toBeInTheDocument();
    expect(screen.getByText('תמלול')).toBeInTheDocument();
    expect(screen.getByText('Ingestion')).toBeInTheDocument();
  });

  it('shows all 10 palette modules', () => {
    render(
      <MemoryRouter>
        <LessonPipelinePage />
      </MemoryRouter>
    );
    expect(screen.getByText('Publish & Share')).toBeInTheDocument();
    expect(screen.getByText('QA Gate')).toBeInTheDocument();
  });

  it('shows empty canvas drop zone when no nodes', () => {
    render(
      <MemoryRouter>
        <LessonPipelinePage />
      </MemoryRouter>
    );
    expect(screen.getByText('גרור מודולים לכאן')).toBeInTheDocument();
    expect(screen.getByText(/בנה את ה-Pipeline שלך/)).toBeInTheDocument();
  });

  it('Save button (שמור) is disabled when isDirty is false', () => {
    mockStore.isDirty = false;
    render(
      <MemoryRouter>
        <LessonPipelinePage />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: 'שמור' })).toBeDisabled();
  });

  it('Save button (שמור) is enabled when isDirty is true', () => {
    mockStore.isDirty = true;
    render(
      <MemoryRouter>
        <LessonPipelinePage />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: 'שמור' })).not.toBeDisabled();
  });

  it('calls savePipeline mutation when Save is clicked with dirty store', async () => {
    mockStore.isDirty = true;
    const mockSave = vi.fn().mockResolvedValue({
      data: { saveLessonPipeline: { id: 'p1' } },
      error: undefined,
    });
    vi.mocked(urql.useMutation).mockReturnValue([
      { fetching: false },
      mockSave,
    ] as never);

    render(
      <MemoryRouter>
        <LessonPipelinePage />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: 'שמור' }));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith({
        lessonId: 'lesson-1',
        input: { nodes: [], config: {} },
      })
    );
  });

  it('shows "▶ הפעל Pipeline" run button when not running', () => {
    render(
      <MemoryRouter>
        <LessonPipelinePage />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('button', { name: '▶ הפעל Pipeline' })
    ).toBeInTheDocument();
  });

  it('renders pipeline nodes from the store when nodes are present', () => {
    mockStore.nodes = [
      {
        id: 'n1',
        moduleType: 'INGESTION',
        label: 'Ingestion',
        labelHe: 'איסוף חומרים',
        enabled: true,
        order: 0,
        config: {},
      },
      {
        id: 'n2',
        moduleType: 'ASR',
        label: 'Transcription (ASR)',
        labelHe: 'תמלול',
        enabled: true,
        order: 1,
        config: {},
      },
    ];
    render(
      <MemoryRouter>
        <LessonPipelinePage />
      </MemoryRouter>
    );
    expect(screen.getAllByText('איסוף חומרים').length).toBeGreaterThanOrEqual(
      1
    );
    expect(screen.getAllByText('תמלול').length).toBeGreaterThanOrEqual(1);
  });

  it('remove button (✕) calls removeNode for a node', async () => {
    mockStore.nodes = [
      {
        id: 'n1',
        moduleType: 'INGESTION',
        label: 'Ingestion',
        labelHe: 'איסוף חומרים',
        enabled: true,
        order: 0,
        config: {},
      },
    ];
    render(
      <MemoryRouter>
        <LessonPipelinePage />
      </MemoryRouter>
    );
    const removeBtn = screen.getByRole('button', { name: '✕' });
    fireEvent.click(removeBtn);
    expect(mockStore.removeNode).toHaveBeenCalledWith('n1');
  });

  it('shows "שומר..." label while save mutation is fetching', () => {
    mockStore.isDirty = true;
    vi.mocked(urql.useMutation)
      .mockReturnValueOnce([{ fetching: true }, NOOP_EXECUTE] as never)
      .mockReturnValue(NOOP_MUTATION);

    render(
      <MemoryRouter>
        <LessonPipelinePage />
      </MemoryRouter>
    );
    expect(screen.getByText('שומר...')).toBeInTheDocument();
  });

  it('navigates back to lesson when back button is clicked', () => {
    render(
      <MemoryRouter>
        <LessonPipelinePage />
      </MemoryRouter>
    );
    const backBtn = screen.getByText(/Test Lesson/);
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/courses/course-1/lessons/lesson-1'
    );
  });
});
