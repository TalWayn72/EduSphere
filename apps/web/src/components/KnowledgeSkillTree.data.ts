import type { SkillNode } from './KnowledgeSkillTree.types';

// ── Sample data export (8 nodes, branching structure) ─────────────────────────

export const SAMPLE_SKILL_TREE_DATA: SkillNode[] = [
  {
    id: 'html',
    label: 'HTML Foundations',
    mastery: 'mastered',
    progress: 100,
    children: ['css', 'accessibility'],
    unlocked: true,
  },
  {
    id: 'css',
    label: 'CSS Styling',
    mastery: 'proficient',
    progress: 80,
    children: ['javascript'],
    unlocked: true,
  },
  {
    id: 'accessibility',
    label: 'Web Accessibility',
    mastery: 'familiar',
    progress: 60,
    children: [],
    unlocked: true,
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    mastery: 'familiar',
    progress: 60,
    children: ['typescript', 'react'],
    unlocked: true,
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    mastery: 'attempted',
    progress: 20,
    children: ['nodejs'],
    unlocked: true,
  },
  {
    id: 'react',
    label: 'React',
    mastery: 'none',
    progress: 0,
    children: ['nextjs'],
    unlocked: false,
  },
  {
    id: 'nodejs',
    label: 'Node.js',
    mastery: 'none',
    progress: 0,
    children: [],
    unlocked: false,
  },
  {
    id: 'nextjs',
    label: 'Next.js',
    mastery: 'none',
    progress: 0,
    children: [],
    unlocked: false,
  },
];
