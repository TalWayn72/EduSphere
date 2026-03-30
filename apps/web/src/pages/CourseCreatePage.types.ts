import { z } from 'zod';

// ── Zod schema for Step 1 fields ─────────────────────────────────────────────
export const courseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .or(z.literal('')),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  duration: z.string().optional(),
  thumbnail: z.string().min(1, 'Thumbnail required'),
});

export type CourseSchemaValues = z.infer<typeof courseSchema>;

// ── GraphQL: SCORM export mutation ────────────────────────────────────────────
export const EXPORT_SCORM_MUTATION = `
  mutation ExportScorm($courseId: ID!) {
    exportCourseAsScorm2004(courseId: $courseId) {
      downloadUrl
      expiresAt
      fileSizeBytes
    }
  }
`;

export interface ExportScormResult {
  exportCourseAsScorm2004: {
    downloadUrl: string;
    expiresAt: string;
    fileSizeBytes: number;
  };
}

export interface ExportScormVariables {
  courseId: string;
}

// ── GraphQL types ─────────────────────────────────────────────────────────────
export interface CreateCourseResult {
  createCourse: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    isPublished: boolean;
    estimatedHours: number | null;
    createdAt: string;
  };
}

export interface CreateCourseVariables {
  input: {
    title: string;
    slug: string;
    description?: string;
    instructorId: string;
    isPublished: boolean;
    estimatedHours?: number;
  };
}

export const DRAFT_COURSE_ID = 'draft';
