import { BookOpen, MessageSquare, FileText, Network } from 'lucide-react';
import type { ResultType, TypeConfig } from './search.types';

export const TYPE_CONFIG: Record<ResultType, TypeConfig> = {
  course: {
    icon: BookOpen,
    label: 'Course',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
  },
  transcript: {
    icon: MessageSquare,
    label: 'Transcript',
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
  },
  annotation: {
    icon: FileText,
    label: 'Annotation',
    color: 'text-violet-700',
    bg: 'bg-violet-50 border-violet-200',
  },
  concept: {
    icon: Network,
    label: 'Concept',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
  },
};

export const TYPE_ORDER: ResultType[] = [
  'course',
  'transcript',
  'annotation',
  'concept',
];

export const SUGGESTED_QUERIES = [
  'Talmud',
  'chavruta',
  'kal vachomer',
  'Rambam',
  'pilpul',
];
