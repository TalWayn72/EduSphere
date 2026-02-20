import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

// Mock urql before component import — use vi.fn() so we can override per-test
const mockUseQuery = vi.fn(() => [{ data: undefined, fetching: false, error: undefined }, vi.fn()]);
const mockUseMutation = vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]);

vi.mock("urql", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock Layout to avoid auth/nav complexity
vi.mock("@/components/Layout", () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

// Mock graphql query strings
vi.mock("@/lib/graphql/collaboration.queries", () => ({
  MY_DISCUSSIONS_QUERY: "query MyDiscussions { myDiscussions { id } }",
  CREATE_DISCUSSION_MUTATION: "mutation CreateDiscussion(: CreateDiscussionInput!) { createDiscussion { id } }",
}));

import { CollaborationPage } from "./CollaborationPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <CollaborationPage />
    </MemoryRouter>
  );
}

describe("CollaborationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue([{ data: undefined, fetching: false, error: undefined }, vi.fn()]);
    mockUseMutation.mockReturnValue([{ fetching: false, error: undefined }, vi.fn()]);
  });

  it("renders the Collaboration heading", () => {
    renderPage();
    expect(screen.getByText("Collaboration")).toBeInTheDocument();
  });

  it("renders inside Layout wrapper", () => {
    renderPage();
    expect(screen.getByTestId("layout")).toBeInTheDocument();
  });

  it("renders Human Chavruta section", () => {
    renderPage();
    expect(screen.getByText("Human Chavruta")).toBeInTheDocument();
  });

  it("renders AI Chavruta section", () => {
    renderPage();
    expect(screen.getByText("AI Chavruta")).toBeInTheDocument();
  });

  it("renders Find a Chavruta Partner button", () => {
    renderPage();
    expect(screen.getByText("Find a Chavruta Partner")).toBeInTheDocument();
  });

  it("renders Start AI Chavruta button", () => {
    renderPage();
    expect(screen.getByText("Start AI Chavruta")).toBeInTheDocument();
  });

  it("shows loading state when fetching is true", () => {
    mockUseQuery.mockReturnValue([{ data: undefined, fetching: true, error: undefined }, vi.fn()]);
    renderPage();
    expect(screen.getByText(/Loading sessions/i)).toBeInTheDocument();
  });

  it("shows error message when query fails", () => {
    mockUseQuery.mockReturnValue([
      { data: undefined, fetching: false, error: { message: "Network error" } },
      vi.fn(),
    ]);
    renderPage();
    expect(screen.getByText(/Failed to load sessions/i)).toBeInTheDocument();
  });

  it("shows empty discussions message when no sessions", () => {
    mockUseQuery.mockReturnValue([
      { data: { myDiscussions: [] }, fetching: false, error: undefined },
      vi.fn(),
    ]);
    renderPage();
    expect(screen.getByText("No discussions yet.")).toBeInTheDocument();
  });

  it('shows searching state when Find a Chavruta Partner is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByText('Find a Chavruta Partner'));
    expect(screen.getByText(/Searching for partner/i)).toBeInTheDocument();
  });

  it('shows AI searching state when Start AI Chavruta is clicked', () => {
    vi.useFakeTimers();
    renderPage();
    fireEvent.click(screen.getByText('Start AI Chavruta'));
    expect(screen.getByText(/Connecting to AI agent/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('renders active Chavruta session when data contains CHAVRUTA discussion', () => {
    const now = new Date().toISOString();
    mockUseQuery.mockReturnValue([
      {
        data: {
          myDiscussions: [
            {
              id: 'disc-1',
              courseId: 'c1',
              title: 'Active Chavruta',
              description: null,
              creatorId: 'u1',
              discussionType: 'CHAVRUTA',
              participantCount: 2,
              messageCount: 5,
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ]);
    renderPage();
    expect(screen.getByText('Active Chavruta')).toBeInTheDocument();
    expect(screen.getByText(/Active Chavruta Sessions/i)).toBeInTheDocument();
  });

  it('renders recent non-CHAVRUTA session in Recent Discussions', () => {
    const now = new Date().toISOString();
    mockUseQuery.mockReturnValue([
      {
        data: {
          myDiscussions: [
            {
              id: 'disc-2',
              courseId: 'c1',
              title: 'Forum Discussion',
              description: null,
              creatorId: 'u1',
              discussionType: 'FORUM',
              participantCount: 3,
              messageCount: 10,
              createdAt: now,
              updatedAt: now,
            },
          ],
        },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ]);
    renderPage();
    expect(screen.getByText('Forum Discussion')).toBeInTheDocument();
    expect(screen.getByText(/Recent Discussions/i)).toBeInTheDocument();
  });

  it('calls create mutation when New Session button is clicked', async () => {
    const executeCreate = vi.fn().mockResolvedValue({ data: { createDiscussion: { id: 'new-disc', title: 'Session' } }, error: undefined });
    mockUseMutation.mockReturnValue([{ fetching: false, error: undefined }, executeCreate]);
    mockUseQuery.mockReturnValue([
      { data: { myDiscussions: [] }, fetching: false, error: undefined },
      vi.fn(),
    ]);
    renderPage();
    fireEvent.click(screen.getByTitle ? screen.getByText('New Session') : screen.getByText('New Session'));
    expect(executeCreate).toHaveBeenCalled();
  });

  it('formatRelativeTime displays Just now for very recent timestamps', () => {
    const justNow = new Date().toISOString();
    mockUseQuery.mockReturnValue([
      {
        data: {
          myDiscussions: [
            {
              id: 'disc-3', courseId: 'c1', title: 'Recent Session',
              description: null, creatorId: 'u1', discussionType: 'CHAVRUTA',
              participantCount: 1, messageCount: 1,
              createdAt: justNow, updatedAt: justNow,
            },
          ],
        },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ]);
    renderPage();
    expect(screen.getByText('Just now')).toBeInTheDocument();
  });
});