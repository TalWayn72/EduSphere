import type { MockCourse, MockActivity, MockMasteryItem } from './types';

export const MOCK_IN_PROGRESS: MockCourse[] = [
  {
    id: 'cc000000-0000-0000-0000-000000000002',
    title: 'Introduction to Talmud Study',
    progress: 72,
    lastStudied: '2 hours ago',
    instructor: 'Dr. Cohen',
  },
  {
    id: '22222222-2222-2222-2222-222222222221',
    title: 'Advanced Chavruta Techniques',
    progress: 45,
    lastStudied: '1 day ago',
    instructor: 'Prof. Levi',
  },
  {
    id: 'ea2e14c1-424e-4bcd-a209-13fb0c7ce84c',
    title: 'Knowledge Graph Navigation',
    progress: 28,
    lastStudied: '3 days ago',
    instructor: 'Dr. Ben-David',
  },
];

export const MOCK_RECOMMENDED: MockCourse[] = [
  {
    id: '72d6a4b2-3728-4ce0-b748-f03e90e39d19',
    title: 'Mishnah: Laws of Damages',
    progress: 0,
    lastStudied: 'Not started',
    instructor: 'Dr. Shapiro',
  },
  {
    id: '7d795770-c774-4faf-ab0c-332b8a7be8df',
    title: 'Biblical Hebrew Foundations',
    progress: 0,
    lastStudied: 'Not started',
    instructor: 'Prof. Goldberg',
  },
];

export const MOCK_ACTIVITY: MockActivity[] = [
  { id: 'a-1', icon: 'study', action: 'Completed study session in Tractate Bava Metzia', timeAgo: '2h ago' },
  { id: 'a-2', icon: 'quiz', action: 'Scored 85% on Concepts of Damages quiz', timeAgo: '5h ago' },
  { id: 'a-3', icon: 'ai', action: 'AI Tutor session — explored Chavruta concepts', timeAgo: '1d ago' },
  { id: 'a-4', icon: 'annotation', action: 'Added 3 highlights to Chapter 4', timeAgo: '2d ago' },
  { id: 'a-5', icon: 'course', action: 'Enrolled in Knowledge Graph Navigation', timeAgo: '3d ago' },
];

export const MOCK_MASTERY: MockMasteryItem[] = [
  { topic: 'Talmudic Reasoning', level: 'mastered' },
  { topic: 'Chavruta Study', level: 'proficient' },
  { topic: 'Knowledge Graphs', level: 'familiar' },
  { topic: 'Hebrew Grammar', level: 'attempted' },
  { topic: 'Halacha Overview', level: 'none' },
];

export const MOCK_STREAK = 7;
export const MOCK_COMPLETED = 4;
