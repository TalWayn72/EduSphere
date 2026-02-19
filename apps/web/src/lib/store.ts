import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  activeAnnotationId: string | null;
  agentChatOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setActiveAnnotationId: (id: string | null) => void;
  setAgentChatOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeAnnotationId: null,
  agentChatOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveAnnotationId: (id) => set({ activeAnnotationId: id }),
  setAgentChatOpen: (open) => set({ agentChatOpen: open }),
}));
