/**
 * Mock Knowledge Graph Data
 * Jewish Philosophy concepts and relationships for demonstration
 */

export type NodeType = 'CONCEPT' | 'PERSON' | 'TERM' | 'SOURCE';

export type EdgeType =
  | 'PREREQUISITE_OF'
  | 'CONTRADICTS'
  | 'RELATED_TO'
  | 'MENTIONS'
  | 'CITES';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  description?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const mockGraphData: GraphData = {
  nodes: [
    {
      id: 'rambam',
      label: 'Rambam',
      type: 'PERSON',
      description: 'Moses Maimonides (1138-1204)',
    },
    {
      id: 'aristotle',
      label: 'Aristotle',
      type: 'PERSON',
      description: 'Greek philosopher (384-322 BCE)',
    },
    {
      id: 'free-will',
      label: 'Free Will',
      type: 'CONCEPT',
      description: 'Human capacity for voluntary choice',
    },
    {
      id: 'determinism',
      label: 'Determinism',
      type: 'CONCEPT',
      description: 'All events predetermined',
    },
    {
      id: 'ethics',
      label: 'Ethics',
      type: 'CONCEPT',
      description: 'Moral philosophy and conduct',
    },
    {
      id: 'metaphysics',
      label: 'Metaphysics',
      type: 'CONCEPT',
      description: 'Nature of reality and existence',
    },
    {
      id: 'guide-perplexed',
      label: 'Guide for the Perplexed',
      type: 'SOURCE',
      description: 'Major philosophical work by Rambam',
    },
    {
      id: 'divine-providence',
      label: 'Divine Providence',
      type: 'CONCEPT',
      description: 'God\'s involvement in the world',
    },
    {
      id: 'prophecy',
      label: 'Prophecy',
      type: 'CONCEPT',
      description: 'Divine revelation and communication',
    },
    {
      id: 'torah',
      label: 'Torah',
      type: 'SOURCE',
      description: 'Jewish sacred text',
    },
    {
      id: 'reason',
      label: 'Reason',
      type: 'CONCEPT',
      description: 'Logical and rational thought',
    },
    {
      id: 'faith',
      label: 'Faith',
      type: 'CONCEPT',
      description: 'Religious belief and trust',
    },
    {
      id: 'talmud',
      label: 'Talmud',
      type: 'SOURCE',
      description: 'Central text of Rabbinic Judaism',
    },
  ],
  edges: [
    {
      id: 'e1',
      source: 'rambam',
      target: 'aristotle',
      type: 'MENTIONS',
      label: 'references',
    },
    {
      id: 'e2',
      source: 'free-will',
      target: 'determinism',
      type: 'CONTRADICTS',
      label: 'opposes',
    },
    {
      id: 'e3',
      source: 'ethics',
      target: 'metaphysics',
      type: 'PREREQUISITE_OF',
      label: 'requires',
    },
    {
      id: 'e4',
      source: 'rambam',
      target: 'guide-perplexed',
      type: 'CITES',
      label: 'authored',
    },
    {
      id: 'e5',
      source: 'free-will',
      target: 'divine-providence',
      type: 'RELATED_TO',
      label: 'connected to',
    },
    {
      id: 'e6',
      source: 'prophecy',
      target: 'metaphysics',
      type: 'PREREQUISITE_OF',
      label: 'requires',
    },
    {
      id: 'e7',
      source: 'guide-perplexed',
      target: 'torah',
      type: 'CITES',
      label: 'interprets',
    },
    {
      id: 'e8',
      source: 'reason',
      target: 'faith',
      type: 'RELATED_TO',
      label: 'balances',
    },
    {
      id: 'e9',
      source: 'rambam',
      target: 'reason',
      type: 'MENTIONS',
      label: 'emphasizes',
    },
    {
      id: 'e10',
      source: 'torah',
      target: 'talmud',
      type: 'RELATED_TO',
      label: 'interpreted in',
    },
    {
      id: 'e11',
      source: 'divine-providence',
      target: 'determinism',
      type: 'RELATED_TO',
      label: 'relates to',
    },
    {
      id: 'e12',
      source: 'ethics',
      target: 'free-will',
      type: 'PREREQUISITE_OF',
      label: 'requires',
    },
  ],
};
