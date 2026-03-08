import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { VisualAnchor } from '@/components/visual-anchoring/visual-anchor.types';

interface ResumeBannerProps {
  activeAnchor: VisualAnchor | undefined;
  onResume: () => void;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 8_000;

/**
 * "Return to last place" banner shown when the user has a saved scroll position.
 * Auto-dismisses after 8 seconds. Memory-safe: setTimeout cleared on unmount.
 */
export function ResumeBanner({ activeAnchor, onResume, onDismiss }: ResumeBannerProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-card border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3"
      role="status"
      aria-live="polite"
    >
      <span className="text-sm">המשך מהמקום שעצרת</span>
      {activeAnchor?.visualAsset && (
        <img
          src={activeAnchor.visualAsset.webpUrl ?? activeAnchor.visualAsset.storageUrl}
          alt=""
          className="h-10 w-10 object-cover rounded"
          aria-hidden="true"
        />
      )}
      <Button size="sm" onClick={onResume}>
        המשך
      </Button>
      <Button size="sm" variant="ghost" onClick={onDismiss}>
        התחל מהתחלה
      </Button>
    </div>
  );
}
