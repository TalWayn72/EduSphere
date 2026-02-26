import { useCallback, useEffect, useRef } from 'react';
import { RichContentViewer } from '@/components/editor/RichContentViewer';
import {
  createAnnotationExtension,
  annotationPluginKey,
} from '@/components/annotation/AnnotationDecorationsPlugin';
import type { TextRangeAnnotation } from '@/components/annotation/AnnotationDecorationsPlugin';
import type { Editor } from '@tiptap/core';

interface SelectionPosition {
  x: number;
  y: number;
  from: number;
  to: number;
}

interface AnnotatedDocumentViewerProps {
  content: string;
  annotations: TextRangeAnnotation[];
  focusedAnnotationId: string | null;
  onAnnotationClick: (id: string) => void;
  onSelectionChange: (selection: SelectionPosition | null) => void;
}

export function AnnotatedDocumentViewer({
  content,
  annotations,
  focusedAnnotationId,
  onAnnotationClick,
  onSelectionChange,
}: AnnotatedDocumentViewerProps) {
  // Use refs so the ProseMirror plugin can access latest values without stale closure
  const annotationsRef = useRef(annotations);
  const focusedIdRef = useRef(focusedAnnotationId);
  const editorRef = useRef<Editor | null>(null);

  // Keep refs in sync
  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  useEffect(() => {
    focusedIdRef.current = focusedAnnotationId;
    // Trigger decoration rebuild when focus changes
    if (editorRef.current) {
      const { state, view } = editorRef.current;
      const tr = state.tr.setMeta(annotationPluginKey, true);
      view.dispatch(tr);
    }
  }, [focusedAnnotationId]);

  // Trigger decoration rebuild when annotations change
  useEffect(() => {
    if (editorRef.current) {
      const { state, view } = editorRef.current;
      const tr = state.tr.setMeta(annotationPluginKey, true);
      view.dispatch(tr);
    }
  }, [annotations]);

  // Create extension once — refs provide latest values without recreating the plugin
  const extension = useRef(
    createAnnotationExtension(
      () => annotationsRef.current,
      () => focusedIdRef.current,
    ),
  ).current;

  const handleSelectionUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      editorRef.current = editor;
      const { selection } = editor.state;
      if (selection.empty) {
        onSelectionChange(null);
        return;
      }
      const { from, to } = selection;
      try {
        const coords = editor.view.coordsAtPos(to);
        onSelectionChange({ x: coords.left, y: coords.top, from, to });
      } catch {
        onSelectionChange(null);
      }
    },
    [onSelectionChange],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const annotationEl = target.closest('[data-annotation-id]');
      if (annotationEl) {
        const id = annotationEl.getAttribute('data-annotation-id');
        if (id) onAnnotationClick(id);
      }
    },
    [onAnnotationClick],
  );

  return (
    <div onClick={handleClick} className="relative">
      <RichContentViewer
        content={content}
        extensions={[extension]}
        onSelectionUpdate={handleSelectionUpdate}
      />
    </div>
  );
}
