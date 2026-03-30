export interface Course {
  id: string;
  title: string;
  isPublished: boolean;
}

export interface AdminEnrollmentRecord {
  id: string;
  courseId: string;
  userId: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);
