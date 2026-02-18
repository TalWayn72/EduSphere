import type { Annotation } from './mock-content-data';

export const mockVideoAnnotations: Annotation[] = [
  {
    id: 'a1',
    timestamp: 15,
    layer: 'PERSONAL',
    author: 'You',
    content: 'Remember to look up more examples of pilpul in modern contexts',
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    id: 'a2',
    timestamp: 30,
    layer: 'INSTRUCTOR',
    author: 'Rabbi Cohen',
    content:
      'This principle is found in the 13 hermeneutical rules of Rabbi Ishmael',
    createdAt: new Date(Date.now() - 7200000),
  },
  {
    id: 'a3',
    timestamp: 45,
    layer: 'SHARED',
    author: 'Sarah L.',
    content: 'Great explanation! This helped clarify the concept.',
    createdAt: new Date(Date.now() - 5400000),
  },
  {
    id: 'a4',
    timestamp: 90,
    layer: 'AI_GENERATED',
    author: 'AI Assistant',
    content:
      'Related concept: Inductive reasoning in Aristotelian logic shares similarities with binyan av.',
    createdAt: new Date(Date.now() - 1800000),
  },
  {
    id: 'a5',
    timestamp: 120,
    layer: 'PERSONAL',
    author: 'You',
    content:
      'Question for chavruta session: How does this apply to modern legal reasoning?',
    createdAt: new Date(Date.now() - 900000),
  },
  {
    id: 'a6',
    timestamp: 135,
    layer: 'INSTRUCTOR',
    author: 'Rabbi Cohen',
    content: 'Pay attention to this section - it will be on the quiz.',
    createdAt: new Date(Date.now() - 10800000),
  },
  {
    id: 'a7',
    timestamp: 165,
    layer: 'SHARED',
    author: 'David M.',
    content: 'This reminds me of the Socratic method in philosophy',
    createdAt: new Date(Date.now() - 14400000),
  },
  {
    id: 'a8',
    timestamp: 210,
    layer: 'AI_GENERATED',
    author: 'AI Assistant',
    content:
      'Knowledge graph connection: This concept links to "Debate Ethics" and "Pluralism in Jewish Thought"',
    createdAt: new Date(Date.now() - 600000),
  },
  {
    id: 'a9',
    timestamp: 240,
    layer: 'PERSONAL',
    author: 'You',
    content:
      'Svara - need to research this further. Seems related to natural law theory.',
    createdAt: new Date(Date.now() - 300000),
  },
  {
    id: 'a10',
    timestamp: 270,
    layer: 'INSTRUCTOR',
    author: 'Rabbi Cohen',
    content:
      'Excellent summary. This captures the essence of what we aim to develop in students.',
    createdAt: new Date(Date.now() - 18000000),
  },
];
