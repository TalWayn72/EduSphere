export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface CourseModule {
  id: string;
  title: string;
  description: string;
}

export interface CourseFormData {
  title: string;
  description: string;
  difficulty: Difficulty;
  duration: string;
  thumbnail: string;
  modules: CourseModule[];
  published: boolean;
}

export const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

export const THUMBNAIL_OPTIONS = ['📚', '🎓', '🕍', '📜', '🔍', '🧠', '🤝', '⚖️', '🕯️', '🌟'];

export const DEFAULT_FORM: CourseFormData = {
  title: '',
  description: '',
  difficulty: 'BEGINNER',
  duration: '',
  thumbnail: '📚',
  modules: [],
  published: false,
};
