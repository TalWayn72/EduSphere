import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────────────────────────────

export type LiveSessionTab = 'transcript' | 'chat' | 'qa' | 'notes' | 'glossary';

// ── Store interface ────────────────────────────────────────────────────────────

interface LiveSessionStore {
  activeTab: LiveSessionTab;
  isMuted: boolean;
  reactionCooldown: boolean;
  draftNote: string;
  replyToMessageId: string | null;

  setActiveTab(tab: LiveSessionTab): void;
  toggleMute(): void;
  setReactionCooldown(value: boolean): void;
  setDraftNote(note: string): void;
  setReplyTo(messageId: string): void;
  clearReplyTo(): void;
  reset(): void;
}

// ── Initial state ──────────────────────────────────────────────────────────────

const INITIAL_STATE = {
  activeTab: 'transcript' as LiveSessionTab,
  isMuted: false,
  reactionCooldown: false,
  draftNote: '',
  replyToMessageId: null,
};

// ── Store ──────────────────────────────────────────────────────────────────────

export const useLiveSessionStore = create<LiveSessionStore>()((set) => ({
  ...INITIAL_STATE,

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  setReactionCooldown: (value) => set({ reactionCooldown: value }),

  setDraftNote: (note) => set({ draftNote: note }),

  setReplyTo: (messageId) => set({ replyToMessageId: messageId }),

  clearReplyTo: () => set({ replyToMessageId: null }),

  reset: () => set({ ...INITIAL_STATE }),
}));
