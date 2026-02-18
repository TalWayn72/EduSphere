export type AgentType =
  | 'chavruta'
  | 'quiz-master'
  | 'research-scout'
  | 'summarizer'
  | 'explainer';

export interface AgentInfo {
  id: AgentType;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export const AGENT_TYPES: Record<AgentType, AgentInfo> = {
  'chavruta': {
    id: 'chavruta',
    name: 'Chavruta',
    icon: '🗣️',
    description: 'Debate Partner - Challenges your thinking through dialectical questioning',
    color: 'text-blue-600',
  },
  'quiz-master': {
    id: 'quiz-master',
    name: 'Quiz Master',
    icon: '📝',
    description: 'Assessment - Creates adaptive quizzes to test understanding',
    color: 'text-purple-600',
  },
  'research-scout': {
    id: 'research-scout',
    name: 'Research Scout',
    icon: '🔍',
    description: 'Discovery - Finds relevant sources and connections in knowledge graph',
    color: 'text-green-600',
  },
  'summarizer': {
    id: 'summarizer',
    name: 'Summarizer',
    icon: '📚',
    description: 'Synthesis - Distills complex texts into key insights',
    color: 'text-orange-600',
  },
  'explainer': {
    id: 'explainer',
    name: 'Explainer',
    icon: '💡',
    description: 'Teaching - Breaks down difficult concepts step-by-step',
    color: 'text-yellow-600',
  },
};
