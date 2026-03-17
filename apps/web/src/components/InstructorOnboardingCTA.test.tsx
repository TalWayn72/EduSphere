/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { InstructorOnboardingCTA } from './InstructorOnboardingCTA';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d: string) => d }),
}));

function renderCTA(props: { courseCount: number; userRole: string }) {
  return render(
    <BrowserRouter>
      <InstructorOnboardingCTA {...props} />
    </BrowserRouter>,
  );
}

describe('InstructorOnboardingCTA', () => {
  it('renders for instructor with 0 courses', () => {
    renderCTA({ courseCount: 0, userRole: 'INSTRUCTOR' });
    expect(screen.getByTestId('instructor-onboarding-cta')).toBeInTheDocument();
    expect(screen.getByText('Create Your First Course with AI')).toBeInTheDocument();
  });

  it('is hidden when user has courses', () => {
    renderCTA({ courseCount: 3, userRole: 'INSTRUCTOR' });
    expect(screen.queryByTestId('instructor-onboarding-cta')).not.toBeInTheDocument();
  });

  it('is hidden for non-instructor roles', () => {
    renderCTA({ courseCount: 0, userRole: 'STUDENT' });
    expect(screen.queryByTestId('instructor-onboarding-cta')).not.toBeInTheDocument();
  });

  it('links to course creation page', () => {
    renderCTA({ courseCount: 0, userRole: 'INSTRUCTOR' });
    const link = screen.getByTestId('instructor-cta-button');
    expect(link).toHaveAttribute('href', '/courses/create');
  });
});
