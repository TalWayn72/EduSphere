import { create } from 'zustand';

export type PipelineModuleType =
  | 'INGESTION'
  | 'ASR'
  | 'NER_SOURCE_LINKING'
  | 'CONTENT_CLEANING'
  | 'SUMMARIZATION'
  | 'STRUCTURED_NOTES'
  | 'DIAGRAM_GENERATOR'
  | 'CITATION_VERIFIER'
  | 'QA_GATE'
  | 'PUBLISH_SHARE';

export interface PipelineNode {
  id: string;
  moduleType: PipelineModuleType;
  label: string;
  labelHe: string;
  enabled: boolean;
  order: number;
  config: Record<string, unknown>;
}

export const MODULE_LABELS: Record<
  PipelineModuleType,
  { en: string; he: string }
> = {
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
};

function makeNode(moduleType: PipelineModuleType, order: number): PipelineNode {
  return {
    id: `${moduleType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    moduleType,
    label: MODULE_LABELS[moduleType].en,
    labelHe: MODULE_LABELS[moduleType].he,
    enabled: true,
    order,
    config: {},
  };
}

const THEMATIC_TEMPLATE: PipelineModuleType[] = [
  'INGESTION',
  'ASR',
  'NER_SOURCE_LINKING',
  'CONTENT_CLEANING',
  'SUMMARIZATION',
  'STRUCTURED_NOTES',
  'QA_GATE',
  'PUBLISH_SHARE',
];

const SEQUENTIAL_TEMPLATE: PipelineModuleType[] = [
  'INGESTION',
  'ASR',
  'NER_SOURCE_LINKING',
  'CONTENT_CLEANING',
  'CITATION_VERIFIER',
  'STRUCTURED_NOTES',
  'DIAGRAM_GENERATOR',
  'QA_GATE',
  'PUBLISH_SHARE',
];

export type ModuleStatusValue = 'pending' | 'running' | 'done' | 'failed';

const MAX_UNDO_STACK = 50;

interface UndoSnapshot {
  nodes: PipelineNode[];
  selectedNodeId: string | null;
}

interface LessonPipelineState {
  nodes: PipelineNode[];
  isDirty: boolean;
  selectedNodeId: string | null;
  moduleStatuses: Record<string, ModuleStatusValue>;
  undoStack: UndoSnapshot[];
  redoStack: UndoSnapshot[];
  canUndo: boolean;
  canRedo: boolean;
  setNodes: (nodes: PipelineNode[]) => void;
  addNode: (moduleType: PipelineModuleType) => void;
  removeNode: (id: string) => void;
  reorderNodes: (fromIdx: number, toIdx: number) => void;
  toggleNode: (id: string) => void;
  updateNodeConfig: (id: string, config: Record<string, unknown>) => void;
  clearNodes: () => void;
  loadTemplate: (templateName: 'THEMATIC' | 'SEQUENTIAL' | 'CUSTOM') => void;
  loadServerTemplate: (
    nodes: Array<{ moduleType: string; [key: string]: unknown }>
  ) => void;
  setSelectedNode: (id: string | null) => void;
  resetDirty: () => void;
  setModuleStatus: (moduleType: string, status: ModuleStatusValue) => void;
  resetModuleStatuses: () => void;
  undo: () => void;
  redo: () => void;
}

function pushSnapshot(
  state: LessonPipelineState
): Pick<
  LessonPipelineState,
  'undoStack' | 'redoStack' | 'canUndo' | 'canRedo'
> {
  const snapshot: UndoSnapshot = {
    nodes: state.nodes.map((n) => ({ ...n })),
    selectedNodeId: state.selectedNodeId,
  };
  const newStack = [...state.undoStack, snapshot].slice(-MAX_UNDO_STACK);
  return { undoStack: newStack, redoStack: [], canUndo: true, canRedo: false };
}

export const useLessonPipelineStore = create<LessonPipelineState>()(
  (set, get) => ({
    nodes: [],
    isDirty: false,
    selectedNodeId: null,
    moduleStatuses: {},
    undoStack: [],
    redoStack: [],
    canUndo: false,
    canRedo: false,

    setNodes: (nodes) => set({ nodes, isDirty: true }),

    addNode: (moduleType) => {
      const state = get();
      const snap = pushSnapshot(state);
      set({
        nodes: [...state.nodes, makeNode(moduleType, state.nodes.length)],
        isDirty: true,
        ...snap,
      });
    },

    removeNode: (id) => {
      const state = get();
      const snap = pushSnapshot(state);
      set({
        nodes: state.nodes
          .filter((n) => n.id !== id)
          .map((n, i) => ({ ...n, order: i })),
        isDirty: true,
        ...snap,
      });
    },

    reorderNodes: (fromIdx, toIdx) => {
      const state = get();
      const snap = pushSnapshot(state);
      const nodes = [...state.nodes];
      const [moved] = nodes.splice(fromIdx, 1) as [PipelineNode];
      nodes.splice(toIdx, 0, moved);
      set({
        nodes: nodes.map((n, i) => ({ ...n, order: i })),
        isDirty: true,
        ...snap,
      });
    },

    toggleNode: (id) => {
      const state = get();
      const snap = pushSnapshot(state);
      set({
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, enabled: !n.enabled } : n
        ),
        isDirty: true,
        ...snap,
      });
    },

    updateNodeConfig: (id, config) => {
      const state = get();
      const snap = pushSnapshot(state);
      set({
        nodes: state.nodes.map((n) => (n.id === id ? { ...n, config } : n)),
        isDirty: true,
        ...snap,
      });
    },

    clearNodes: () => {
      const state = get();
      const snap = pushSnapshot(state);
      set({ nodes: [], isDirty: false, selectedNodeId: null, ...snap });
    },

    loadTemplate: (templateName) => {
      const state = get();
      const snap = pushSnapshot(state);
      if (templateName === 'CUSTOM') {
        set({ nodes: [], isDirty: false, selectedNodeId: null, ...snap });
        return;
      }
      const modules =
        templateName === 'THEMATIC' ? THEMATIC_TEMPLATE : SEQUENTIAL_TEMPLATE;
      set({
        nodes: modules.map((m, i) => makeNode(m, i)),
        isDirty: false,
        ...snap,
      });
    },

    loadServerTemplate: (serverNodes) => {
      const state = get();
      const snap = pushSnapshot(state);
      const nodes = serverNodes
        .filter((n) => n.moduleType in MODULE_LABELS)
        .map((n, i) => makeNode(n.moduleType as PipelineModuleType, i));
      set({ nodes, isDirty: true, ...snap });
    },

    setSelectedNode: (id) => set({ selectedNodeId: id }),

    resetDirty: () => set({ isDirty: false }),

    setModuleStatus: (moduleType, status) =>
      set((state) => ({
        moduleStatuses: { ...state.moduleStatuses, [moduleType]: status },
      })),

    resetModuleStatuses: () => set({ moduleStatuses: {} }),

    undo: () => {
      const state = get();
      if (state.undoStack.length === 0) return;
      const prev = state.undoStack[state.undoStack.length - 1]!;
      const currentSnapshot: UndoSnapshot = {
        nodes: state.nodes.map((n) => ({ ...n })),
        selectedNodeId: state.selectedNodeId,
      };
      const newUndo = state.undoStack.slice(0, -1);
      const newRedo = [...state.redoStack, currentSnapshot].slice(
        -MAX_UNDO_STACK
      );
      set({
        nodes: prev.nodes,
        selectedNodeId: prev.selectedNodeId,
        isDirty: true,
        undoStack: newUndo,
        redoStack: newRedo,
        canUndo: newUndo.length > 0,
        canRedo: true,
      });
    },

    redo: () => {
      const state = get();
      if (state.redoStack.length === 0) return;
      const next = state.redoStack[state.redoStack.length - 1]!;
      const currentSnapshot: UndoSnapshot = {
        nodes: state.nodes.map((n) => ({ ...n })),
        selectedNodeId: state.selectedNodeId,
      };
      const newRedo = state.redoStack.slice(0, -1);
      const newUndo = [...state.undoStack, currentSnapshot].slice(
        -MAX_UNDO_STACK
      );
      set({
        nodes: next.nodes,
        selectedNodeId: next.selectedNodeId,
        isDirty: true,
        undoStack: newUndo,
        redoStack: newRedo,
        canUndo: true,
        canRedo: newRedo.length > 0,
      });
    },
  })
);
