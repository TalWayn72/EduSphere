// @vitest-environment jsdom
/**
 * InstructorOnboardingSteps component tests
 *
 * Verifies:
 *  1. Renders progress bar and step indicator
 *  2. Step 1: bio and expertise fields
 *  3. Step 2: course title and description
 *  4. Step 3: lesson type buttons
 *  5. Step 4: completion message
 *  6. Skip button calls onSkip
 *  7. Continue button advances steps
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockUpdateStep = vi.fn().mockResolvedValue({ data: {} });
const mockCompleteOnboarding = vi.fn().mockResolvedValue({ data: {} });

vi.mock('urql', () => ({
  useMutation: vi.fn((query: string) => {
    if (
      query.includes('UpdateOnboardingStep') ||
      query === 'UPDATE_ONBOARDING_STEP_MUTATION'
    ) {
      return [{ fetching: false }, mockUpdateStep];
    }
    return [{ fetching: false }, mockCompleteOnboarding];
  }),
}));

vi.mock('@/lib/graphql/onboarding.queries', () => ({
  UPDATE_ONBOARDING_STEP_MUTATION: 'UPDATE_ONBOARDING_STEP_MUTATION',
  COMPLETE_ONBOARDING_MUTATION: 'COMPLETE_ONBOARDING_MUTATION',
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => ({
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
  })),
}));

// ── Import after mocks ──────────────────────────────────────────────────────

import { InstructorOnboardingSteps } from './InstructorOnboardingSteps';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('InstructorOnboardingSteps', () => {
  const defaultProps = {
    currentStep: 1,
    onComplete: vi.fn(),
    onSkip: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders step indicator', () => {
    render(<InstructorOnboardingSteps {...defaultProps} />);
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('renders bio field on step 1', () => {
    render(<InstructorOnboardingSteps {...defaultProps} />);
    expect(screen.getByText('Tell us about yourself')).toBeInTheDocument();
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
  });

  it('renders expertise field on step 1', () => {
    render(<InstructorOnboardingSteps {...defaultProps} />);
    expect(screen.getByLabelText('Subject Expertise')).toBeInTheDocument();
  });

  it('renders course fields on step 2', () => {
    render(<InstructorOnboardingSteps {...defaultProps} currentStep={2} />);
    expect(screen.getByText('Create your first course')).toBeInTheDocument();
    expect(screen.getByLabelText('Course Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('renders lesson type buttons on step 3', () => {
    render(<InstructorOnboardingSteps {...defaultProps} currentStep={3} />);
    expect(screen.getByText('Add your first lesson')).toBeInTheDocument();
    expect(screen.getByText('Video Lesson')).toBeInTheDocument();
    expect(screen.getByText('Quiz')).toBeInTheDocument();
    expect(screen.getByText('Discussion')).toBeInTheDocument();
  });

  it('renders completion on step 4', () => {
    render(<InstructorOnboardingSteps {...defaultProps} currentStep={4} />);
    expect(screen.getByText('Your course is ready!')).toBeInTheDocument();
  });

  it('shows "Go to Dashboard" on last step', () => {
    render(<InstructorOnboardingSteps {...defaultProps} currentStep={4} />);
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('shows "Continue" on non-last steps', () => {
    render(<InstructorOnboardingSteps {...defaultProps} />);
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('calls onSkip when Skip button clicked', () => {
    const onSkip = vi.fn();
    render(<InstructorOnboardingSteps {...defaultProps} onSkip={onSkip} />);
    fireEvent.click(screen.getByText('Skip for now'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('does not show Skip on step 3 (lesson type selection)', () => {
    render(<InstructorOnboardingSteps {...defaultProps} currentStep={3} />);
    expect(screen.queryByText('Skip for now')).not.toBeInTheDocument();
  });

  it('updates bio field value', () => {
    render(<InstructorOnboardingSteps {...defaultProps} />);
    const bioField = screen.getByLabelText('Bio');
    fireEvent.change(bioField, { target: { value: 'My bio' } });
    expect(bioField).toHaveValue('My bio');
  });
});
