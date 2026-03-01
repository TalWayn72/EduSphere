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

export const MODULE_LABELS: Record<PipelineModuleType, { en: string; he: string }> = {
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

interface LessonPipelineState {
  nodes: PipelineNode[];
  isDirty: boolean;
  selectedNodeId: string | null;
  setNodes: (nodes: PipelineNode[]) => void;
  addNode: (moduleType: PipelineModuleType) => void;
  removeNode: (id: string) => void;
  reorderNodes: (fromIdx: number, toIdx: number) => void;
  toggleNode: (id: string) => void;
  updateNodeConfig: (id: string, config: Record<string, unknown>) => void;
  loadTemplate: (templateName: 'THEMATIC' | 'SEQUENTIAL') => void;
  setSelectedNode: (id: string | null) => void;
  resetDirty: () => void;
}

export const useLessonPipelineStore = create<LessonPipelineState>()((set, get) => ({
  nodes: [],
  isDirty: false,
  selectedNodeId: null,

  setNodes: (nodes) => set({ nodes, isDirty: true }),

  addNode: (moduleType) => {
    const nodes = get().nodes;
    set({
      nodes: [...nodes, makeNode(moduleType, nodes.length)],
      isDirty: true,
    });
  },

  removeNode: (id) => {
    set({
      nodes: get()
        .nodes.filter((n) => n.id !== id)
        .map((n, i) => ({ ...n, order: i })),
      isDirty: true,
    });
  },

  reorderNodes: (fromIdx, toIdx) => {
    const nodes = [...get().nodes];
    const [moved] = nodes.splice(fromIdx, 1) as [PipelineNode];
    nodes.splice(toIdx, 0, moved);
    set({
      nodes: nodes.map((n, i) => ({ ...n, order: i })),
      isDirty: true,
    });
  },

  toggleNode: (id) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, enabled: !n.enabled } : n
      ),
      isDirty: true,
    });
  },

  updateNodeConfig: (id, config) => {
    set({
      nodes: get().nodes.map((n) => (n.id === id ? { ...n, config } : n)),
      isDirty: true,
    });
  },

  loadTemplate: (templateName) => {
    const modules =
      templateName === 'THEMATIC' ? THEMATIC_TEMPLATE : SEQUENTIAL_TEMPLATE;
    set({
      nodes: modules.map((m, i) => makeNode(m, i)),
      isDirty: false,
    });
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  resetDirty: () => set({ isDirty: false }),
}));
