import React, { useEffect, useRef } from 'react';
import CrossFadeImage from './CrossFadeImage';
import type { VisualAnchor } from './visual-anchor.types';

interface VisualSidebarProps {
  anchors: VisualAnchor[];
  activeAnchorId: string | null;
  isRTL?: boolean;
  className?: string;
}

/**
 * Student-facing visual sidebar — shows the image linked to the currently active anchor.
 * Fixed 280px panel. On mobile: not rendered (VisualBottomSheet handles mobile).
 * RTL: switches to right side when isRTL=true.
 * Accessibility: role="complementary", aria-live="polite" for image changes.
 */
export default function VisualSidebar({
  anchors,
  activeAnchorId,
  isRTL = false,
  className = '',
}: VisualSidebarProps) {
  const activeAnchor = activeAnchorId
    ? (anchors.find((a) => a.id === activeAnchorId) ?? null)
    : null;
  const activeAsset = activeAnchor?.visualAsset ?? null;
  const announceRef = useRef<HTMLDivElement>(null);

  // Announce image change to screen readers
  useEffect(() => {
    if (announceRef.current && activeAsset) {
      announceRef.current.textContent = `Visual aid updated: ${activeAsset.filename}`;
    }
  }, [activeAsset]);

  const borderClass = isRTL ? 'border-l' : 'border-r';

  return (
    <aside
      className={`hidden md:flex flex-col w-[280px] shrink-0 bg-card border-border ${borderClass} ${className}`}
      role="complementary"
      aria-label="Visual Aid Sidebar"
      data-testid="visual-sidebar"
    >
      {/* Screen reader live region */}
      <div
        ref={announceRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Visual Aid
        </p>
      </div>

      {/* Image display area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0">
        {!activeAnchor ? (
          // Empty state: no anchors in view
          <div
            className="text-center text-muted-foreground"
            data-testid="sidebar-empty-state"
          >
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
              <svg
                className="w-8 h-8 opacity-40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-sm">Scroll to see visual aids</p>
          </div>
        ) : !activeAsset ? (
          // Anchor exists but no image assigned
          <div
            className="text-center text-muted-foreground"
            data-testid="sidebar-no-image"
          >
            <p className="text-sm">No image assigned to this section</p>
          </div>
        ) : (
          // Show cross-fade image
          <CrossFadeImage
            src={activeAsset.webpUrl ?? activeAsset.storageUrl}
            alt={activeAsset.metadata.altText ?? activeAsset.filename}
            mimeType={activeAsset.mimeType}
            className="w-full max-h-64 rounded-md"
            fadeDuration={400}
          />
        )}
      </div>

      {/* Anchor text preview */}
      {activeAnchor && (
        <div className="px-3 py-2 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground line-clamp-2 italic">
            &ldquo;{activeAnchor.anchorText}&rdquo;
          </p>
        </div>
      )}
    </aside>
  );
}
