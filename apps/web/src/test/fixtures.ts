import { graphql, HttpResponse } from 'msw';

// ─── Fixtures ────────────────────────────────────────────────────────────────

export const FIXTURE_USER = {
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

export const FIXTURE_COURSE = {
  id: 'course-1',
  title: 'Introduction to GraphQL',
  description: 'Learn GraphQL from scratch',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const FIXTURE_ANNOTATION = {
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

export const FIXTURE_CONTENT_ITEM = {
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

// ─── Auth & User handlers ────────────────────────────────────────────────────

export const authHandlers = [
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
];
