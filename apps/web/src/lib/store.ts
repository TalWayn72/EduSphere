import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

type DocumentZoom = 0.75 | 1 | 1.25 | 1.5;

interface DocumentUIState {
  documentZoom: DocumentZoom;
  annotationPanelWidth: number;
  setDocumentZoom: (z: DocumentZoom) => void;
  setAnnotationPanelWidth: (w: number) => void;
}

export const useDocumentUIStore = create<DocumentUIState>()(
  persist(
    (set) => ({
      documentZoom: 1,
      annotationPanelWidth: 35,
      setDocumentZoom: (z) => set({ documentZoom: z }),
      setAnnotationPanelWidth: (w) => set({ annotationPanelWidth: w }),
    }),
    { name: 'edusphere-document-ui' },
  ),
);
