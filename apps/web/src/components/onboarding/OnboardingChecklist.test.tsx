// @vitest-environment jsdom
/**
 * OnboardingChecklist component tests
 *
 * Verifies:
 *  1. Returns null when no data
 *  2. Returns null when all steps completed
 *  3. Renders expand button with count
 *  4. Shows checklist when expanded
 *  5. Shows progress bar
 *  6. Shows step items with completion state
 *  7. Dismiss hides the widget
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockOnboardingData = {
  steps: [
    {
      id: 's1',
      label: 'Create first course',
      completed: true,
      href: '/courses/new',
    },
    { id: 's2', label: 'Add a lesson', completed: false, href: '/lessons/new' },
    { id: 's3', label: 'Invite students', completed: false, href: '/invite' },
  ],
  completedCount: 1,
  totalCount: 3,
};

let mockQueryResult: {
  data: { onboardingStatus: typeof mockOnboardingData } | null;
} = {
  data: { onboardingStatus: mockOnboardingData },
};

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [mockQueryResult]),
}));

// ── Import after mocks ──────────────────────────────────────────────────────

import { OnboardingChecklist } from './OnboardingChecklist';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('OnboardingChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult = { data: { onboardingStatus: mockOnboardingData } };
  });

  it('returns null when no data', () => {
    mockQueryResult = { data: null };
    const { container } = render(<OnboardingChecklist />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when all steps completed', () => {
    mockQueryResult = {
      data: {
        onboardingStatus: {
          ...mockOnboardingData,
          completedCount: 3,
          totalCount: 3,
        },
      },
    };
    const { container } = render(<OnboardingChecklist />);
    expect(container.firstChild).toBeNull();
  });

  it('renders expand button with count', () => {
    render(<OnboardingChecklist />);
    // Initially collapsed - shows the button
    expect(screen.getByText(/Setup Checklist/)).toBeInTheDocument();
    expect(screen.getByText(/1\/3/)).toBeInTheDocument();
  });

  it('has complementary role', () => {
    render(<OnboardingChecklist />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('has correct data-testid', () => {
    render(<OnboardingChecklist />);
    expect(screen.getByTestId('onboarding-checklist')).toBeInTheDocument();
  });

  it('shows checklist items when expanded', () => {
    render(<OnboardingChecklist />);
    // Click expand button
    fireEvent.click(screen.getByText(/Setup Checklist/));

    expect(screen.getByText('Create first course')).toBeInTheDocument();
    expect(screen.getByText('Add a lesson')).toBeInTheDocument();
    expect(screen.getByText('Invite students')).toBeInTheDocument();
  });

  it('shows progress text when expanded', () => {
    render(<OnboardingChecklist />);
    fireEvent.click(screen.getByText(/Setup Checklist/));

    expect(screen.getByText('1 of 3 completed')).toBeInTheDocument();
  });

  it('shows dismiss button when expanded', () => {
    render(<OnboardingChecklist />);
    fireEvent.click(screen.getByText(/Setup Checklist/));

    expect(screen.getByText('Dismiss checklist')).toBeInTheDocument();
  });

  it('hides widget after dismiss', () => {
    render(<OnboardingChecklist />);
    fireEvent.click(screen.getByText(/Setup Checklist/));
    fireEvent.click(screen.getByText('Dismiss checklist'));

    expect(
      screen.queryByTestId('onboarding-checklist')
    ).not.toBeInTheDocument();
  });

  it('completed steps have checkmark', () => {
    render(<OnboardingChecklist />);
    fireEvent.click(screen.getByText(/Setup Checklist/));

    // Completed step link has line-through class
    const completedLink = screen.getByText('Create first course');
    expect(completedLink.className).toContain('line-through');
  });
});
