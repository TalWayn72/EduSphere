import React, { useRef, useCallback, useEffect } from 'react';
import { RichContentViewer } from '@/components/editor/RichContentViewer';
import type { Editor } from '@tiptap/core';
import { createAnnotationExtension } from './AnnotationDecorationsPlugin';
import { annotationPluginKey } from './AnnotationDecorationsPlugin';
import type { TextRangeAnnotation } from './AnnotationDecorationsPlugin';
import { useUIStore } from '@/lib/store';

export interface SelectionPosition {
  x: number;
  y: number;
}

interface Props {
  content: string;
  annotations: TextRangeAnnotation[];
  onSelectionChange: (
    range: { from: number; to: number } | null,
    position: SelectionPosition | null
  ) => void;
  zoom: number;
}

export function AnnotatedDocumentViewer({
  content,
  annotations,
  onSelectionChange,
  zoom,
}: Props) {
  const annotationsRef = useRef<TextRangeAnnotation[]>(annotations);
  const focusedIdRef = useRef<string | null>(null);
  const editorRef = useRef<Editor | null>(null);

  const { focusedAnnotationId, setFocusedAnnotationId } = useUIStore();

  // Keep refs in sync with latest props/state
  annotationsRef.current = annotations;
  focusedIdRef.current = focusedAnnotationId;

  // Rebuild decorations when annotations or focused id change
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(
      editor.view.state.tr.setMeta(annotationPluginKey, true)
    );
  }, [annotations, focusedAnnotationId]);

  // Scroll editor to focused annotation's position
  useEffect(() => {
    if (!focusedAnnotationId) return;
    const ann = annotations.find((a) => a.id === focusedAnnotationId);
    if (!ann) return;
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed) return;
    editor.commands.focus();
    editor.commands.setTextSelection(ann.from);
    editor.commands.scrollIntoView();
  }, [focusedAnnotationId, annotations]);

  const extension = React.useMemo(
    () => createAnnotationExtension(annotationsRef, focusedIdRef),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleSelectionUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        onSelectionChange(null, null);
        return;
      }
      const coords = editor.view.coordsAtPos(to);
      onSelectionChange({ from, to }, { x: coords.left, y: coords.top });
    },
    [onSelectionChange]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const annotationEl = target.closest<HTMLElement>('[data-annotation-id]');
      if (annotationEl) {
        const id = annotationEl.dataset.annotationId;
        if (id) setFocusedAnnotationId(id);
      }
    },
    [setFocusedAnnotationId]
  );

  return (
    <div
      style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
      onClick={handleClick}
    >
      <RichContentViewer
        content={content}
        extensions={[extension]}
        onSelectionUpdate={handleSelectionUpdate}
        onEditorReady={(editor) => {
          editorRef.current = editor;
        }}
      />
    </div>
  );
}
