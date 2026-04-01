import React, { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { guarded } from './helpers';

// ── Lazy loaded exam pages (instructor) ──────────────────────────────────────
const ExamItemBankPage = lazy(() =>
  import('@/pages/exam/ExamItemBankPage').then((m) => ({
    default: m.ExamItemBankPage,
  }))
);
const ExamItemEditorPage = lazy(() =>
  import('@/pages/exam/ExamItemEditorPage').then((m) => ({
    default: m.ExamItemEditorPage,
  }))
);
const ExamBlueprintListPage = lazy(() =>
  import('@/pages/exam/ExamBlueprintListPage').then((m) => ({
    default: m.ExamBlueprintListPage,
  }))
);
const ExamBlueprintBuilderPage = lazy(() =>
  import('@/pages/exam/ExamBlueprintBuilderPage').then((m) => ({
    default: m.ExamBlueprintBuilderPage,
  }))
);
const ExamAnalyticsDashboard = lazy(() =>
  import('@/pages/exam/ExamAnalyticsDashboard').then((m) => ({
    default: m.ExamAnalyticsDashboard,
  }))
);
const ExamItemGeneratorPage = lazy(() =>
  import('@/pages/exam/ExamItemGeneratorPage').then((m) => ({
    default: m.ExamItemGeneratorPage,
  }))
);

// ── Lazy loaded exam pages (student) ─────────────────────────────────────────
const ExamStartPage = lazy(() =>
  import('@/pages/exam/ExamStartPage').then((m) => ({
    default: m.ExamStartPage,
  }))
);
const ExamTakingPage = lazy(() =>
  import('@/pages/exam/ExamTakingPage').then((m) => ({
    default: m.ExamTakingPage,
  }))
);
const ExamResultPage = lazy(() =>
  import('@/pages/exam/ExamResultPage').then((m) => ({
    default: m.ExamResultPage,
  }))
);

/**
 * Certification Exam routes — item bank, blueprints, exam sessions, results.
 */
export const examRoutes: RouteObject[] = [
  // Instructor: item bank & editor
  {
    path: '/courses/:courseId/exams/items',
    element: guarded(<ExamItemBankPage />),
  },
  {
    path: '/courses/:courseId/exams/items/new',
    element: guarded(<ExamItemEditorPage />),
  },
  {
    path: '/courses/:courseId/exams/items/:itemId',
    element: guarded(<ExamItemEditorPage />),
  },
  // Instructor: blueprints
  {
    path: '/courses/:courseId/exams/blueprints',
    element: guarded(<ExamBlueprintListPage />),
  },
  {
    path: '/courses/:courseId/exams/blueprints/new',
    element: guarded(<ExamBlueprintBuilderPage />),
  },
  {
    path: '/courses/:courseId/exams/blueprints/:blueprintId',
    element: guarded(<ExamBlueprintBuilderPage />),
  },
  // Instructor: analytics & AI generation
  {
    path: '/courses/:courseId/exams/analytics',
    element: guarded(<ExamAnalyticsDashboard />),
  },
  {
    path: '/courses/:courseId/exams/generate',
    element: guarded(<ExamItemGeneratorPage />),
  },
  // Student: exam sessions
  { path: '/exams/:blueprintId/start', element: guarded(<ExamStartPage />) },
  { path: '/exams/session/:sessionId', element: guarded(<ExamTakingPage />) },
  {
    path: '/exams/session/:sessionId/results',
    element: guarded(<ExamResultPage />),
  },
];
