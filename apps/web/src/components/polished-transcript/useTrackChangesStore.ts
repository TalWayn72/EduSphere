/**
 * Zustand store for local track-changes UI state.
 *
 * Keeps optimistic decision overrides so the UI updates immediately
 * while GraphQL mutations propagate in the background.
 */
import { create } from 'zustand';
import type {
  PolishedChangeStatus,
  TrackChangesUIState,
} from './polished-transcript.types';

export const useTrackChangesStore = create<TrackChangesUIState>((set) => ({
  decisions: {},

  setDecision: (changeId: string, decision: PolishedChangeStatus) =>
    set((state) => ({
      decisions: { ...state.decisions, [changeId]: decision },
    })),

  acceptAll: (changeIds: string[]) =>
    set((state) => ({
      decisions: {
        ...state.decisions,
        ...Object.fromEntries(
          changeIds.map((id) => [id, 'ACCEPTED' as PolishedChangeStatus])
        ),
      },
    })),

  rejectAll: (changeIds: string[]) =>
    set((state) => ({
      decisions: {
        ...state.decisions,
        ...Object.fromEntries(
          changeIds.map((id) => [id, 'REJECTED' as PolishedChangeStatus])
        ),
      },
    })),

  resetDecisions: () => set({ decisions: {} }),
}));
