import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node } from '@tiptap/pm/model';
import { AnnotationLayer } from '@/types/annotations';

export interface TextRangeAnnotation {
  id: string;
  layer: AnnotationLayer;
  textRange: { from: number; to: number };
}

const LAYER_CLASS: Record<AnnotationLayer, string> = {
  [AnnotationLayer.PERSONAL]: 'annotation-highlight--PERSONAL',
  [AnnotationLayer.SHARED]: 'annotation-highlight--SHARED',
  [AnnotationLayer.INSTRUCTOR]: 'annotation-highlight--INSTRUCTOR',
  [AnnotationLayer.AI_GENERATED]: 'annotation-highlight--AI_GENERATED',
};

// Layer priority for overlapping annotations (higher index = higher priority)
const LAYER_PRIORITY: AnnotationLayer[] = [
  AnnotationLayer.AI_GENERATED,
  AnnotationLayer.PERSONAL,
  AnnotationLayer.SHARED,
  AnnotationLayer.INSTRUCTOR,
];

export const annotationPluginKey = new PluginKey<DecorationSet>('annotations');

function buildDecorationSet(
  doc: Node,
  annotations: TextRangeAnnotation[],
  focusedId: string | null,
): DecorationSet {
  const decorations: Decoration[] = [];

  // Sort by priority so higher-priority layers render last (win click events)
  const sorted = [...annotations].sort(
    (a, b) => LAYER_PRIORITY.indexOf(a.layer) - LAYER_PRIORITY.indexOf(b.layer),
  );

  for (const ann of sorted) {
    const { from, to } = ann.textRange;
    // Clamp to document bounds
    const clampedFrom = Math.max(0, Math.min(from, doc.content.size));
    const clampedTo = Math.max(0, Math.min(to, doc.content.size));
    if (clampedFrom >= clampedTo) continue;

    const classes = [
      'annotation-highlight',
      LAYER_CLASS[ann.layer],
      focusedId === ann.id ? 'annotation-highlight--focused' : '',
    ]
      .filter(Boolean)
      .join(' ');

    decorations.push(
      Decoration.inline(clampedFrom, clampedTo, {
        class: classes,
        'data-annotation-id': ann.id,
      }),
    );
  }

  return DecorationSet.create(doc, decorations);
}

export function createAnnotationDecorationsPlugin(
  getAnnotations: () => TextRangeAnnotation[],
  getFocusedId: () => string | null,
) {
  return new Plugin<DecorationSet>({
    key: annotationPluginKey,
    state: {
      init(_, { doc }) {
        return buildDecorationSet(doc, getAnnotations(), getFocusedId());
      },
      apply(tr, old, _, newState) {
        if (tr.getMeta(annotationPluginKey)) {
          return buildDecorationSet(newState.doc, getAnnotations(), getFocusedId());
        }
        return old.map(tr.mapping, newState.doc);
      },
    },
    props: {
      decorations(state) {
        return annotationPluginKey.getState(state);
      },
    },
  });
}

export function createAnnotationExtension(
  getAnnotations: () => TextRangeAnnotation[],
  getFocusedId: () => string | null,
) {
  return Extension.create({
    name: 'annotationDecorations',
    addProseMirrorPlugins() {
      return [createAnnotationDecorationsPlugin(getAnnotations, getFocusedId)];
    },
  });
}
