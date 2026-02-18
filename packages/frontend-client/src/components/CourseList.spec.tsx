import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { gql } from '@apollo/client';
import CourseList from './CourseList';

const COURSES_QUERY = gql`
  query Courses {
    courses(limit: 20) {
      id
      title
      description
      isPublished
      createdAt
    }
  }
`;

const MOCK_COURSES = [
  {
    id: 'c1',
    title: 'Intro to TypeScript',
    description: 'Learn the basics',
    isPublished: true,
    createdAt: '2024-01-15T00:00:00.000Z',
  },
  {
    id: 'c2',
    title: 'Advanced React',
    description: 'Deep dive into React',
    isPublished: false,
    createdAt: '2024-02-20T00:00:00.000Z',
  },
];

function renderCourseList(mocks: MockedResponse[] = []) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('CourseList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Loading courses..." while the query is in-flight', () => {
    const mock: MockedResponse = {
      request: { query: COURSES_QUERY },
      result: { data: { courses: MOCK_COURSES } },
      delay: 10_000,
    };
    renderCourseList([mock]);
    expect(screen.getByText('Loading courses...')).toBeDefined();
  });

  it('renders list of course titles after the query resolves', async () => {
    const mock: MockedResponse = {
      request: { query: COURSES_QUERY },
      result: { data: { courses: MOCK_COURSES } },
    };

    renderCourseList([mock]);

    await vi.waitFor(() => {
      expect(screen.getByText('Intro to TypeScript')).toBeDefined();
    });
    expect(screen.getByText('Advanced React')).toBeDefined();
  });

  it('renders course descriptions', async () => {
    const mock: MockedResponse = {
      request: { query: COURSES_QUERY },
      result: { data: { courses: MOCK_COURSES } },
    };

    renderCourseList([mock]);

    await vi.waitFor(() => {
      expect(screen.getByText('Learn the basics')).toBeDefined();
    });
  });

  it('shows "(Draft)" label for unpublished courses', async () => {
    const mock: MockedResponse = {
      request: { query: COURSES_QUERY },
      result: { data: { courses: MOCK_COURSES } },
    };

    renderCourseList([mock]);

    await vi.waitFor(() => {
      expect(screen.getByText('(Draft)')).toBeDefined();
    });
  });

  it('renders an error message when the query fails', async () => {
    const errorMock: MockedResponse = {
      request: { query: COURSES_QUERY },
      error: new Error('Network error'),
    };

    renderCourseList([errorMock]);

    await vi.waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeDefined();
    });
  });

  it('renders links that point to /course/:id', async () => {
    const mock: MockedResponse = {
      request: { query: COURSES_QUERY },
      result: { data: { courses: MOCK_COURSES } },
    };

    renderCourseList([mock]);

    await vi.waitFor(() => {
      expect(screen.getByText('Intro to TypeScript')).toBeDefined();
    });

    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/course/c1');
    expect(hrefs).toContain('/course/c2');
  });

  it('renders no courses when the list is empty', async () => {
    const mock: MockedResponse = {
      request: { query: COURSES_QUERY },
      result: { data: { courses: [] } },
    };

    renderCourseList([mock]);

    await vi.waitFor(() => {
      expect(screen.queryByText('Loading courses...')).toBeNull();
    });

    expect(screen.queryByRole('link')).toBeNull();
  });
});
