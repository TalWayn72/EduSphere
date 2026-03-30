import { graphql, HttpResponse } from 'msw';

// ─── Search handlers ─────────────────────────────────────────────────────────

export const searchHandlers = [
  graphql.query('SemanticSearch', () =>
    HttpResponse.json({
      data: {
        semanticSearch: [
          {
            id: 'sem-1',
            content: 'Kal vachomer is a form of a fortiori reasoning',
            similarity: 0.92,
            entityType: 'TRANSCRIPT',
            entityId: 'content-1',
            metadata: { timestamp: 120 },
          },
          {
            id: 'sem-2',
            content:
              'The Talmudic concept of pilpul refers to dialectical analysis',
            similarity: 0.87,
            entityType: 'CONCEPT',
            entityId: 'concept-1',
            metadata: {},
          },
        ],
      },
    })
  ),

  graphql.query('HybridSearch', () =>
    HttpResponse.json({
      data: {
        hybridSearch: {
          edges: [
            {
              cursor: 'cursor-1',
              node: {
                id: 'result-1',
                title: 'Introduction to Talmudic Reasoning',
                snippet: 'Kal vachomer is a fortiori reasoning',
                type: 'TRANSCRIPT',
                href: '/learn/content-1?t=120',
              },
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: 'cursor-1' },
        },
      },
    })
  ),
];
