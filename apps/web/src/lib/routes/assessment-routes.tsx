import React, { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { guarded } from './helpers';

// ── Lazy loaded assessment pages ─────────────────────────────────────────────
const AssessmentCampaignsPage = lazy(() =>
  import('@/pages/AssessmentCampaignsPage').then((m) => ({
    default: m.AssessmentCampaignsPage,
  }))
);
const AssessmentResponsePage = lazy(() =>
  import('@/pages/AssessmentResponsePage').then((m) => ({
    default: m.AssessmentResponsePage,
  }))
);
const AssessmentResultPage = lazy(() =>
  import('@/pages/AssessmentResultPage').then((m) => ({
    default: m.AssessmentResultPage,
  }))
);
const AssessmentResultsDetailPage = lazy(
  () => import('@/pages/AssessmentResultsDetailPage')
);
const AssessmentPage = lazy(() =>
  import('@/pages/AssessmentPage').then((m) => ({
    default: m.AssessmentPage,
  }))
);
const PeerReviewPage = lazy(() =>
  import('@/pages/PeerReviewPage').then((m) => ({ default: m.PeerReviewPage }))
);
const ReviewAssignmentPage = lazy(() =>
  import('@/pages/ReviewAssignmentPage').then((m) => ({
    default: m.ReviewAssignmentPage,
  }))
);

/**
 * Assessment & peer review routes — 360-degree assessments, peer reviews.
 */
export const assessmentRoutes: RouteObject[] = [
  // 360-degree assessment learner view
  { path: '/assessments', element: guarded(<AssessmentCampaignsPage />) },
  { path: '/assessments/:id/respond', element: guarded(<AssessmentResponsePage />) },
  { path: '/assessments/:id/results', element: guarded(<AssessmentResultPage />) },
  // Phase 60 — 360-degree multi-rater detail view
  { path: '/assessments/:id/results-detail', element: guarded(<AssessmentResultsDetailPage />) },
  { path: '/assessment/:assessmentId', element: guarded(<AssessmentPage />) },
  // Peer review
  { path: '/peer-review', element: guarded(<PeerReviewPage />) },
  { path: '/peer-review/:id', element: guarded(<ReviewAssignmentPage />) },
];
