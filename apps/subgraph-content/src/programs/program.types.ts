/**
 * program.types.ts — Shared types/interfaces for the Programs domain.
 */

export interface ProgramProgress {
  totalCourses: number;
  completedCourses: number;
  completedCourseIds: string[];
  percentComplete: number;
}

export interface ProgramResult {
  id: string;
  title: string;
  description: string;
  badgeEmoji: string;
  requiredCourseIds: string[];
  totalHours: number;
  published: boolean;
  enrollmentCount: number;
}

export interface EnrollmentResult {
  id: string;
  programId: string;
  userId: string;
  enrolledAt: string;
  completedAt: string | null;
  certificateId: string | null;
}

export interface CreateProgramInput {
  title: string;
  description: string;
  requiredCourseIds: string[];
  badgeEmoji?: string;
  totalHours?: number;
}

export interface UpdateProgramInput {
  title?: string;
  description?: string;
  published?: boolean;
}
