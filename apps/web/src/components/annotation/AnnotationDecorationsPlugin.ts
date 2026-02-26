import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorState } from '@tiptap/pm/state';
import { AnnotationLayer } from '@/types/annotations';

export interface TextRangeAnnotation {
  id: string;
  from: number;
  to: number;
  layer: AnnotationLayer;
}

export const annotationPluginKey = new PluginKey<DecorationSet>(
  'annotationDecorations'
);

const LAYER_PRIORITY: Record<AnnotationLayer, number> = {
  [AnnotationLayer.INSTRUCTOR]: 4,
  [AnnotationLayer.SHARED]: 3,
  [AnnotationLayer.PERSONAL]: 2,
  [AnnotationLayer.AI_GENERATED]: 1,
};

function buildDecorationSet(
  state: EditorState,
  annotations: TextRangeAnnotation[],
  focusedId: string | null
): DecorationSet {
  const docSize = state.doc.content.size;
  const decorations: Decoration[] = [];

  // Sort so highest priority renders last (topmost visually)
  const sorted = [...annotations].sort(
    (a, b) => (LAYER_PRIORITY[a.layer] ?? 0) - (LAYER_PRIORITY[b.layer] ?? 0)
  );

  for (const ann of sorted) {
    const from = Math.max(0, ann.from);
    const to = Math.min(docSize, ann.to);
    if (from >= to) continue;

    const isFocused = ann.id === focusedId;
    const classes = [
      'annotation-highlight',
      `annotation-highlight--${ann.layer}`,
      ...(isFocused ? ['annotation-highlight--focused'] : []),
    ].join(' ');

    decorations.push(
      Decoration.inline(from, to, {
        class: classes,
        'data-annotation-id': ann.id,
      })
    );
  }

  return DecorationSet.create(state.doc, decorations);
}

/**
 * Creates a Tiptap Extension that adds a ProseMirror Plugin responsible for
 * rendering colored inline Decoration spans over annotated text ranges.
 *
 * Pass refs (not values) to avoid stale closures — the plugin reads the
 * current ref value each time it rebuilds the decoration set.
 */
export function createAnnotationExtension(
  annotationsRef: { current: TextRangeAnnotation[] },
  focusedIdRef: { current: string | null }
) {
  return Extension.create({
    name: 'annotationDecorations',

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: annotationPluginKey,
          state: {
            init(_, editorState) {
              return buildDecorationSet(
                editorState,
                annotationsRef.current,
                focusedIdRef.current
              );
            },
            apply(tr, decorationSet, _, newState) {
              if (tr.getMeta(annotationPluginKey)) {
                return buildDecorationSet(
                  newState,
                  annotationsRef.current,
                  focusedIdRef.current
                );
              }
              return decorationSet.map(tr.mapping, tr.doc);
            },
          },
          props: {
            decorations(state) {
              return this.getState(state) ?? DecorationSet.empty;
            },
          },
        }),
      ];
    },
  });
}
