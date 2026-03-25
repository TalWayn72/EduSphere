// @vitest-environment jsdom
/**
 * StudentOnboardingSteps component tests
 *
 * Verifies:
 *  1. Renders progress and step indicator
 *  2. Step 1: display name field
 *  3. Step 2: topic checkboxes
 *  4. Step 3: knowledge level buttons
 *  5. Step 4: recommendations message
 *  6. Step 5: completion message
 *  7. Skip button calls onSkip
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockUpdateStep = vi.fn().mockResolvedValue({ data: {} });
const mockCompleteOnboarding = vi.fn().mockResolvedValue({ data: {} });

vi.mock('urql', () => ({
  useMutation: vi.fn((query: string) => {
    if (query.includes('UpdateOnboardingStep') || query === 'UPDATE_ONBOARDING_STEP_MUTATION') {
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
  getCurrentUser: vi.fn(() => null), // No pre-filled user for testing
}));

// ── Import after mocks ──────────────────────────────────────────────────────

import { StudentOnboardingSteps } from './StudentOnboardingSteps';

// ── Tests ───────────────────────────────────────────────────────────────────

describe('StudentOnboardingSteps', () => {
  const defaultProps = {
    currentStep: 1,
    onComplete: vi.fn(),
    onSkip: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders step indicator', () => {
    render(<StudentOnboardingSteps {...defaultProps} />);
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
  });

  it('renders display name field on step 1', () => {
    render(<StudentOnboardingSteps {...defaultProps} />);
    expect(screen.getByText(/Welcome!/)).toBeInTheDocument();
    expect(screen.getByLabelText('Display Name')).toBeInTheDocument();
  });

  it('renders topic checkboxes on step 2', () => {
    render(<StudentOnboardingSteps {...defaultProps} currentStep={2} />);
    expect(screen.getByText('What topics interest you?')).toBeInTheDocument();
    expect(screen.getByText('Torah Study')).toBeInTheDocument();
    expect(screen.getByText('Talmud')).toBeInTheDocument();
    expect(screen.getByText('Jewish History')).toBeInTheDocument();
  });

  it('renders all 12 topic categories', () => {
    render(<StudentOnboardingSteps {...defaultProps} currentStep={2} />);
    const categories = [
      'Torah Study', 'Talmud', 'Halacha', 'Jewish History', 'Hebrew Language',
      'Kabbalah', 'Jewish Philosophy', 'Prayer', 'Lifecycle Events', 'Ethics',
      'Contemporary Issues', 'Israel Studies',
    ];
    categories.forEach((topic) => {
      expect(screen.getByText(topic)).toBeInTheDocument();
    });
  });

  it('renders knowledge level buttons on step 3', () => {
    render(<StudentOnboardingSteps {...defaultProps} currentStep={3} />);
    expect(screen.getByText(/knowledge level/)).toBeInTheDocument();
    expect(screen.getByText('Beginner')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('renders recommendations on step 4', () => {
    render(<StudentOnboardingSteps {...defaultProps} currentStep={4} />);
    expect(screen.getByText('Your personalized recommendations')).toBeInTheDocument();
  });

  it('renders completion message on step 5', () => {
    render(<StudentOnboardingSteps {...defaultProps} currentStep={5} />);
    expect(screen.getByText(/all set/)).toBeInTheDocument();
  });

  it('shows "Go to Dashboard" on last step', () => {
    render(<StudentOnboardingSteps {...defaultProps} currentStep={5} />);
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });

  it('shows "Continue" on non-last steps', () => {
    render(<StudentOnboardingSteps {...defaultProps} />);
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('calls onSkip when Skip button clicked', () => {
    const onSkip = vi.fn();
    render(<StudentOnboardingSteps {...defaultProps} onSkip={onSkip} />);
    fireEvent.click(screen.getByText('Skip for now'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('does not show Skip on step 3 (knowledge level)', () => {
    render(<StudentOnboardingSteps {...defaultProps} currentStep={3} />);
    expect(screen.queryByText('Skip for now')).not.toBeInTheDocument();
  });

  it('updates display name field', () => {
    render(<StudentOnboardingSteps {...defaultProps} />);
    const input = screen.getByLabelText('Display Name');
    fireEvent.change(input, { target: { value: 'Moshe' } });
    expect(input).toHaveValue('Moshe');
  });
});
