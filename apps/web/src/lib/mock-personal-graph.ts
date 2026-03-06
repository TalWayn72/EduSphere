/**
 * mock-personal-graph.ts
 *
 * Mock data for the Personal Knowledge Graph view.
 * Each node represents a personal annotation aggregated across courses.
 * Edges represent topical proximity (same concept mentioned in multiple annotations).
 */

export interface PersonalGraphNode {
  id: string;
  label: string;
  courseId: string;
  courseName: string;
  contentTimestamp?: number;
  excerpt: string;
  createdAt: string;
}

export interface PersonalGraphEdge {
  id: string;
  source: string;
  target: string;
  sharedConcept: string;
}

export const mockPersonalNodes: PersonalGraphNode[] = [
  {
    id: 'pn-1',
    label: 'Free Will & Determinism',
    courseId: 'course-1',
    courseName: 'Jewish Philosophy 101',
    contentTimestamp: 312,
    excerpt: 'Maimonides argues free will is essential to moral responsibility...',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'pn-2',
    label: 'Rambam on Providence',
    courseId: 'course-1',
    courseName: 'Jewish Philosophy 101',
    contentTimestamp: 540,
    excerpt: 'Divine providence operates through intellect, not arbitrary will...',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'pn-3',
    label: 'Spinoza\'s Determinism',
    courseId: 'course-2',
    courseName: 'Early Modern Philosophy',
    excerpt: 'Everything follows from God\'s nature with the same necessity...',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'pn-4',
    label: 'Kant — Autonomy & Duty',
    courseId: 'course-2',
    courseName: 'Early Modern Philosophy',
    excerpt: 'Moral law is self-legislated; freedom is presupposed by rational action...',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'pn-5',
    label: 'Teshuvah & Change',
    courseId: 'course-3',
    courseName: 'Halakha and Ethics',
    contentTimestamp: 90,
    excerpt: 'Repentance presupposes genuine capacity for change — a form of freedom...',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'pn-6',
    label: 'Compatibilism',
    courseId: 'course-2',
    courseName: 'Early Modern Philosophy',
    excerpt: 'Freedom and determinism can coexist if "free" means acting without coercion...',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

export const mockPersonalEdges: PersonalGraphEdge[] = [
  { id: 'pe-1', source: 'pn-1', target: 'pn-2', sharedConcept: 'Free Will' },
  { id: 'pe-2', source: 'pn-1', target: 'pn-3', sharedConcept: 'Determinism' },
  { id: 'pe-3', source: 'pn-1', target: 'pn-6', sharedConcept: 'Compatibilism' },
  { id: 'pe-4', source: 'pn-3', target: 'pn-6', sharedConcept: 'Determinism' },
  { id: 'pe-5', source: 'pn-4', target: 'pn-1', sharedConcept: 'Autonomy' },
  { id: 'pe-6', source: 'pn-5', target: 'pn-1', sharedConcept: 'Freedom' },
  { id: 'pe-7', source: 'pn-2', target: 'pn-5', sharedConcept: 'Providence' },
];
