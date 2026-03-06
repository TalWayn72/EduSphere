/**
 * AnnotationMergeRequestModal — Dialog for proposing a personal annotation
 * as official course content (PRD §4.3 — Annotation Merge Request).
 *
 * The student fills in a short description of why this annotation should
 * be promoted. In production the form calls the `proposeAnnotation` GraphQL
 * mutation. Here the parent handles the submission.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface AnnotationMergeRequestModalProps {
  /** The annotation text being proposed */
  annotationContent: string;
  onSubmit: (description: string) => void;
  onCancel: () => void;
}

export function AnnotationMergeRequestModal({
  annotationContent,
  onSubmit,
  onCancel,
}: AnnotationMergeRequestModalProps) {
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSubmit(description.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-modal-title"
      data-testid="merge-request-modal"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
        <h2 id="merge-modal-title" className="text-lg font-semibold">
          Propose to Official Content
        </h2>

        <div className="bg-muted/50 rounded-md p-3">
          <p className="text-xs text-muted-foreground mb-1 font-medium">
            Your annotation:
          </p>
          <p className="text-sm line-clamp-3">{annotationContent}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="merge-description"
              className="block text-sm font-medium mb-1"
            >
              Why should this become official content?
            </label>
            <textarea
              id="merge-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain why this annotation is relevant for all students..."
              className="w-full min-h-[100px] px-3 py-2 text-sm border rounded-md bg-background resize-none"
              data-testid="merge-description-input"
              autoFocus
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right mt-0.5">
              {description.length}/500
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!description.trim()}
              data-testid="merge-submit-btn"
            >
              Submit Proposal
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
