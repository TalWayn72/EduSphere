/**
 * useAnnotationMutations — CRUD mutation callbacks for annotations.
 */
import { useState, useCallback } from 'react';
import { useMutation } from 'urql';
import { Annotation, AnnotationLayer } from '@/types/annotations';
import {
  REPLY_TO_ANNOTATION_MUTATION,
  PROMOTE_ANNOTATION_MUTATION,
} from '@/lib/graphql/annotation.queries';
import {
  CREATE_ANNOTATION_MUTATION,
} from '@/lib/graphql/annotation.mutations';
import { CREATE_REVIEW_CARD_MUTATION } from '@/lib/graphql/srs.queries';
import { formatTime } from '@/pages/content-viewer.utils';

interface UseAnnotationMutationsArgs {
  contentId: string;
  validAssetId: boolean;
  setLocalAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
  executeQuery: (opts: { requestPolicy: string }) => void;
}

export function useAnnotationMutations({
  contentId,
  validAssetId,
  setLocalAnnotations,
  executeQuery,
}: UseAnnotationMutationsArgs) {
  const [, createAnnotation] = useMutation(CREATE_ANNOTATION_MUTATION);
  const [, replyToAnnotation] = useMutation(REPLY_TO_ANNOTATION_MUTATION);
  const [, createReviewCard] = useMutation(CREATE_REVIEW_CARD_MUTATION);
  const [, promoteAnnotationMutation] = useMutation(PROMOTE_ANNOTATION_MUTATION);

  const [isPending, setIsPending] = useState(false);

  const addAnnotation = useCallback(
    (content: string, layer: AnnotationLayer, timestamp: number) => {
      const tempId = `local-${Date.now()}`;
      const tempAnnotation: Annotation = {
        id: tempId,
        content,
        layer,
        userId: 'current-user',
        userName: 'You',
        userRole: 'student',
        timestamp: formatTime(timestamp),
        contentId,
        contentTimestamp: timestamp || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        replies: [],
      };

      setLocalAnnotations((prev) => [tempAnnotation, ...prev]);

      if (!validAssetId) return;

      setIsPending(true);
      void createAnnotation({
        input: {
          assetId: contentId,
          annotationType: 'TEXT',
          content,
          layer,
          spatialData: timestamp > 0 ? { timestampStart: timestamp } : null,
        },
      }).then((response) => {
        setIsPending(false);
        if (response.error) {
          console.error('[useAnnotations] Failed to save annotation:', response.error.message);
          setLocalAnnotations((prev) => prev.filter((a) => a.id !== tempId));
        } else {
          setLocalAnnotations((prev) => prev.filter((a) => a.id !== tempId));
          executeQuery({ requestPolicy: 'network-only' });
        }
      });
    },
    [contentId, validAssetId, createAnnotation, executeQuery, setLocalAnnotations]
  );

  const addReply = useCallback(
    (parentId: string, content: string, layer: AnnotationLayer, timestamp: number) => {
      const tempId = `local-reply-${Date.now()}`;
      const tempReply: Annotation = {
        id: tempId,
        content,
        layer,
        userId: 'current-user',
        userName: 'You',
        userRole: 'student',
        timestamp: formatTime(timestamp),
        contentId,
        parentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        replies: [],
      };

      setLocalAnnotations((prev) => [...prev, tempReply]);

      if (!validAssetId) return;

      void replyToAnnotation({ annotationId: parentId, content }).then(
        (response) => {
          if (response.error) {
            console.error('[useAnnotations] Failed to save reply:', response.error.message);
            setLocalAnnotations((prev) => prev.filter((a) => a.id !== tempId));
          } else {
            setLocalAnnotations((prev) => prev.filter((a) => a.id !== tempId));
            executeQuery({ requestPolicy: 'network-only' });
          }
        }
      );
    },
    [contentId, validAssetId, replyToAnnotation, executeQuery, setLocalAnnotations]
  );

  const createFlashcard = useCallback(
    async (annotationId: string, content: string): Promise<boolean> => {
      const conceptName = content.slice(0, 200).trim();
      if (!conceptName) return false;
      const response = await createReviewCard({ conceptName });
      if (response.error) {
        console.error(
          `[useAnnotations] Failed to create flashcard for annotation ${annotationId}:`,
          response.error.message
        );
        return false;
      }
      return true;
    },
    [createReviewCard]
  );

  const promoteAnnotation = useCallback(
    async (annotationId: string): Promise<boolean> => {
      const response = await promoteAnnotationMutation({ id: annotationId });
      if (response.error) {
        console.error(
          `[useAnnotations] Failed to promote annotation ${annotationId}:`,
          response.error.message
        );
        return false;
      }
      executeQuery({ requestPolicy: 'network-only' });
      return true;
    },
    [promoteAnnotationMutation, executeQuery]
  );

  return {
    isPending,
    addAnnotation,
    addReply,
    createFlashcard,
    promoteAnnotation,
  };
}
