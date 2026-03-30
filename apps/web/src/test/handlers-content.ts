import { graphql, HttpResponse } from 'msw';
import { FIXTURE_COURSE, FIXTURE_CONTENT_ITEM } from './fixtures';

// ─── Course & Content handlers ───────────────────────────────────────────────

export const contentHandlers = [
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
];
