/**
 * Shared types for the CourseEditModules feature.
 */

export const CONTENT_TYPES = [
  'VIDEO',
  'PDF',
  'MARKDOWN',
  'QUIZ',
  'ASSIGNMENT',
  'LINK',
  'AUDIO',
  'RICH_DOCUMENT',
  'LIVE_SESSION',
  'SCORM',
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export interface ContentItemSummary {
  id: string;
  title: string;
  contentType: string;
  orderIndex: number;
}

export interface ModuleSummary {
  id: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  contentItems: ContentItemSummary[];
}

export interface CourseEditModulesProps {
  courseId: string;
  modules: ModuleSummary[];
  onRefetch: () => void;
  onToast: (message: string) => void;
}

export interface NewModuleForm {
  title: string;
  description: string;
}

export interface NewItemForm {
  title: string;
  contentType: ContentType;
  body: string;
}
