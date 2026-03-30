export interface CreateLessonInput {
  courseId: string;
  moduleId?: string;
  title: string;
  type: 'THEMATIC' | 'SEQUENTIAL';
  series?: string;
  lessonDate?: string;
  instructorId: string;
}

export interface UpdateLessonInput {
  title?: string;
  type?: 'THEMATIC' | 'SEQUENTIAL';
  series?: string;
  lessonDate?: string;
  status?: 'DRAFT' | 'PROCESSING' | 'READY' | 'PUBLISHED';
}

export interface MappedLesson {
  id: unknown;
  courseId: unknown;
  moduleId: unknown;
  title: unknown;
  type: unknown;
  series: unknown;
  lessonDate: string | null;
  instructorId: unknown;
  status: unknown;
  createdAt: string | null;
  updatedAt: string | null;
}

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function mapLesson(
  row: Record<string, unknown> | null | undefined
): MappedLesson | null {
  if (!row) return null;
  return {
    id: row['id'],
    courseId: row['course_id'] ?? row['courseId'],
    moduleId: row['module_id'] ?? row['moduleId'] ?? null,
    title: row['title'],
    type: row['type'],
    series: row['series'] ?? null,
    lessonDate: row['lesson_date'] ? String(row['lesson_date']) : null,
    instructorId: row['instructor_id'] ?? row['instructorId'],
    status: row['status'],
    createdAt: row['created_at'] ? String(row['created_at']) : null,
    updatedAt: row['updated_at'] ? String(row['updated_at']) : null,
  };
}
