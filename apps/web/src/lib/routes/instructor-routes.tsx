import React, { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { guarded } from './helpers';

// ── Lazy loaded instructor & partner pages ───────────────────────────────────
const InstructorAnalyticsDashboard = lazy(() =>
  import('@/pages/InstructorAnalyticsDashboard').then((m) => ({
    default: m.InstructorAnalyticsDashboard,
  }))
);
const InstructorMergeQueuePage = lazy(() =>
  import('@/pages/InstructorMergeQueuePage').then((m) => ({
    default: m.InstructorMergeQueuePage,
  }))
);
const InstructorEarningsPage = lazy(() =>
  import('@/pages/InstructorEarningsPage').then((m) => ({
    default: m.InstructorEarningsPage,
  }))
);
const PartnerDashboardPage = lazy(() =>
  import('@/pages/PartnerDashboardPage').then((m) => ({
    default: m.PartnerDashboardPage,
  }))
);
const InvestorDeckPage = lazy(() =>
  import('@/pages/InvestorDeckPage').then((m) => ({
    default: m.InvestorDeckPage,
  }))
);

const INSTRUCTOR_ROLES = {
  requiredRoles: ['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN'],
};

/**
 * Instructor, partner, and internal routes.
 */
export const instructorRoutes: RouteObject[] = [
  // Instructor Analytics Dashboard
  {
    path: '/instructor/analytics',
    element: guarded(<InstructorAnalyticsDashboard />, INSTRUCTOR_ROLES),
  },
  // Instructor annotation merge queue
  {
    path: '/instructor/merge-queue',
    element: guarded(<InstructorMergeQueuePage />, INSTRUCTOR_ROLES),
  },
  {
    path: '/instructor/earnings',
    element: guarded(<InstructorEarningsPage />, INSTRUCTOR_ROLES),
  },
  // Partner revenue + API key dashboard
  {
    path: '/partner/dashboard',
    element: guarded(<PartnerDashboardPage />, INSTRUCTOR_ROLES),
  },
  // Internal investor deck — SUPER_ADMIN only
  {
    path: '/internal/investor-deck',
    element: guarded(<InvestorDeckPage />, { requiredRoles: ['SUPER_ADMIN'] }),
  },
];
