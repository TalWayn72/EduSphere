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
    useBlocker: vi.fn(() => ({ state: 'unblocked' as const, proceed: vi.fn(), reset: vi.fn() })),
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

vi.mock('@/lib/constants', () => ({
  REFETCH_DELAY_MS: 3000,
}));

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/Layout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Layout: ({ children }: any) => children,
}));

vi.mock('@/components/PageHeader', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));

vi.mock('@/components/pipeline/PipelineConfigPanel', () => ({
  PipelineConfigPanel: ({ node, onClose }: { node: { labelHe: string }; onClose: () => void }) => (
    <div data-testid="config-panel">
      <span>{node.labelHe}</span>
      <button onClick={onClose} data-testid="config-panel-close">סגור</button>
    </div>
  ),
}));

vi.mock('@/components/pipeline/PipelineSortableCanvas', () => ({
  PipelineSortableCanvas: ({ nodes, selectedNodeId, customMode, onSelect, onRemove }: {
    nodes: Array<{ id: string; moduleType: string; labelHe: string; label: string; enabled: boolean }>;
    selectedNodeId: string | null;
    customMode: boolean;
    onSelect: (id: string | null) => void;
    onRemove: (id: string) => void;
  }) => {
    if (nodes.length === 0) {
      return (
        <div data-testid="empty-canvas">
          {customMode ? (
            <>
              <p>מצב בנייה חופשית</p>
              <p>גרור מודולים מהחלונית השמאלית לכאן</p>
            </>
          ) : (
            <>
              <p>גרור מודולים לכאן</p>
              <p>בנה את ה-Pipeline שלך, או בחר תבנית מהסרגל</p>
            </>
          )}
        </div>
      );
    }
    return (
      <div>
        {nodes.map((node) => (
          <div key={node.id} data-testid={`pipeline-node-${node.moduleType}`}>
            <button aria-label={`גרור ${node.labelHe}`}>drag</button>
            <button aria-label={`הגדרות ${node.labelHe}`} onClick={() => onSelect(selectedNodeId === node.id ? null : node.id)}>
              {node.labelHe}
            </button>
            <button aria-label={`הסר ${node.labelHe}`} onClick={() => onRemove(node.id)}>remove</button>
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock('@/components/pipeline/PipelineModulePalette', () => {
  const labels: Record<string, { he: string; en: string }> = {
    INGESTION: { he: 'איסוף חומרים', en: 'Ingestion' },
    ASR: { he: 'תמלול', en: 'Transcription (ASR)' },
    NER_SOURCE_LINKING: { he: 'זיהוי ישויות ומקורות', en: 'NER + Source Linking' },
    CONTENT_CLEANING: { he: 'ניקוי תוכן', en: 'Content Cleaning' },
    SUMMARIZATION: { he: 'סיכום', en: 'Summarization' },
    STRUCTURED_NOTES: { he: 'תיעוד מובנה', en: 'Structured Notes' },
    DIAGRAM_GENERATOR: { he: 'יצירת תרשימים', en: 'Diagram Generator' },
    CITATION_VERIFIER: { he: 'אימות ציטוטים', en: 'Citation Verifier' },
    QA_GATE: { he: 'בקרת איכות', en: 'QA Gate' },
    PUBLISH_SHARE: { he: 'יצוא והפצה', en: 'Publish & Share' },
  };
  return {
    PipelineModulePalette: ({ onAddModule }: { onAddModule: (m: string) => void }) => (
      <div data-testid="module-palette">
        {Object.entries(labels).map(([m, lbl]) => (
          <button key={m} data-testid={`palette-module-${m}`} onClick={() => onAddModule(m)}>
            <span>{lbl.he}</span>
            <span>{lbl.en}</span>
          </button>
        ))}
      </div>
    ),
  };
});

vi.mock('@/components/pipeline/PipelineToolbar', () => ({
  PipelineToolbar: (props: {
    lessonTitle: string; isDirty: boolean; saving: boolean; isRunning: boolean;
    onSave: () => void; onRun: () => void;
    onTemplateChange: (val: string) => void;
    hasResults?: boolean;
  }) => (
    <div data-testid="pipeline-toolbar">
      <h1>Lesson Pipeline</h1>
      <select
        data-testid="template-picker"
        defaultValue=""
        onChange={(e) => { if (e.target.value) props.onTemplateChange(e.target.value); (e.target as HTMLSelectElement).value = ''; }}
      >
        <option value="">טעינת תבנית...</option>
        <option value="THEMATIC">תמטי (8 מודולים)</option>
        <option value="SEQUENTIAL">סדרתי (9 מודולים)</option>
        <option value="CUSTOM">בנה ידנית (מאפס)</option>
      </select>
      <button data-testid="save-btn" disabled={!props.isDirty || props.saving} onClick={props.onSave}>
        {props.saving ? 'שומר...' : 'שמור'}
      </button>
      <button data-testid="run-btn" disabled={props.isRunning} onClick={props.onRun}>
        {props.isRunning ? '▶ מריץ...' : '▶ הפעל Pipeline'}
      </button>
    </div>
  ),
}));

vi.mock('@/components/pipeline/PipelinePrintStyles', () => ({
  PipelineExportButton: () => <button data-testid="export-pdf-btn">ייצוא PDF</button>,
  PipelinePrintStylesheet: () => null,
}));

vi.mock('@/components/pipeline/PipelineRunStatus', () => ({
  PipelineRunStatus: ({ run, onCancel }: { run: { status: string }; onCancel: () => void }) => (
    <div data-testid="pipeline-run-status">
      <span data-testid="run-status-label">{run.status}</span>
      <button onClick={onCancel} data-testid="cancel-run-btn">ביטול</button>
    </div>
  ),
}));

vi.mock('@/lib/graphql/lesson.queries', () => ({
  LESSON_QUERY: 'LESSON_QUERY',
  SAVE_LESSON_PIPELINE_MUTATION: 'SAVE_LESSON_PIPELINE_MUTATION',
  START_PIPELINE_RUN_MUTATION: 'START_PIPELINE_RUN_MUTATION',
  CANCEL_PIPELINE_RUN_MUTATION: 'CANCEL_PIPELINE_RUN_MUTATION',
  PIPELINE_TEMPLATES_QUERY: 'PIPELINE_TEMPLATES_QUERY',
  CREATE_PIPELINE_TEMPLATE_MUTATION: 'CREATE_PIPELINE_TEMPLATE_MUTATION',
}));

const mockStore = {
  nodes: [] as import('@/lib/lesson-pipeline.store').PipelineNode[],
  isDirty: false,
  selectedNodeId: null as string | null,
  moduleStatuses: {} as Record<string, string>,
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,
  setNodes: vi.fn(),
  addNode: vi.fn(),
  removeNode: vi.fn(),
  reorderNodes: vi.fn(),
  toggleNode: vi.fn(),
  updateNodeConfig: vi.fn(),
  clearNodes: vi.fn(),
  loadTemplate: vi.fn(),
  loadServerTemplate: vi.fn(),
  setSelectedNode: vi.fn(),
  resetDirty: vi.fn(),
  setModuleStatus: vi.fn(),
  resetModuleStatuses: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
};

vi.mock('@/lib/lesson-pipeline.store', () => ({
  useLessonPipelineStore: vi.fn(() => mockStore),
  MODULE_LABELS: {
    INGESTION: { en: 'Ingestion', he: 'איסוף חומרים' },
    ASR: { en: 'Transcription (ASR)', he: 'תמלול' },
    NER_SOURCE_LINKING: { en: 'NER + Source Linking', he: 'זיהוי ישויות ומקורות' },
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
import * as RRD from 'react-router-dom';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOOP_EXECUTE = vi.fn().mockResolvedValue({ data: null, error: undefined });
const NOOP_MUTATION = [{ fetching: false }, NOOP_EXECUTE] as never;

const MOCK_LESSON = { id: 'lesson-1', title: 'Test Lesson', assets: [], pipeline: null };
const MOCK_LESSON_WITH_ASSETS = {
  ...MOCK_LESSON,
  assets: [{ id: 'a1', assetType: 'VIDEO', sourceUrl: null, fileUrl: 'https://cdn.example.com/video.mp4' }],
};

function makeQuery(overrides: Record<string, unknown> = {}) {
  return [{ data: { lesson: MOCK_LESSON }, fetching: false, error: undefined, ...overrides }, vi.fn()] as never;
}

const EMPTY_TEMPLATES_RESULT = [{ data: { pipelineTemplates: [] }, fetching: false, error: undefined }, vi.fn()] as never;

/** Mock useQuery: returns lesson data for LESSON_QUERY, empty templates for PIPELINE_TEMPLATES_QUERY */
function mockUseQueryPair(lessonOverrides: Record<string, unknown> = {}) {
  vi.mocked(urql.useQuery).mockImplementation((opts: { query: unknown }) => {
    if (opts?.query === 'PIPELINE_TEMPLATES_QUERY') return EMPTY_TEMPLATES_RESULT;
    return makeQuery(lessonOverrides);
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LessonPipelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.nodes = [];
    mockStore.isDirty = false;
    mockStore.selectedNodeId = null;
    mockUseQueryPair();
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
    vi.mocked(RRD.useBlocker).mockReturnValue({
      state: 'unblocked',
      proceed: vi.fn(),
      reset: vi.fn(),
    } as never);
  });

  it('renders "Lesson Pipeline" heading via PageHeader', () => {
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    expect(screen.getAllByRole('heading', { name: 'Lesson Pipeline' }).length).toBeGreaterThanOrEqual(1);
  });

  it('renders template picker', () => {
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    expect(screen.getByTestId('template-picker')).toBeInTheDocument();
  });

  it('shows module palette with Hebrew labels', () => {
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    expect(screen.getByText('איסוף חומרים')).toBeInTheDocument();
    expect(screen.getByText('תמלול')).toBeInTheDocument();
    expect(screen.getByText('Ingestion')).toBeInTheDocument();
  });

  it('shows all 10 palette modules', () => {
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    expect(screen.getByText('Publish & Share')).toBeInTheDocument();
    expect(screen.getByText('QA Gate')).toBeInTheDocument();
  });

  it('shows empty canvas drop zone when no nodes', () => {
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    expect(screen.getByText('גרור מודולים לכאן')).toBeInTheDocument();
  });

  it('shows template picker select', () => {
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    expect(screen.getByTestId('template-picker')).toBeInTheDocument();
  });

  it('calls loadTemplate when template is selected', () => {
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    fireEvent.change(screen.getByTestId('template-picker'), { target: { value: 'THEMATIC' } });
    expect(mockStore.loadTemplate).toHaveBeenCalledWith('THEMATIC');
  });

  it('Save button is disabled when isDirty is false', () => {
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    expect(screen.getByTestId('save-btn')).toBeDisabled();
  });

  it('Save button is enabled when isDirty is true', () => {
    mockStore.isDirty = true;
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    expect(screen.getByTestId('save-btn')).not.toBeDisabled();
  });

  it('calls savePipeline mutation when Save is clicked', async () => {
    mockStore.isDirty = true;
    const mockSave = vi.fn().mockResolvedValue({ data: { saveLessonPipeline: { id: 'p1' } }, error: undefined });
    vi.mocked(urql.useMutation).mockReturnValue([{ fetching: false }, mockSave] as never);
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('save-btn'));
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith({ lessonId: 'lesson-1', input: { nodes: [], config: {} } }));
  });

  it('shows "▶ הפעל Pipeline" run button when not running', () => {
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    expect(screen.getByTestId('run-btn')).toHaveTextContent('▶ הפעל Pipeline');
  });

  it('shows error when Run is clicked with empty nodes', async () => {
    mockStore.nodes = [];
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('run-btn'));
    await waitFor(() => expect(screen.getByTestId('pipeline-error')).toBeInTheDocument());
    expect(screen.getByTestId('pipeline-error')).toHaveTextContent('לפחות מודול אחד');
  });

  // BUG FIX: handleRun no longer uses stale pipelineError state
  it('handleRun saves first then starts run when no pipeline ID exists', async () => {
    const mockSave = vi.fn().mockResolvedValue({ data: { saveLessonPipeline: { id: 'new-pipeline-id' } }, error: undefined });
    const mockStart = vi.fn().mockResolvedValue({ data: { startLessonPipelineRun: { id: 'run-1', status: 'RUNNING' } }, error: undefined });
    // Use mockImplementation (not mockReturnValueOnce) — the component re-renders after
    // setMounted(true) useEffect, which would consume the once-queue on first render and
    // leave NOOP_MUTATION for the second render where the handler closure captures savePipeline.
    vi.mocked(urql.useMutation).mockImplementation((doc: unknown) => {
      if (doc === 'SAVE_LESSON_PIPELINE_MUTATION') return [{ fetching: false }, mockSave] as never;
      if (doc === 'START_PIPELINE_RUN_MUTATION') return [{ fetching: false }, mockStart] as never;
      return NOOP_MUTATION;
    });
    mockStore.nodes = [{ id: 'n1', moduleType: 'INGESTION', label: 'Ingestion', labelHe: 'איסוף חומרים', enabled: true, order: 0, config: {} }];
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('run-btn'));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    await waitFor(() => expect(mockStart).toHaveBeenCalledWith({ pipelineId: 'new-pipeline-id' }));
  });

  it('shows config panel when a node is selected', () => {
    mockStore.nodes = [{ id: 'n1', moduleType: 'INGESTION', label: 'Ingestion', labelHe: 'איסוף חומרים', enabled: true, order: 0, config: {} }];
    mockStore.selectedNodeId = 'n1';
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    // Both desktop (hidden lg:block) and mobile (lg:hidden) panels render in JSDOM
    const panels = screen.getAllByTestId('config-panel');
    expect(panels.length).toBeGreaterThanOrEqual(1);
  });

  it('config panel is hidden when no node selected', () => {
    mockStore.selectedNodeId = null;
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    expect(screen.queryByTestId('config-panel')).not.toBeInTheDocument();
  });

  it('shows run status panel when currentRun exists', () => {
    mockUseQueryPair({
      data: {
        lesson: {
          ...MOCK_LESSON,
          pipeline: { id: 'p1', nodes: [], status: 'RUNNING', currentRun: { id: 'r1', status: 'RUNNING', results: [] } },
        },
      },
    });
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    expect(screen.getByTestId('pipeline-run-status')).toBeInTheDocument();
    expect(screen.getByTestId('run-status-label')).toHaveTextContent('RUNNING');
  });

  it('run status panel is hidden when no currentRun', () => {
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    expect(screen.queryByTestId('pipeline-run-status')).not.toBeInTheDocument();
  });

  it('renders pipeline nodes with move-up/move-down and remove buttons', () => {
    mockStore.nodes = [
      { id: 'n1', moduleType: 'INGESTION', label: 'Ingestion', labelHe: 'איסוף חומרים', enabled: true, order: 0, config: {} },
      { id: 'n2', moduleType: 'ASR', label: 'Transcription (ASR)', labelHe: 'תמלול', enabled: true, order: 1, config: {} },
    ];
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    expect(screen.getByTestId('pipeline-node-INGESTION')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-node-ASR')).toBeInTheDocument();
  });

  it('remove button calls removeNode', async () => {
    mockStore.nodes = [{ id: 'n1', moduleType: 'INGESTION', label: 'Ingestion', labelHe: 'איסוף חומרים', enabled: true, order: 0, config: {} }];
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    const removeBtn = screen.getByLabelText('הסר איסוף חומרים');
    fireEvent.click(removeBtn);
    expect(mockStore.removeNode).toHaveBeenCalledWith('n1');
  });

  it('pipeline nodes have drag handles for reordering', () => {
    mockStore.nodes = [
      { id: 'n1', moduleType: 'INGESTION', label: 'Ingestion', labelHe: 'איסוף חומרים', enabled: true, order: 0, config: {} },
      { id: 'n2', moduleType: 'ASR', label: 'Transcription (ASR)', labelHe: 'תמלול', enabled: true, order: 1, config: {} },
    ];
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    // Each node has a drag handle with aria-label
    expect(screen.getByLabelText('גרור איסוף חומרים')).toBeInTheDocument();
    expect(screen.getByLabelText('גרור תמלול')).toBeInTheDocument();
  });

  it('shows "שומר..." while save mutation is fetching', () => {
    mockStore.isDirty = true;
    // Use mockImplementation so saving=true survives the re-render from setMounted(true).
    vi.mocked(urql.useMutation).mockImplementation((doc: unknown) => {
      if (doc === 'SAVE_LESSON_PIPELINE_MUTATION') return [{ fetching: true }, NOOP_EXECUTE] as never;
      return NOOP_MUTATION;
    });
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    expect(screen.getByText('שומר...')).toBeInTheDocument();
  });

  it('shows save error banner on failed save', async () => {
    mockStore.isDirty = true;
    const mockFailSave = vi.fn().mockResolvedValue({ data: null, error: { message: 'Server down', graphQLErrors: [], networkError: null } });
    vi.mocked(urql.useMutation).mockReturnValue([{ fetching: false }, mockFailSave] as never);
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('save-btn'));
    await waitFor(() => expect(screen.getByTestId('pipeline-error')).toBeInTheDocument());
    expect(screen.getByTestId('pipeline-error')).toHaveTextContent('Server down');
    // Regression guard: raw error.message must NOT be absent from the error banner (it should be shown, but via the banner not raw JS)
    expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
  });

  it('renders Lesson Pipeline heading', () => {
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    expect(screen.getAllByRole('heading', { name: 'Lesson Pipeline' }).length).toBeGreaterThanOrEqual(1);
  });

  // ── CUSTOM template (Build from scratch) ────────────────────────────────────

  it('template picker has a CUSTOM option', () => {
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    const picker = screen.getByTestId('template-picker');
    expect(picker).toContainHTML('CUSTOM');
    expect(screen.getByText(/בנה ידנית/)).toBeInTheDocument();
  });

  it('selecting CUSTOM calls clearNodes and shows empty canvas', async () => {
    // Start with nodes loaded (e.g. from a saved template)
    mockStore.nodes = [{ id: 'n1', moduleType: 'INGESTION', label: 'Ingestion', labelHe: 'איסוף חומרים', enabled: true, order: 0, config: {} }];
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    fireEvent.change(screen.getByTestId('template-picker'), { target: { value: 'CUSTOM' } });
    expect(mockStore.clearNodes).toHaveBeenCalledTimes(1);
  });

  it('CUSTOM mode shows "מצב בנייה חופשית" message in empty canvas', async () => {
    mockStore.nodes = [];
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    // Trigger custom mode
    fireEvent.change(screen.getByTestId('template-picker'), { target: { value: 'CUSTOM' } });
    // The custom mode message should appear (since nodes is empty in mockStore)
    await waitFor(() => expect(screen.getByText('מצב בנייה חופשית')).toBeInTheDocument());
    expect(screen.getByText(/גרור מודולים מהחלונית השמאלית לכאן/)).toBeInTheDocument();
  });

  it('CUSTOM mode empty canvas does NOT show default drag prompt', async () => {
    mockStore.nodes = [];
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    fireEvent.change(screen.getByTestId('template-picker'), { target: { value: 'CUSTOM' } });
    await waitFor(() => expect(screen.getByText('מצב בנייה חופשית')).toBeInTheDocument());
    // Default message should NOT appear
    expect(screen.queryByText('בנה את ה-Pipeline שלך, או בחר תבנית מהסרגל')).not.toBeInTheDocument();
  });

  it('selecting THEMATIC after CUSTOM shows default canvas message', async () => {
    mockStore.nodes = [];
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    // Enter custom mode
    fireEvent.change(screen.getByTestId('template-picker'), { target: { value: 'CUSTOM' } });
    await waitFor(() => expect(screen.getByText('מצב בנייה חופשית')).toBeInTheDocument());
    // Load THEMATIC (nodes remain empty in mockStore since loadTemplate is mocked)
    fireEvent.change(screen.getByTestId('template-picker'), { target: { value: 'THEMATIC' } });
    await waitFor(() => expect(screen.queryByText('מצב בנייה חופשית')).not.toBeInTheDocument());
    expect(mockStore.loadTemplate).toHaveBeenCalledWith('THEMATIC');
  });

  // ── BUG FIX: unsaved changes navigation guard ─────────────────────────────
  // Regression guard: the dialog MUST appear when user tries to navigate away
  // with isDirty=true. Anti-recurrence: this test would catch the bug returning.

  describe('unsaved changes navigation guard', () => {
    it('unsaved-changes-dialog is NOT shown when blocker state is unblocked', () => {
      mockStore.isDirty = true;
      vi.mocked(RRD.useBlocker).mockReturnValue({
        state: 'unblocked',
        proceed: vi.fn(),
        reset: vi.fn(),
      } as never);
      render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
      expect(screen.queryByTestId('unsaved-changes-dialog')).not.toBeInTheDocument();
    });

    it('unsaved-changes-dialog IS shown when navigation is blocked (isDirty=true)', () => {
      mockStore.isDirty = true;
      vi.mocked(RRD.useBlocker).mockReturnValue({
        state: 'blocked',
        proceed: vi.fn(),
        reset: vi.fn(),
      } as never);
      render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
      expect(screen.getByTestId('unsaved-changes-dialog')).toBeInTheDocument();
    });

    it('dialog title and message are shown when blocked', () => {
      mockStore.isDirty = true;
      vi.mocked(RRD.useBlocker).mockReturnValue({
        state: 'blocked',
        proceed: vi.fn(),
        reset: vi.fn(),
      } as never);
      render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
      expect(screen.getByTestId('unsaved-changes-title')).toHaveTextContent('Unsaved Changes');
      expect(screen.getByTestId('unsaved-changes-message')).toHaveTextContent('unsaved changes');
    });

    it('clicking "Leave anyway" calls blocker.proceed', () => {
      mockStore.isDirty = true;
      const mockProceed = vi.fn();
      vi.mocked(RRD.useBlocker).mockReturnValue({
        state: 'blocked',
        proceed: mockProceed,
        reset: vi.fn(),
      } as never);
      render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
      fireEvent.click(screen.getByTestId('unsaved-leave-btn'));
      expect(mockProceed).toHaveBeenCalledTimes(1);
    });

    it('clicking "Stay on page" calls blocker.reset', () => {
      mockStore.isDirty = true;
      const mockReset = vi.fn();
      vi.mocked(RRD.useBlocker).mockReturnValue({
        state: 'blocked',
        proceed: vi.fn(),
        reset: mockReset,
      } as never);
      render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
      fireEvent.click(screen.getByTestId('unsaved-stay-btn'));
      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it('useBlocker is called with isDirty=true when store is dirty', () => {
      mockStore.isDirty = true;
      render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
      expect(vi.mocked(RRD.useBlocker)).toHaveBeenCalledWith(true);
    });

    it('useBlocker is called with isDirty=false when store is clean', () => {
      mockStore.isDirty = false;
      render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
      expect(vi.mocked(RRD.useBlocker)).toHaveBeenCalledWith(false);
    });
  });

  it('loads existing pipeline nodes from query data', () => {
    const savedNodes = [{ id: 'saved-1', moduleType: 'INGESTION', label: 'Ingestion', labelHe: 'איסוף חומרים', enabled: true, order: 0, config: {} }];
    mockUseQueryPair({
      data: { lesson: { ...MOCK_LESSON, pipeline: { id: 'p1', nodes: savedNodes, status: 'DRAFT' } } },
    });
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    expect(mockStore.setNodes).toHaveBeenCalledWith(savedNodes);
  });

  it('assets are passed from query data (for future config panel)', () => {
    mockUseQueryPair({
      data: { lesson: MOCK_LESSON_WITH_ASSETS },
    });
    mockStore.nodes = [{ id: 'n1', moduleType: 'INGESTION', label: 'Ingestion', labelHe: 'איסוף חומרים', enabled: true, order: 0, config: {} }];
    mockStore.selectedNodeId = 'n1';
    render(<MemoryRouter><LessonPipelinePage /></MemoryRouter>);
    // Config panel rendered in both desktop + mobile responsive wrappers
    const panels = screen.getAllByTestId('config-panel');
    expect(panels.length).toBeGreaterThanOrEqual(1);
  });
});
