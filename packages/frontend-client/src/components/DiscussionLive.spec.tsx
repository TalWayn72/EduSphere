import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import DiscussionLive from './DiscussionLive';

const DISCUSSION_CREATED_SUB = gql`
  subscription OnDiscussionCreated($courseId: ID!) {
    discussionCreated(courseId: $courseId) {
      id
      title
      content
      upvotes
      createdAt
    }
  }
`;

const MOCK_DISCUSSION = {
  id: 'disc-1',
  title: 'How does async/await work?',
  content: 'I am confused about the event loop.',
  upvotes: 5,
  createdAt: '2024-01-15T09:30:00.000Z',
};

function renderDiscussionLive(courseId: string, mocks: MockedResponse[] = []) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <DiscussionLive courseId={courseId} />
    </MockedProvider>,
  );
}

describe('DiscussionLive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the "Live Updates" heading', () => {
    renderDiscussionLive('course-1');
    expect(screen.getByRole('heading', { level: 3 })).toBeDefined();
  });

  it('renders no new discussion initially (before subscription emits)', () => {
    renderDiscussionLive('course-1');
    expect(screen.queryByText(/New Discussion:/i)).toBeNull();
  });

  it('renders new discussion title when subscription emits', async () => {
    const subMock: MockedResponse = {
      request: {
        query: DISCUSSION_CREATED_SUB,
        variables: { courseId: 'course-1' },
      },
      result: { data: { discussionCreated: MOCK_DISCUSSION } },
    };

    renderDiscussionLive('course-1', [subMock]);

    await vi.waitFor(() => {
      expect(screen.getByText('How does async/await work?')).toBeDefined();
    });
  });

  it('renders the new discussion content when subscription emits', async () => {
    const subMock: MockedResponse = {
      request: {
        query: DISCUSSION_CREATED_SUB,
        variables: { courseId: 'course-1' },
      },
      result: { data: { discussionCreated: MOCK_DISCUSSION } },
    };

    renderDiscussionLive('course-1', [subMock]);

    await vi.waitFor(() => {
      expect(screen.getByText('I am confused about the event loop.')).toBeDefined();
    });
  });

  it('shows "New Discussion:" label when a discussion arrives', async () => {
    const subMock: MockedResponse = {
      request: {
        query: DISCUSSION_CREATED_SUB,
        variables: { courseId: 'course-1' },
      },
      result: { data: { discussionCreated: MOCK_DISCUSSION } },
    };

    renderDiscussionLive('course-1', [subMock]);

    await vi.waitFor(() => {
      expect(screen.getByText(/New Discussion:/i)).toBeDefined();
    });
  });

  it('does NOT show discussion from a different courseId (wrong mock)', () => {
    const wrongMock: MockedResponse = {
      request: {
        query: DISCUSSION_CREATED_SUB,
        variables: { courseId: 'WRONG-COURSE' },
      },
      result: { data: { discussionCreated: MOCK_DISCUSSION } },
    };

    renderDiscussionLive('course-1', [wrongMock]);

    expect(screen.queryByText('How does async/await work?')).toBeNull();
  });

  it('passes courseId as a subscription variable', async () => {
    const subMock: MockedResponse = {
      request: {
        query: DISCUSSION_CREATED_SUB,
        variables: { courseId: 'course-99' },
      },
      result: {
        data: {
          discussionCreated: {
            ...MOCK_DISCUSSION,
            title: 'Topic for course 99',
          },
        },
      },
    };

    renderDiscussionLive('course-99', [subMock]);

    await vi.waitFor(() => {
      expect(screen.getByText('Topic for course 99')).toBeDefined();
    });
  });
});
