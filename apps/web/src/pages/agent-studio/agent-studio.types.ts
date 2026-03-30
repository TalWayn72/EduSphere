/**
 * AgentStudio — shared types and node metadata.
 */
import {
  Play,
  Brain,
  Zap,
  MessageSquare,
  BookOpen,
  StopCircle,
} from 'lucide-react';
import React from 'react';

// ── Node types ────────────────────────────────────────────────────────────────

export type NodeType =
  | 'START'
  | 'ASSESS'
  | 'EXPLAIN'
  | 'QUIZ'
  | 'DEBATE'
  | 'END';

export const NODE_META: Record<
  NodeType,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  START:   { label: 'Start',   icon: React.createElement(Play, { className: 'h-4 w-4' }),          color: 'text-green-700',  bg: 'bg-green-50 border-green-300' },
  ASSESS:  { label: 'Assess',  icon: React.createElement(Brain, { className: 'h-4 w-4' }),         color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-300' },
  EXPLAIN: { label: 'Explain', icon: React.createElement(BookOpen, { className: 'h-4 w-4' }),      color: 'text-purple-700', bg: 'bg-purple-50 border-purple-300' },
  QUIZ:    { label: 'Quiz',    icon: React.createElement(Zap, { className: 'h-4 w-4' }),           color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-300' },
  DEBATE:  { label: 'Debate',  icon: React.createElement(MessageSquare, { className: 'h-4 w-4' }), color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-300' },
  END:     { label: 'End',     icon: React.createElement(StopCircle, { className: 'h-4 w-4' }),    color: 'text-gray-700',   bg: 'bg-gray-100 border-gray-300' },
};

// ── Data model ────────────────────────────────────────────────────────────────

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}
