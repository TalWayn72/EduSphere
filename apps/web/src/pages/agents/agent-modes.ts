/**
 * Agent mode definitions, types, and constants.
 *
 * Extracted from AgentsPage to keep the main component under 150 lines.
 */
import type React from 'react';

// ─── Agent mode shape ─────────────────────────────────────────────────────────

export interface AgentModeDefinition {
  readonly id: string;
  readonly label: string;
  readonly icon: React.ReactNode;
  readonly color: string;
  readonly bg: string;
  readonly description: string;
  readonly prompts: readonly string[];
  readonly responses: readonly string[];
}

export interface ChatMsg {
  id: string;
  role: 'user' | 'agent';
  content: string;
}

// Re-export the tuple type derived from the mode array
export type AgentModeId =
  | 'chavruta'
  | 'quiz'
  | 'summarize'
  | 'research'
  | 'explain';

// Maps local mode id → GraphQL TemplateType enum value
export const TEMPLATE_TYPE: Record<AgentModeId, string> = {
  chavruta: 'CHAVRUTA_DEBATE',
  quiz: 'QUIZ_ASSESS',
  summarize: 'SUMMARIZE',
  research: 'RESEARCH_SCOUT',
  explain: 'EXPLAIN',
};

export const INITIAL_MESSAGES: Record<AgentModeId, string> = {
  chavruta:
    "שלום! I'm your Chavruta partner. Present an argument and I will challenge it.",
  quiz: 'Ready to test your knowledge! Tell me which topic to quiz you on.',
  summarize:
    'I can summarize any lesson or concept. Which content would you like summarized?',
  research:
    'Research mode active. I will find cross-references and contradictions. What should I investigate?',
  explain:
    'Explain mode ready. Tell me what concept you want explained and at what level.',
};

export function buildInitialSessions(): Record<AgentModeId, ChatMsg[]> {
  return Object.fromEntries(
    (Object.keys(INITIAL_MESSAGES) as AgentModeId[]).map((id) => [
      id,
      [{ id: '0', role: 'agent' as const, content: INITIAL_MESSAGES[id] }],
    ])
  ) as Record<AgentModeId, ChatMsg[]>;
}
