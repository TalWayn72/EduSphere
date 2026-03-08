import type { Purchase, InstructorPayout } from '@edusphere/db';

export type { Purchase, InstructorPayout };

/** Rich listing result returned by getListings (JOINed with courses + users). */
export interface CourseListingResult {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  instructorName: string;
  thumbnailUrl: string | null;
  /** Price in whole currency units (priceCents / 100) */
  price: number;
  currency: string;
  priceCents: number;
  isPublished: boolean;
  revenueSplitPercent: number;
  enrollmentCount: number;
  /** tags: [] — no course_tags table yet; uses courses.tags jsonb in future */
  tags: string[];
  /** rating: null — not tracked in DB yet */
  rating: null;
  /** totalLessons: 0 — not joined yet; placeholder for lesson count */
  totalLessons: number;
}

export interface CourseListingFiltersInput {
  tags?: string[] | null;
  priceMax?: number | null;
  instructorName?: string | null;
  search?: string | null;
}

export interface PurchaseResult {
  clientSecret: string;
  paymentIntentId: string;
}

export interface EarningsSummary {
  totalEarnedCents: number;
  pendingPayoutCents: number;
  paidOutCents: number;
  purchases: Purchase[];
}

export interface CourseEnrolledPayload {
  readonly courseId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly purchaseId: string;
  readonly timestamp: string;
}
