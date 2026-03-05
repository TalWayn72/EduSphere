/**
 * useUnsavedChangesGuard — blocks in-app navigation and browser close/refresh
 * when the component has unsaved changes.
 *
 * Returns the React Router v7 Blocker so the caller can render a confirmation
 * dialog when `blocker.state === 'blocked'`.
 *
 * Usage:
 *   const blocker = useUnsavedChangesGuard(isDirty, 'MyPage');
 *   {blocker.state === 'blocked' && (
 *     <UnsavedChangesDialog onLeave={blocker.proceed} onStay={blocker.reset} />
 *   )}
 */
import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

export function useUnsavedChangesGuard(isDirty: boolean, componentName: string) {
  const blocker = useBlocker(isDirty);

  // Block browser tab close / page refresh while dirty
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: globalThis.BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Log when navigation is blocked so the bug is observable if it recurs in production
  useEffect(() => {
    if (blocker.state === 'blocked') {
      console.error(
        `[${componentName}] Navigation blocked — user has unsaved changes. ` +
          'Show UnsavedChangesDialog and let user confirm.',
      );
    }
  }, [blocker.state, componentName]);

  return blocker;
}
