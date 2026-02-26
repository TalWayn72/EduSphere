import { graphql, HttpResponse } from 'msw';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const FIXTURE_USER = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'STUDENT',
  tenantId: 'tenant-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const FIXTURE_COURSE = {
  id: 'course-1',
  title: 'Introduction to GraphQL',
  description: 'Learn GraphQL from scratch',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const FIXTURE_ANNOTATION = {
  id: 'ann-1',
  layer: 'PERSONAL',
  type: 'HIGHLIGHT',
  content: 'Important concept',
  startOffset: 0,
  endOffset: 10,
  timestampStart: 30,
  timestampEnd: 45,
  userId: 'user-1',
  user: { id: 'user-1', displayName: 'Test User' },
  replies: [],
  isResolved: false,
  isPinned: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const FIXTURE_CONTENT_ITEM = {
  id: 'content-1',
  title: 'Lecture 1',
  description: 'Introduction lecture',
  contentType: 'VIDEO',
  contentData: null,
  assetId: 'asset-1',
  mediaAsset: {
    id: 'asset-1',
    filename: 'lecture1.mp4',
    mimeType: 'video/mp4',
    size: 104857600,
    url: 'https://example.com/lecture1.mp4',
    thumbnailUrl: null,
    duration: 3600,
    metadata: {},
  },
  transcript: null,
  course: { id: 'course-1', title: 'Introduction to GraphQL', description: '' },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// ─── Handlers ────────────────────────────────────────────────────────────────

export const handlers = [
  // ── User queries ──
  graphql.query('Me', () => HttpResponse.json({ data: { me: FIXTURE_USER } })),

  graphql.query('Tenant', () =>
    HttpResponse.json({
      data: {
        tenant: {
          id: 'tenant-1',
          name: 'Test Org',
          slug: 'test-org',
          settings: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      },
    })
  ),

  // ── Course queries ──
  graphql.query('Courses', () =>
    HttpResponse.json({
      data: {
        courses: {
          edges: [{ cursor: 'cursor-1', node: FIXTURE_COURSE }],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: 'cursor-1',
            endCursor: 'cursor-1',
          },
        },
      },
    })
  ),

  graphql.query('CourseContents', () =>
    HttpResponse.json({
      data: {
        course: {
          id: 'course-1',
          title: 'Introduction to GraphQL',
          description: 'Learn GraphQL',
          modules: [
            {
              id: 'module-1',
              title: 'Module 1',
              order: 1,
              contentItems: [
                {
                  id: 'content-1',
                  title: 'Lecture 1',
                  description: '',
                  contentType: 'VIDEO',
                  order: 1,
                },
              ],
            },
          ],
        },
      },
    })
  ),

  // ── Content queries ──
  graphql.query('ContentItem', () =>
    HttpResponse.json({ data: { contentItem: FIXTURE_CONTENT_ITEM } })
  ),

  graphql.query('SearchTranscripts', () =>
    HttpResponse.json({
      data: {
        searchTranscripts: {
          edges: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    })
  ),

  graphql.query('SemanticSearch', () =>
    HttpResponse.json({ data: { semanticSearch: [] } })
  ),

  // ── Annotation queries ──
  graphql.query('Annotations', () =>
    HttpResponse.json({ data: { annotations: [FIXTURE_ANNOTATION] } })
  ),

  // ── Annotation mutations ──
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

  // ── Agent mutations & queries ──
  graphql.mutation('StartAgentSession', () =>
    HttpResponse.json({
      data: {
        startAgentSession: {
          id: 'session-1',
          templateType: 'TUTOR',
          status: 'ACTIVE',
          contextContentId: 'content-1',
          createdAt: new Date().toISOString(),
        },
      },
    })
  ),

  graphql.mutation('SendAgentMessage', () =>
    HttpResponse.json({
      data: {
        sendMessage: {
          id: 'msg-1',
          role: 'ASSISTANT',
          content: 'This is a mock AI response.',
          createdAt: new Date().toISOString(),
        },
      },
    })
  ),

  graphql.query('AgentSession', () =>
    HttpResponse.json({
      data: {
        agentSession: {
          id: 'session-1',
          templateType: 'TUTOR',
          status: 'ACTIVE',
          messages: [],
          createdAt: new Date().toISOString(),
        },
      },
    })
  ),

  graphql.query('MyAgentSessions', () =>
    HttpResponse.json({
      data: {
        myAgentSessions: { edges: [] },
      },
    })
  ),

  graphql.mutation('EndAgentSession', () =>
    HttpResponse.json({
      data: { endSession: { id: 'session-1', status: 'ENDED' } },
    })
  ),

  // ── Course mutations ──
  graphql.mutation('CreateCourse', () =>
    HttpResponse.json({
      data: {
        createCourse: {
          id: 'course-new',
          title: 'New Course',
          description: '',
          isPublished: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    })
  ),

  // ── Profile mutations ──
  graphql.mutation('UpdateMyProfile', () =>
    HttpResponse.json({
      data: {
        updateMyProfile: {
          id: 'user-1',
          firstName: 'Updated',
          lastName: 'User',
          email: 'updated@example.com',
          username: 'updateduser',
          updatedAt: new Date().toISOString(),
        },
      },
    })
  ),

  // ── Search queries ──
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
