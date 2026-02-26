import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { gql } from '@apollo/client';
import CourseDetail from './CourseDetail';

const COURSE_DETAIL_QUERY = gql`
  query CourseDetail($id: ID!) {
    course(id: $id) {
      id
      title
      description
      isPublished
      modules {
        id
        title
        description
        orderIndex
        contentItems {
          id
          title
          type
          orderIndex
        }
      }
    }
  }
`;

const MOCK_COURSE = {
  id: 'course-1',
  title: 'GraphQL Fundamentals',
  description: 'Learn GraphQL from scratch',
  isPublished: true,
  modules: [
    {
      id: 'mod-1',
      title: 'Introduction',
      description: 'Overview of GraphQL',
      orderIndex: 1,
      contentItems: [
        {
          id: 'ci-1',
          title: 'What is GraphQL?',
          type: 'READING',
          orderIndex: 1,
        },
        { id: 'ci-2', title: 'Demo video', type: 'VIDEO', orderIndex: 2 },
        { id: 'ci-3', title: 'Quiz 1', type: 'QUIZ', orderIndex: 3 },
        {
          id: 'ci-4',
          title: 'Practice exercise',
          type: 'EXERCISE',
          orderIndex: 4,
        },
      ],
    },
    {
      id: 'mod-2',
      title: 'Queries',
      description: 'Writing GraphQL queries',
      orderIndex: 2,
      contentItems: [],
    },
  ],
};

function renderCourseDetail(courseId: string, mocks: MockedResponse[] = []) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter initialEntries={[`/course/${courseId}`]}>
        <Routes>
          <Route path="/course/:id" element={<CourseDetail />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>
  );
}

describe('CourseDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Loading course..." while the query is in-flight', () => {
    const mock: MockedResponse = {
      request: {
        query: COURSE_DETAIL_QUERY,
        variables: { id: 'course-1' },
      },
      result: { data: { course: MOCK_COURSE } },
      delay: 10_000,
    };

    renderCourseDetail('course-1', [mock]);
    expect(screen.getByText('Loading course...')).toBeDefined();
  });

  it('renders the course title after query resolves', async () => {
    const mock: MockedResponse = {
      request: {
        query: COURSE_DETAIL_QUERY,
        variables: { id: 'course-1' },
      },
      result: { data: { course: MOCK_COURSE } },
    };

    renderCourseDetail('course-1', [mock]);

    await vi.waitFor(() => {
      expect(screen.getByText('GraphQL Fundamentals')).toBeDefined();
    });
  });

  it('renders the course description', async () => {
    const mock: MockedResponse = {
      request: {
        query: COURSE_DETAIL_QUERY,
        variables: { id: 'course-1' },
      },
      result: { data: { course: MOCK_COURSE } },
    };

    renderCourseDetail('course-1', [mock]);

    await vi.waitFor(() => {
      expect(screen.getByText('Learn GraphQL from scratch')).toBeDefined();
    });
  });

  it('renders module titles', async () => {
    const mock: MockedResponse = {
      request: {
        query: COURSE_DETAIL_QUERY,
        variables: { id: 'course-1' },
      },
      result: { data: { course: MOCK_COURSE } },
    };

    renderCourseDetail('course-1', [mock]);

    await vi.waitFor(() => {
      expect(screen.getByText('Introduction')).toBeDefined();
    });
    expect(screen.getByText('Queries')).toBeDefined();
  });

  it('renders READING content items with correct title', async () => {
    const mock: MockedResponse = {
      request: {
        query: COURSE_DETAIL_QUERY,
        variables: { id: 'course-1' },
      },
      result: { data: { course: MOCK_COURSE } },
    };

    renderCourseDetail('course-1', [mock]);

    await vi.waitFor(() => {
      expect(screen.getByText(/What is GraphQL\?/)).toBeDefined();
    });
  });

  it('renders VIDEO, QUIZ, and EXERCISE content items', async () => {
    const mock: MockedResponse = {
      request: {
        query: COURSE_DETAIL_QUERY,
        variables: { id: 'course-1' },
      },
      result: { data: { course: MOCK_COURSE } },
    };

    renderCourseDetail('course-1', [mock]);

    await vi.waitFor(() => {
      expect(screen.getByText(/Demo video/)).toBeDefined();
    });
    expect(screen.getByText(/Quiz 1/)).toBeDefined();
    expect(screen.getByText(/Practice exercise/)).toBeDefined();
  });

  it('renders an error message when query fails', async () => {
    const errorMock: MockedResponse = {
      request: {
        query: COURSE_DETAIL_QUERY,
        variables: { id: 'missing' },
      },
      error: new Error('Course not found'),
    };

    renderCourseDetail('missing', [errorMock]);

    await vi.waitFor(() => {
      expect(screen.getByText(/Course not found/)).toBeDefined();
    });
  });

  it('passes the correct course id from URL params to the query', async () => {
    const mock: MockedResponse = {
      request: {
        query: COURSE_DETAIL_QUERY,
        variables: { id: 'xyz-456' },
      },
      result: {
        data: {
          course: {
            ...MOCK_COURSE,
            id: 'xyz-456',
            title: 'Another Course',
            modules: [],
          },
        },
      },
    };

    renderCourseDetail('xyz-456', [mock]);

    await vi.waitFor(() => {
      expect(screen.getByText('Another Course')).toBeDefined();
    });
  });
});
