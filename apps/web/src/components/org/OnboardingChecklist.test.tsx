/**
 * OnboardingChecklist.test.tsx — Unit tests for OnboardingChecklist component.
 *
 * Covers:
 *   - Step rendering with completion state
 *   - Step completion updates
 *   - Dismissal
 *   - Progress percentage
 *   - Accessibility
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const mockDismiss = vi.fn();
const mockCompleteStep = vi.fn();

vi.mock('@/hooks/useOnboardingChecklist', () => ({
  useOnboardingChecklist: vi.fn(() => ({
    steps: [
      { id: 'BRANDING_CONFIGURED', label: 'orgOnboarding.checklistBranding', completed: true },
      { id: 'FIRST_USER_INVITED', label: 'orgOnboarding.checklistInvite', completed: false },
      { id: 'FIRST_COURSE_CREATED', label: 'orgOnboarding.checklistCourse', completed: false },
      { id: 'DOMAIN_CONFIGURED', label: 'orgOnboarding.checklistDomain', completed: false },
      { id: 'SSO_CONFIGURED', label: 'orgOnboarding.checklistSSO', completed: false },
    ],
    completedCount: 1,
    totalCount: 5,
    isDismissed: false,
    dismiss: mockDismiss,
    completeStep: mockCompleteStep,
  })),
}));

import { useOnboardingChecklist } from '@/hooks/useOnboardingChecklist';
import { OnboardingChecklist } from './OnboardingChecklist';

describe('OnboardingChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all checklist steps', () => {
    render(<OnboardingChecklist />);
    expect(screen.getByText('orgOnboarding.checklistBranding')).toBeInTheDocument();
    expect(screen.getByText('orgOnboarding.checklistInvite')).toBeInTheDocument();
    expect(screen.getByText('orgOnboarding.checklistCourse')).toBeInTheDocument();
    expect(screen.getByText('orgOnboarding.checklistDomain')).toBeInTheDocument();
    expect(screen.getByText('orgOnboarding.checklistSSO')).toBeInTheDocument();
  });

  it('shows completed steps with checkmark', () => {
    render(<OnboardingChecklist />);
    const brandingStep = screen.getByText('orgOnboarding.checklistBranding').closest('[data-step]');
    expect(brandingStep).toHaveAttribute('data-completed', 'true');
  });

  it('shows progress percentage (1/5 = 20%)', () => {
    render(<OnboardingChecklist />);
    expect(screen.getByText(/20%/)).toBeInTheDocument();
  });

  it('calls dismiss when close button clicked', () => {
    render(<OnboardingChecklist />);
    const closeBtn = screen.getByRole('button', { name: /dismiss|close/i });
    fireEvent.click(closeBtn);
    expect(mockDismiss).toHaveBeenCalledOnce();
  });

  it('renders nothing when dismissed', () => {

    vi.mocked(useOnboardingChecklist).mockReturnValue({
      steps: [],
      completedCount: 0,
      totalCount: 5,
      isDismissed: true,
      dismiss: mockDismiss,
      completeStep: mockCompleteStep,
    });

    const { container } = render(<OnboardingChecklist />);
    expect(container.firstChild).toBeNull();
  });

  it('has accessible role for the checklist', () => {
    render(<OnboardingChecklist />);
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('renders progress bar with correct aria-valuenow', () => {
    render(<OnboardingChecklist />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '20');
  });
});
