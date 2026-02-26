export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface CourseModule {
  id: string;
  title: string;
  description: string;
}

export interface UploadedMedia {
  id: string;
  courseId: string;
  fileKey: string;
  title: string;
  contentType: string;
  status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'ERROR';
  downloadUrl: string | null;
  altText: string | null;
}

export interface CourseFormData {
  title: string;
  description: string;
  difficulty: Difficulty;
  duration: string;
  thumbnail: string;
  modules: CourseModule[];
  mediaList: UploadedMedia[];
  published: boolean;
}

export const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

export const THUMBNAIL_OPTIONS = [
  '📚',
  '🎓',
  '🕍',
  '📜',
  '🔍',
  '🧠',
  '🤝',
  '⚖️',
  '🕯️',
  '🌟',
];

export const DEFAULT_FORM: CourseFormData = {
  title: '',
  description: '',
  difficulty: 'BEGINNER',
  duration: '',
  thumbnail: '📚',
  modules: [],
  mediaList: [],
  published: false,
};
