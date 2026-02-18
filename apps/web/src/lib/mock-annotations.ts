import { Annotation, AnnotationLayer } from '@/types/annotations';

export const mockAnnotations: Annotation[] = [
  // INSTRUCTOR annotations
  {
    id: 'ann-1',
    content:
      'Note the logical structure here: premise → inference → conclusion. This is a classic example of modus ponens reasoning.',
    layer: AnnotationLayer.INSTRUCTOR,
    userId: 'instructor-1',
    userName: 'Dr. Cohen',
    userRole: 'instructor',
    timestamp: '00:05:23',
    contentId: 'content-1',
    contentTimestamp: 323,
    createdAt: '2026-02-15T10:30:00Z',
    updatedAt: '2026-02-15T10:30:00Z',
  },
  {
    id: 'ann-2',
    content:
      'Critical thinking checkpoint: Can you identify any potential fallacies in this argument?',
    layer: AnnotationLayer.INSTRUCTOR,
    userId: 'instructor-1',
    userName: 'Dr. Cohen',
    userRole: 'instructor',
    timestamp: '00:12:45',
    contentId: 'content-1',
    contentTimestamp: 765,
    createdAt: '2026-02-15T11:15:00Z',
    updatedAt: '2026-02-15T11:15:00Z',
  },
  {
    id: 'ann-3',
    content:
      'Exam focus: This section will appear on the midterm. Pay special attention to the distinction between categorical and hypothetical syllogisms.',
    layer: AnnotationLayer.INSTRUCTOR,
    userId: 'instructor-1',
    userName: 'Dr. Cohen',
    userRole: 'instructor',
    timestamp: '00:18:30',
    contentId: 'content-1',
    contentTimestamp: 1110,
    createdAt: '2026-02-16T09:00:00Z',
    updatedAt: '2026-02-16T09:00:00Z',
  },

  // SHARED annotations (students)
  {
    id: 'ann-4',
    content:
      "This reminds me of Aristotle's argument in Nicomachean Ethics about the golden mean. Similar logical framework!",
    layer: AnnotationLayer.SHARED,
    userId: 'student-2',
    userName: 'Sarah',
    userRole: 'student',
    timestamp: '00:06:10',
    contentId: 'content-1',
    contentTimestamp: 370,
    createdAt: '2026-02-15T14:20:00Z',
    updatedAt: '2026-02-15T14:20:00Z',
  },
  {
    id: 'ann-5',
    content:
      "Great connection! I also see parallels with Kant's categorical imperative.",
    layer: AnnotationLayer.SHARED,
    userId: 'student-3',
    userName: 'Michael',
    userRole: 'student',
    timestamp: '00:06:10',
    contentId: 'content-1',
    contentTimestamp: 370,
    parentId: 'ann-4',
    createdAt: '2026-02-15T15:05:00Z',
    updatedAt: '2026-02-15T15:05:00Z',
  },
  {
    id: 'ann-6',
    content:
      'Has anyone read the supplemental article Dr. Cohen recommended? It expands on this concept beautifully.',
    layer: AnnotationLayer.SHARED,
    userId: 'student-4',
    userName: 'Rachel',
    userRole: 'student',
    timestamp: '00:12:50',
    contentId: 'content-1',
    contentTimestamp: 770,
    createdAt: '2026-02-15T16:30:00Z',
    updatedAt: '2026-02-15T16:30:00Z',
  },
  {
    id: 'ann-7',
    content: 'Yes! The article by Prof. Williams. Highly recommend it.',
    layer: AnnotationLayer.SHARED,
    userId: 'student-5',
    userName: 'David',
    userRole: 'student',
    timestamp: '00:12:50',
    contentId: 'content-1',
    contentTimestamp: 770,
    parentId: 'ann-6',
    createdAt: '2026-02-15T17:10:00Z',
    updatedAt: '2026-02-15T17:10:00Z',
  },
  {
    id: 'ann-8',
    content:
      'Question: How does this differ from deductive vs inductive reasoning? Seems related.',
    layer: AnnotationLayer.SHARED,
    userId: 'student-6',
    userName: 'Emma',
    userRole: 'student',
    timestamp: '00:15:20',
    contentId: 'content-1',
    contentTimestamp: 920,
    createdAt: '2026-02-16T10:15:00Z',
    updatedAt: '2026-02-16T10:15:00Z',
  },
  {
    id: 'ann-9',
    content:
      'Study group meeting this Thursday at 3pm in the library to review this section. DM me if interested!',
    layer: AnnotationLayer.SHARED,
    userId: 'student-2',
    userName: 'Sarah',
    userRole: 'student',
    timestamp: '00:20:00',
    contentId: 'content-1',
    contentTimestamp: 1200,
    createdAt: '2026-02-16T12:00:00Z',
    updatedAt: '2026-02-16T12:00:00Z',
  },

  // AI_GENERATED annotations
  {
    id: 'ann-10',
    content:
      'Related concept: Free Will vs Determinism. This argument assumes agency in decision-making. Consider exploring the compatibilist position.',
    layer: AnnotationLayer.AI_GENERATED,
    userId: 'ai-agent-1',
    userName: 'AI Learning Assistant',
    userRole: 'ai',
    timestamp: '00:07:15',
    contentId: 'content-1',
    contentTimestamp: 435,
    createdAt: '2026-02-15T10:32:00Z',
    updatedAt: '2026-02-15T10:32:00Z',
  },
  {
    id: 'ann-11',
    content:
      'Knowledge Graph Connection: This concept links to "Epistemology → Justification Theory → Foundationalism". Explore the knowledge graph for deeper understanding.',
    layer: AnnotationLayer.AI_GENERATED,
    userId: 'ai-agent-1',
    userName: 'AI Learning Assistant',
    userRole: 'ai',
    timestamp: '00:10:30',
    contentId: 'content-1',
    contentTimestamp: 630,
    createdAt: '2026-02-15T10:35:00Z',
    updatedAt: '2026-02-15T10:35:00Z',
  },
  {
    id: 'ann-12',
    content:
      'Quiz suggestion: You might benefit from practicing syllogism identification. Try the interactive quiz in Module 3.',
    layer: AnnotationLayer.AI_GENERATED,
    userId: 'ai-agent-1',
    userName: 'AI Learning Assistant',
    userRole: 'ai',
    timestamp: '00:14:00',
    contentId: 'content-1',
    contentTimestamp: 840,
    createdAt: '2026-02-15T10:40:00Z',
    updatedAt: '2026-02-15T10:40:00Z',
  },
  {
    id: 'ann-13',
    content:
      "Historical context: This argument structure dates back to Aristotle's Prior Analytics (circa 350 BCE). The Organon established formal logic as we know it today.",
    layer: AnnotationLayer.AI_GENERATED,
    userId: 'ai-agent-1',
    userName: 'AI Learning Assistant',
    userRole: 'ai',
    timestamp: '00:19:00',
    contentId: 'content-1',
    contentTimestamp: 1140,
    createdAt: '2026-02-16T09:05:00Z',
    updatedAt: '2026-02-16T09:05:00Z',
  },

  // PERSONAL annotations (current user)
  {
    id: 'ann-14',
    content:
      'Review this section before the exam - especially the difference between soundness and validity.',
    layer: AnnotationLayer.PERSONAL,
    userId: 'current-user',
    userName: 'You',
    userRole: 'student',
    timestamp: '00:05:30',
    contentId: 'content-1',
    contentTimestamp: 330,
    createdAt: '2026-02-15T13:00:00Z',
    updatedAt: '2026-02-15T13:00:00Z',
  },
  {
    id: 'ann-15',
    content: 'Confused about this part. Ask Dr. Cohen in office hours.',
    layer: AnnotationLayer.PERSONAL,
    userId: 'current-user',
    userName: 'You',
    userRole: 'student',
    timestamp: '00:11:20',
    contentId: 'content-1',
    contentTimestamp: 680,
    createdAt: '2026-02-15T13:15:00Z',
    updatedAt: '2026-02-15T13:15:00Z',
  },
  {
    id: 'ann-16',
    content:
      'Key insight: All deductive arguments are NOT necessarily sound - they must also have true premises!',
    layer: AnnotationLayer.PERSONAL,
    userId: 'current-user',
    userName: 'You',
    userRole: 'student',
    timestamp: '00:16:45',
    contentId: 'content-1',
    contentTimestamp: 1005,
    createdAt: '2026-02-16T08:30:00Z',
    updatedAt: '2026-02-16T08:30:00Z',
  },
  {
    id: 'ann-17',
    content:
      'Practice problems: Complete exercises 5-8 in the textbook to solidify understanding.',
    layer: AnnotationLayer.PERSONAL,
    userId: 'current-user',
    userName: 'You',
    userRole: 'student',
    timestamp: '00:21:10',
    contentId: 'content-1',
    contentTimestamp: 1270,
    createdAt: '2026-02-16T11:00:00Z',
    updatedAt: '2026-02-16T11:00:00Z',
  },
  {
    id: 'ann-18',
    content:
      'Mind blown! This completely changed how I think about logical reasoning. Need to re-watch this section.',
    layer: AnnotationLayer.PERSONAL,
    userId: 'current-user',
    userName: 'You',
    userRole: 'student',
    timestamp: '00:22:30',
    contentId: 'content-1',
    contentTimestamp: 1350,
    createdAt: '2026-02-16T14:45:00Z',
    updatedAt: '2026-02-16T14:45:00Z',
  },
];

// Build threaded structure
export const buildAnnotationThreads = (
  annotations: Annotation[]
): Annotation[] => {
  const annotationMap = new Map<string, Annotation>();
  const rootAnnotations: Annotation[] = [];

  // First pass: create map of all annotations
  annotations.forEach((ann) => {
    annotationMap.set(ann.id, { ...ann, replies: [] });
  });

  // Second pass: build parent-child relationships
  annotations.forEach((ann) => {
    const annotation = annotationMap.get(ann.id)!;
    if (ann.parentId) {
      const parent = annotationMap.get(ann.parentId);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(annotation);
      }
    } else {
      rootAnnotations.push(annotation);
    }
  });

  // Sort by timestamp
  return rootAnnotations.sort((a, b) => {
    const timeA = a.contentTimestamp || 0;
    const timeB = b.contentTimestamp || 0;
    return timeA - timeB;
  });
};

export const getThreadedAnnotations = (): Annotation[] => {
  return buildAnnotationThreads(mockAnnotations);
};

// Filter annotations by layer
export const filterAnnotationsByLayers = (
  annotations: Annotation[],
  enabledLayers: AnnotationLayer[]
): Annotation[] => {
  return annotations.filter((ann) => enabledLayers.includes(ann.layer));
};

// Get annotation count by layer
export const getAnnotationCountByLayer = (
  annotations: Annotation[]
): Record<AnnotationLayer, number> => {
  return annotations.reduce(
    (acc, ann) => {
      acc[ann.layer] = (acc[ann.layer] || 0) + 1;
      return acc;
    },
    {} as Record<AnnotationLayer, number>
  );
};
