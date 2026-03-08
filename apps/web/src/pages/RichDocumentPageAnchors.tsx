/**
 * RichDocumentPageAnchors — visual anchoring sub-layout for RichDocumentPage.
 *
 * Renders:
 *   student mode : [VisualSidebar 280px] | [children (document + annotation panels)]
 *   instructor mode: [children] | [InstructorAnchorPanel 320px]
 *
 * AnchorFrame is rendered as a position:relative overlay inside the document
 * container — caller must pass a scrollContainerRef pointing to that element.
 */
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from 'urql';
import VisualSidebar from '@/components/visual-anchoring/VisualSidebar';
import AnchorFrame from '@/components/visual-anchoring/AnchorFrame';
import InstructorAnchorPanel from '@/components/visual-anchoring/InstructorAnchorPanel';
import { useAnchorDetection } from '@/hooks/useAnchorDetection';
import { GET_VISUAL_ANCHORS } from '@/components/visual-anchoring/visual-anchor.graphql';
import type { VisualAnchor } from '@/components/visual-anchoring/visual-anchor.types';
import type { RefObject } from 'react';

interface VisualAnchorsResult {
  getVisualAnchors: VisualAnchor[];
}

interface RichDocumentPageAnchorsProps {
  /** The content/asset ID used to load visual anchors. */
  assetId: string;
  /** Whether the current user is an instructor. */
  isInstructor: boolean;
  /** Ref to the document scroll container (for AnchorFrame positioning). */
  scrollContainerRef: RefObject<HTMLElement | null>;
  /** Document + annotation panels passed as children. */
  children: React.ReactNode;
}

/**
 * Wraps the document layout with visual-anchoring panels.
 * Student: VisualSidebar (left) | content.
 * Instructor: content | InstructorAnchorPanel (right).
 */
export function RichDocumentPageAnchors({
  assetId,
  isInstructor,
  scrollContainerRef,
  children,
}: RichDocumentPageAnchorsProps) {
  const [anchorsResult] = useQuery<VisualAnchorsResult>({
    query: GET_VISUAL_ANCHORS,
    variables: { mediaAssetId: assetId },
    pause: !assetId,
  });

  const [localAnchors, setLocalAnchors] = useState<VisualAnchor[]>([]);

  // Stable server anchors reference — prevents useCallback dep churn
  const serverAnchors = useMemo<VisualAnchor[]>(
    () => anchorsResult.data?.getVisualAnchors ?? [],
    [anchorsResult.data?.getVisualAnchors],
  );

  // Merge server anchors with local optimistic removals
  const anchors = localAnchors.length > 0 ? localAnchors : serverAnchors;

  const anchorPositions = anchors.map((a) => ({
    id: a.id,
    documentOrder: a.documentOrder,
  }));

  const { activeAnchorId } = useAnchorDetection(
    anchorPositions,
    scrollContainerRef,
  );

  const handleAnchorDeleted = useCallback(
    (anchorId: string) => {
      setLocalAnchors((prev) => {
        const base = prev.length > 0 ? prev : serverAnchors;
        return base.filter((a) => a.id !== anchorId);
      });
    },
    [serverAnchors],
  );

  const handlePreviewAsStudent = useCallback(() => {
    // Future: toggle isInstructor in parent via callback
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Student: VisualSidebar on the left */}
      {!isInstructor && (
        <VisualSidebar anchors={anchors} activeAnchorId={activeAnchorId} />
      )}

      {/* Document + annotation panels (children) with AnchorFrame overlay */}
      <div className="relative flex-1 overflow-hidden">
        <AnchorFrame
          activeAnchorId={activeAnchorId}
          containerRef={scrollContainerRef}
        />
        {children}
      </div>

      {/* Instructor: anchor management panel on the right */}
      {isInstructor && (
        <div className="w-[320px] shrink-0 border-l border-border overflow-y-auto">
          <InstructorAnchorPanel
            anchors={anchors}
            courseId={assetId}
            onAnchorDeleted={handleAnchorDeleted}
            onPreviewAsStudent={handlePreviewAsStudent}
          />
        </div>
      )}
    </div>
  );
}
