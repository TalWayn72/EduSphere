/**
 * Mock Content Data
 * Video, transcript, and annotations for Content Viewer demo
 */

export interface TranscriptSegment {
  id: string;
  startTime: number; // seconds
  endTime: number;
  text: string;
}

export interface Bookmark {
  id: string;
  timestamp: number; // seconds
  label: string;
  color?: string;
}

export interface Annotation {
  id: string;
  timestamp: number; // seconds
  layer: 'PERSONAL' | 'SHARED' | 'INSTRUCTOR' | 'AI_GENERATED';
  author: string;
  content: string;
  createdAt: Date;
}

export interface VideoContent {
  id: string;
  title: string;
  description: string;
  duration: number; // seconds
  url: string;
  thumbnailUrl?: string;
}

export const mockVideo: VideoContent = {
  id: 'video-1',
  title: 'Introduction to Talmudic Reasoning',
  description:
    'Learn the fundamentals of logical argumentation in Jewish texts',
  duration: 300, // 5 minutes
  url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  thumbnailUrl:
    'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
};

export const mockTranscript: TranscriptSegment[] = [
  {
    id: 't1',
    startTime: 0,
    endTime: 15,
    text: 'Welcome to this introduction to Talmudic reasoning. Today, we will explore the fundamental principles of logical argumentation in Jewish texts.',
  },
  {
    id: 't2',
    startTime: 15,
    endTime: 30,
    text: "The Talmud employs a unique dialectical method called 'pilpul', which involves rigorous analysis and debate of legal texts.",
  },
  {
    id: 't3',
    startTime: 30,
    endTime: 45,
    text: 'One of the key techniques is the principle of kal vachomer, or a fortiori reasoning. This is similar to arguing from the lesser to the greater.',
  },
  {
    id: 't4',
    startTime: 45,
    endTime: 60,
    text: 'For example, if a certain law applies in a lenient case, how much more so should it apply in a stringent case.',
  },
  {
    id: 't5',
    startTime: 60,
    endTime: 75,
    text: 'Another important principle is gezera shava, which draws analogies between similar words or phrases in different texts.',
  },
  {
    id: 't6',
    startTime: 75,
    endTime: 90,
    text: 'The Talmud also uses the concept of binyan av, building a general principle from specific cases.',
  },
  {
    id: 't7',
    startTime: 90,
    endTime: 105,
    text: 'Critical thinking in Talmudic study involves questioning assumptions, examining contradictions, and synthesizing different opinions.',
  },
  {
    id: 't8',
    startTime: 105,
    endTime: 120,
    text: 'The chavruta method, where two students study together in dialogue, mirrors the Talmudic dialectical approach.',
  },
  {
    id: 't9',
    startTime: 120,
    endTime: 135,
    text: 'When analyzing a sugya, or passage, we must first understand the question being posed and the various answers proposed.',
  },
  {
    id: 't10',
    startTime: 135,
    endTime: 150,
    text: 'Each answer may be challenged with a kushya, or difficulty, which then requires resolution or refinement.',
  },
  {
    id: 't11',
    startTime: 150,
    endTime: 165,
    text: 'The Talmud often presents multiple perspectives, teaching us that truth can be multifaceted and nuanced.',
  },
  {
    id: 't12',
    startTime: 165,
    endTime: 180,
    text: 'This methodology has applications beyond religious study - it develops critical thinking skills applicable to any field.',
  },
  {
    id: 't13',
    startTime: 180,
    endTime: 195,
    text: 'Modern scholars have noted parallels between Talmudic reasoning and contemporary legal and philosophical methods.',
  },
  {
    id: 't14',
    startTime: 195,
    endTime: 210,
    text: 'The principle of machloket, or dispute, is valued in Talmudic tradition as a path to deeper understanding.',
  },
  {
    id: 't15',
    startTime: 210,
    endTime: 225,
    text: 'Even when scholars disagree, both opinions may be considered "words of the living God" if argued in good faith.',
  },
  {
    id: 't16',
    startTime: 225,
    endTime: 240,
    text: 'The concept of svara, or logical reasoning, allows scholars to derive new insights beyond the explicit text.',
  },
  {
    id: 't17',
    startTime: 240,
    endTime: 255,
    text: 'Context is crucial - understanding the historical, linguistic, and cultural background enriches our interpretation.',
  },
  {
    id: 't18',
    startTime: 255,
    endTime: 270,
    text: 'The study of Talmud trains the mind to think systematically, question rigorously, and argue respectfully.',
  },
  {
    id: 't19',
    startTime: 270,
    endTime: 285,
    text: 'As we continue this course, you will practice these methods through guided exercises and AI-assisted chavruta sessions.',
  },
  {
    id: 't20',
    startTime: 285,
    endTime: 300,
    text: 'Thank you for joining this introduction. In our next session, we will dive deeper into specific examples from classical texts.',
  },
];

export const mockBookmarks: Bookmark[] = [
  {
    id: 'b1',
    timestamp: 15,
    label: 'Pilpul definition',
    color: '#3b82f6',
  },
  {
    id: 'b2',
    timestamp: 30,
    label: 'Kal vachomer explained',
    color: '#10b981',
  },
  {
    id: 'b3',
    timestamp: 75,
    label: 'Binyan av principle',
    color: '#f59e0b',
  },
  {
    id: 'b4',
    timestamp: 120,
    label: 'Analyzing sugya',
    color: '#8b5cf6',
  },
  {
    id: 'b5',
    timestamp: 210,
    label: 'Machloket value',
    color: '#ec4899',
  },
];

export const mockAnnotations: Annotation[] = [
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
