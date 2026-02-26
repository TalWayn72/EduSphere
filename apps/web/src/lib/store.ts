import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AnnotationLayer } from '@/types/annotations';

interface UIState {
  sidebarOpen: boolean;
  activeAnnotationId: string | null;
  agentChatOpen: boolean;
  focusedAnnotationId: string | null;
  setSidebarOpen: (open: boolean) => void;
  setActiveAnnotationId: (id: string | null) => void;
  setAgentChatOpen: (open: boolean) => void;
  setFocusedAnnotationId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeAnnotationId: null,
  agentChatOpen: false,
  focusedAnnotationId: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveAnnotationId: (id) => set({ activeAnnotationId: id }),
  setAgentChatOpen: (open) => set({ agentChatOpen: open }),
  setFocusedAnnotationId: (id) => set({ focusedAnnotationId: id }),
}));

// ── Document UI Store (persisted) ─────────────────────────────────────────────

interface DocumentUIState {
  documentZoom: 0.75 | 1 | 1.25 | 1.5;
  annotationPanelWidth: number;
  defaultAnnotationLayer: AnnotationLayer;
  setDocumentZoom: (zoom: 0.75 | 1 | 1.25 | 1.5) => void;
  setAnnotationPanelWidth: (width: number) => void;
  setDefaultAnnotationLayer: (layer: AnnotationLayer) => void;
}

export const useDocumentUIStore = create<DocumentUIState>()(
  persist(
    (set) => ({
      documentZoom: 1,
      annotationPanelWidth: 35,
      defaultAnnotationLayer: AnnotationLayer.PERSONAL,
      setDocumentZoom: (zoom) => set({ documentZoom: zoom }),
      setAnnotationPanelWidth: (width) => set({ annotationPanelWidth: width }),
      setDefaultAnnotationLayer: (layer) =>
        set({ defaultAnnotationLayer: layer }),
    }),
    {
      name: 'edusphere-document-ui',
      partialize: (state) => ({
        documentZoom: state.documentZoom,
        annotationPanelWidth: state.annotationPanelWidth,
        defaultAnnotationLayer: state.defaultAnnotationLayer,
      }),
    }
  )
);
