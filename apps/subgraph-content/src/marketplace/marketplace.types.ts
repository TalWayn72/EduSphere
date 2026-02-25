import type { CourseListing, Purchase, InstructorPayout } from '@edusphere/db';

export type { CourseListing, Purchase, InstructorPayout };

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
