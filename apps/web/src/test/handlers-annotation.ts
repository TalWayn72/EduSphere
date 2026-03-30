import { graphql, HttpResponse } from 'msw';
import { FIXTURE_ANNOTATION } from './fixtures';

// ─── Annotation handlers ────────────────────────────────────────────────────

export const annotationHandlers = [
  graphql.query('Annotations', () =>
    HttpResponse.json({ data: { annotations: [FIXTURE_ANNOTATION] } })
  ),

  graphql.mutation('CreateAnnotation', () =>
    HttpResponse.json({
      data: {
        createAnnotation: {
          id: 'ann-new',
          layer: 'PERSONAL',
          type: 'HIGHLIGHT',
          content: 'New annotation',
          startOffset: 0,
          endOffset: 5,
          timestampStart: 10,
          userId: 'user-1',
          createdAt: new Date().toISOString(),
        },
      },
    })
  ),

  graphql.mutation('UpdateAnnotation', () =>
    HttpResponse.json({
      data: {
        updateAnnotation: {
          id: 'ann-1',
          content: 'Updated',
          layer: 'PERSONAL',
          isPinned: false,
          isResolved: false,
          updatedAt: new Date().toISOString(),
        },
      },
    })
  ),

  graphql.mutation('DeleteAnnotation', () =>
    HttpResponse.json({ data: { deleteAnnotation: true } })
  ),

  graphql.mutation('ReplyToAnnotation', () =>
    HttpResponse.json({
      data: {
        replyToAnnotation: {
          id: 'reply-1',
          content: 'Reply content',
          userId: 'user-1',
          createdAt: new Date().toISOString(),
        },
      },
    })
  ),
];
