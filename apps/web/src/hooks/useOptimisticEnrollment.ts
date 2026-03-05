/**
 * useOptimisticEnrollment — wraps enrollment/unenrollment mutations with
 * React 19 useOptimistic so the button label flips immediately on click,
 * before the GraphQL mutation round-trip completes.
 *
 * React 19 automatically reverts the optimistic state if the transition
 * throws or if the component unmounts before the mutation resolves, so no
 * manual revert logic is needed here.
 *
 * Usage:
 *   const { optimisticEnrolled, handleEnroll, isEnrolling } =
 *     useOptimisticEnrollment({ courseId, isEnrolled, enrollMutation,
 *                               unenrollMutation, onSuccess, onError });
 */
import { useOptimistic, useTransition } from 'react';

interface EnrollMutationResult {
  error?: { graphQLErrors?: Array<{ message: string }>; message: string } | null;
}

type MutationFn = (vars: { courseId: string }) => Promise<EnrollMutationResult>;

interface UseOptimisticEnrollmentOptions {
  courseId: string;
  isEnrolled: boolean;
  enrollMutation: MutationFn;
  unenrollMutation: MutationFn;
  onSuccess: (message: string) => void;
  onError: (message: string, raw: unknown) => void;
  enrollSuccessMessage: string;
  unenrollSuccessMessage: string;
  enrollFailMessage: string;
  unenrollFailMessage: string;
}

export interface UseOptimisticEnrollmentReturn {
  /** Optimistic enrolled state — flips immediately on button click. */
  optimisticEnrolled: boolean;
  /** Call this when the user clicks the enroll/unenroll button. */
  handleEnroll: () => void;
  /** True while the mutation transition is in-flight. */
  isEnrolling: boolean;
}

export function useOptimisticEnrollment({
  courseId,
  isEnrolled,
  enrollMutation,
  unenrollMutation,
  onSuccess,
  onError,
  enrollSuccessMessage,
  unenrollSuccessMessage,
  enrollFailMessage,
  unenrollFailMessage,
}: UseOptimisticEnrollmentOptions): UseOptimisticEnrollmentReturn {
  // useOptimistic: base state is the server-derived isEnrolled boolean.
  // The reducer simply returns the new value passed to setOptimisticEnrolled.
  const [optimisticEnrolled, setOptimisticEnrolled] = useOptimistic(
    isEnrolled,
    (_state: boolean, newValue: boolean) => newValue
  );

  const [isEnrolling, startEnrollTransition] = useTransition();

  const handleEnroll = () => {
    const nextEnrolled = !isEnrolled;

    startEnrollTransition(async () => {
      // Flip the UI immediately — React 19 reverts if the async work throws.
      setOptimisticEnrolled(nextEnrolled);

      if (isEnrolled) {
        const { error: unenrollErr } = await unenrollMutation({ courseId });
        if (unenrollErr) {
          const msg =
            unenrollErr.graphQLErrors?.[0]?.message ??
            unenrollErr.message ??
            unenrollFailMessage;
          onError(msg, unenrollErr);
          return;
        }
        onSuccess(unenrollSuccessMessage);
      } else {
        const { error: enrollErr } = await enrollMutation({ courseId });
        if (enrollErr) {
          const msg =
            enrollErr.graphQLErrors?.[0]?.message ??
            enrollErr.message ??
            enrollFailMessage;
          onError(msg, enrollErr);
          return;
        }
        onSuccess(enrollSuccessMessage);
      }
    });
  };

  return { optimisticEnrolled, handleEnroll, isEnrolling };
}
