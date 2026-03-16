import type { SearchResult } from './search.types';
import { mockTranscript } from '@/lib/mock-content-data';
import { getThreadedAnnotations } from '@/lib/mock-annotations';
import { mockGraphData } from '@/lib/mock-graph-data';

const MOCK_COURSES = [
  {
    id: 'course-1',
    title: 'Introduction to Talmud Study',
    description: 'Fundamentals of Talmudic reasoning and argumentation',
  },
  {
    id: 'course-2',
    title: 'Advanced Chavruta Techniques',
    description: 'Collaborative Talmud learning with AI assistance',
  },
  {
    id: 'course-3',
    title: 'Knowledge Graph Navigation',
    description: 'Explore interconnected concepts in Jewish texts',
  },
];

export function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function mockSearch(query: string): SearchResult[] {
  if (!query.trim() || query.length < 2) return [];
  const q = query.toLowerCase();

  const transcriptResults: SearchResult[] = mockTranscript
    .filter((s) => s.text.toLowerCase().includes(q))
    .slice(0, 4)
    .map((s) => ({
      id: `tr-${s.id}`,
      type: 'transcript' as const,
      title: 'Introduction to Talmudic Reasoning',
      snippet: s.text,
      meta: formatTime(s.startTime),
      timestamp: s.startTime,
      href: `/learn/content-1?t=${s.startTime}`,
    }));

  const annotationResults: SearchResult[] = getThreadedAnnotations()
    .filter((a) => a.content.toLowerCase().includes(q))
    .slice(0, 3)
    .map((a) => ({
      id: `ann-${a.id}`,
      type: 'annotation' as const,
      title: a.userName ?? 'Unknown',
      snippet: a.content,
      meta: a.layer,
      timestamp: a.contentTimestamp,
      href:
        a.contentTimestamp !== undefined
          ? `/learn/content-1?t=${a.contentTimestamp}`
          : '/annotations',
    }));

  const conceptResults: SearchResult[] = mockGraphData.nodes
    .filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        (n.description ?? '').toLowerCase().includes(q)
    )
    .slice(0, 4)
    .map((n) => ({
      id: `concept-${n.id}`,
      type: 'concept' as const,
      title: n.label,
      snippet: n.description ?? `${n.type} in the knowledge graph`,
      meta: n.type,
      href: '/graph',
    }));

  const courseResults: SearchResult[] = MOCK_COURSES.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
  ).map((c) => ({
    id: `course-${c.id}`,
    type: 'course' as const,
    title: c.title,
    snippet: c.description,
    href: '/courses',
  }));

  return [
    ...courseResults,
    ...transcriptResults,
    ...annotationResults,
    ...conceptResults,
  ];
}
