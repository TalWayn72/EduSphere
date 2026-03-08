import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), ''),
  useQuery: vi.fn(() => [{
    data: {
      myOnboardingState: {
        userId: 'u1',
        currentStep: 1,
        totalSteps: 5,
        completed: false,
        skipped: false,
        role: 'student',
        data: {},
      },
    },
    fetching: false,
  }]),
  useMutation: vi.fn(() => [{}, vi.fn().mockResolvedValue({})]),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/components/onboarding/StudentOnboardingSteps', () => ({
  StudentOnboardingSteps: () => <div>Student Onboarding Steps</div>,
}));

vi.mock('@/components/onboarding/InstructorOnboardingSteps', () => ({
  InstructorOnboardingSteps: () => <div>Instructor Onboarding Steps</div>,
}));

import { OnboardingPage } from './OnboardingPage';

describe('OnboardingPage', () => {
  it('renders welcome heading for onboarding', () => {
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);
    expect(screen.getByText('Welcome to EduSphere')).toBeDefined();
  });

  it('renders student onboarding steps component', () => {
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);
    expect(screen.getByText('Student Onboarding Steps')).toBeDefined();
  });

  it('does not show MOCK data', () => {
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);
    expect(document.body.textContent).not.toContain('MOCK');
  });

  it('does not expose raw error messages to user', () => {
    render(<MemoryRouter><OnboardingPage /></MemoryRouter>);
    expect(document.body.textContent).not.toContain('[Network]');
    expect(document.body.textContent).not.toContain('undefined');
  });
});
