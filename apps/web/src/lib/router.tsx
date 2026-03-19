import { createBrowserRouter } from 'react-router-dom';
import {
  publicRoutes,
  courseRoutes,
  adminRoutes,
  assessmentRoutes,
  examRoutes,
  socialRoutes,
  learnerRoutes,
  instructorRoutes,
} from './routes';

// ── Router ────────────────────────────────────────────────────────────────────
// Route groups are split by domain for maintainability.
// Order matters: more-specific paths (e.g. /courses/:id/edit) must come before
// catch-all patterns. Public routes include the root `/` and `*` catch-all,
// so they are placed last.
export const router = createBrowserRouter([
  ...courseRoutes,
  ...adminRoutes,
  ...assessmentRoutes,
  ...examRoutes,
  ...socialRoutes,
  ...learnerRoutes,
  ...instructorRoutes,
  ...publicRoutes,
]);
