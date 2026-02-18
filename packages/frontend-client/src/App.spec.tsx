import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { gql } from '@apollo/client';

// ---------------------------------------------------------------------------
// Mock react-router-dom's BrowserRouter so we can wrap with MemoryRouter
// in tests instead.  App uses BrowserRouter internally; we replace it so
// we control the routing context.
// ---------------------------------------------------------------------------
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...mod,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock heavy child components to isolate App logic
vi.mock('./components/CourseList', () => ({
  default: () => <div data-testid="course-list">CourseList</div>,
}));
vi.mock('./components/CourseDetail', () => ({
  default: () => <div data-testid="course-detail">CourseDetail</div>,
}));
vi.mock('./components/AITutor', () => ({
  default: () => <div data-testid="ai-tutor">AITutor</div>,
}));

import App from './App';

const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      firstName
      lastName
      role
    }
  }
`;

const MOCK_ME = {
  id: 'user-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lastName: 'Smith',
  role: 'STUDENT',
};

function renderApp(mocks: MockedResponse[] = [], initialEntry = '/') {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the EduSphere heading', () => {
    renderApp();
    // The heading contains the emoji + text
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
  });

  it('renders navigation links for Courses and AI Tutor', () => {
    renderApp();
    expect(screen.getByText('Courses')).toBeDefined();
    expect(screen.getByText('AI Tutor')).toBeDefined();
  });

  it('shows "Loading user..." while the ME query is in-flight', () => {
    const loadingMock: MockedResponse = {
      request: { query: ME_QUERY },
      result: { data: { me: MOCK_ME } },
      delay: 10_000, // keep loading indefinitely for this test
    };
    renderApp([loadingMock]);
    expect(screen.getByText('Loading user...')).toBeDefined();
  });

  it('renders CourseList at root path "/" by default', () => {
    renderApp([], '/');
    expect(screen.getByTestId('course-list')).toBeDefined();
  });

  it('renders AITutor at "/tutor" path', () => {
    renderApp([], '/tutor');
    expect(screen.getByTestId('ai-tutor')).toBeDefined();
  });

  it('shows user name and role after ME query resolves', async () => {
    const mock: MockedResponse = {
      request: { query: ME_QUERY },
      result: { data: { me: MOCK_ME } },
    };

    renderApp([mock]);

    // Wait for the query result to render
    await vi.waitFor(() => {
      expect(screen.getByText(/Alice Smith/)).toBeDefined();
    });
    expect(screen.getByText(/STUDENT/)).toBeDefined();
  });

  it('shows error message when ME query fails', async () => {
    const errorMock: MockedResponse = {
      request: { query: ME_QUERY },
      error: new Error('Unauthorized'),
    };

    renderApp([errorMock]);

    await vi.waitFor(() => {
      expect(screen.getByText(/Unauthorized/)).toBeDefined();
    });
  });
});
