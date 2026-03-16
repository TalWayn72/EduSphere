/**
 * Re-export shim — the real implementation lives in ./course-list/
 * Kept so that existing lazy imports (`import('@/pages/CourseList')`) and
 * test imports (`from './CourseList'`) continue to work without changes.
 */
export { CourseList } from './course-list';
