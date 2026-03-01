import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/content-tier3.queries', () => ({
  DAILY_MICROLESSON_QUERY: 'DAILY_MICROLESSON_QUERY',
}));

vi.mock('@/lib/graphql/content.queries', () => ({
  MARK_CONTENT_VIEWED_MUTATION: 'MARK_CONTENT_VIEWED_MUTATION',
}));

vi.mock('@/components/MicrolessonCard', () => ({
  MicrolessonCard: vi.fn(() => null),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { DailyLearningWidget } from './DailyLearningWidget';
import * as urql from 'urql';
import { MicrolessonCard } from '@/components/MicrolessonCard';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_LESSON_DATA = {
  id: 'lesson-1',
  title: 'Understanding React Hooks',
  content: JSON.stringify({
    objective: 'Learn useState and useEffect',
    conceptName: 'React Hooks',
    body: 'Hooks are functions that let you...',
    durationSeconds: 240,
  }),
  contentType: 'MICROLESSON',
  duration: 240,
};

function setupQueries(lessonData: typeof MOCK_LESSON_DATA | null = null, overrides: Record<string, unknown> = {}) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { dailyMicrolesson: lessonData },
      fetching: false,
      error: undefined,
      ...overrides,
    },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([{}, vi.fn()] as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DailyLearningWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupQueries();
  });

  it('renders the "Daily Learning" card title', () => {
    render(<DailyLearningWidget />);
    expect(screen.getByText('Daily Learning')).toBeInTheDocument();
  });

  it('shows today\'s lesson description when not completed', () => {
    render(<DailyLearningWidget />);
    expect(screen.getByText(/today's 3-7 minute microlesson/i)).toBeInTheDocument();
  });

  it('shows loading text while fetching', () => {
    setupQueries(null, { fetching: true });
    render(<DailyLearningWidget />);
    expect(screen.getByText(/loading today's lesson/i)).toBeInTheDocument();
  });

  it('shows error message when query fails', () => {
    setupQueries(null, { error: { message: 'Network error' } });
    render(<DailyLearningWidget />);
    expect(screen.getByText(/could not load lesson/i)).toBeInTheDocument();
  });

  it('shows "No microlessons available yet" when data is null', () => {
    setupQueries(null);
    render(<DailyLearningWidget />);
    expect(screen.getByText(/no microlessons available yet/i)).toBeInTheDocument();
  });

  it('shows lesson concept name and "Start Today\'s Lesson" button when lesson is available', () => {
    setupQueries(MOCK_LESSON_DATA);
    render(<DailyLearningWidget />);
    expect(screen.getByText('React Hooks')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /start today's lesson/i })
    ).toBeInTheDocument();
  });

  it('shows lesson objective below concept name', () => {
    setupQueries(MOCK_LESSON_DATA);
    render(<DailyLearningWidget />);
    expect(screen.getByText('Learn useState and useEffect')).toBeInTheDocument();
  });

  it('renders MicrolessonCard after clicking "Start Today\'s Lesson"', () => {
    setupQueries(MOCK_LESSON_DATA);
    render(<DailyLearningWidget />);
    fireEvent.click(screen.getByRole('button', { name: /start today's lesson/i }));
    expect(vi.mocked(MicrolessonCard)).toHaveBeenCalled();
  });

  it('hides "Start Today\'s Lesson" button after it is clicked', () => {
    setupQueries(MOCK_LESSON_DATA);
    render(<DailyLearningWidget />);
    fireEvent.click(screen.getByRole('button', { name: /start today's lesson/i }));
    expect(
      screen.queryByRole('button', { name: /start today's lesson/i })
    ).not.toBeInTheDocument();
  });
});
