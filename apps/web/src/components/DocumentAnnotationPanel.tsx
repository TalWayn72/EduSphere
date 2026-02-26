import {
  Annotation,
  AnnotationLayer,
  ANNOTATION_LAYER_CONFIGS,
} from '@/types/annotations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface DocumentAnnotationPanelProps {
  allAnnotations: Annotation[];
  focusedAnnotationId: string | null;
  onAnnotationFocus: (id: string | null) => void;
  onAddAnnotation: (
    text: string,
    layer: AnnotationLayer,
    from: number,
    to: number
  ) => Promise<void>;
  fetching: boolean;
  error: string | null;
  currentUserId?: string;
  currentUserRole?: 'student' | 'instructor' | 'ai';
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card p-4 animate-pulse space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
      <div className="h-3 w-full rounded bg-muted" />
      <div className="h-3 w-3/4 rounded bg-muted" />
      <div className="h-3 w-20 rounded bg-muted" />
    </div>
  );
}

export function DocumentAnnotationPanel({
  allAnnotations,
  focusedAnnotationId,
  onAnnotationFocus,
  fetching,
  error,
}: DocumentAnnotationPanelProps) {
  if (fetching) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="p-4 bg-white border-b">
          <h2 className="text-lg font-semibold">Text Annotations</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        <div className="p-4 bg-white border-b">
          <h2 className="text-lg font-semibold">Text Annotations</h2>
        </div>
        <div className="flex-1 p-4">
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-4 bg-white border-b">
        <h2 className="text-lg font-semibold">Text Annotations</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {allAnnotations.length} annotation
          {allAnnotations.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {allAnnotations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-sm">No text annotations yet.</p>
            <p className="text-xs mt-1">
              Select text in the document to annotate.
            </p>
          </div>
        ) : (
          allAnnotations.map((annotation) => {
            const config = ANNOTATION_LAYER_CONFIGS[annotation.layer];
            const isFocused = annotation.id === focusedAnnotationId;
            const range = annotation.textRange;

            return (
              <Card
                key={annotation.id}
                className={`cursor-pointer transition-shadow ${
                  isFocused
                    ? 'ring-2 ring-primary border-primary shadow-md'
                    : 'hover:shadow-sm'
                }`}
                onClick={() =>
                  onAnnotationFocus(isFocused ? null : annotation.id)
                }
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-xs ${config.color}`}
                    >
                      {config.icon} {config.label}
                    </Badge>
                    <span className="text-sm font-medium">
                      {annotation.userName}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                    {annotation.content}
                  </p>
                  {range != null && (
                    <p className="text-xs text-gray-400 font-mono">
                      Position: chars {range.from}–{range.to}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
