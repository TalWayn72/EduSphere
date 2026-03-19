/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d: string) => d }),
}));

import { OnboardingReentryCard } from './OnboardingReentryCard';

// ── localStorage mock ────────────────────────────────────────────────────────

const storage: Record<string, string> = {};

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(storage)) delete storage[key];
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => storage[k] ?? null);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation((k, v) => { storage[k] = v; });
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe('OnboardingReentryCard', () => {
  it('renders when onboardingSkipped is true', () => {
    render(<MemoryRouter><OnboardingReentryCard onboardingSkipped={true} /></MemoryRouter>);
    expect(screen.getByTestId('onboarding-reentry-card')).toBeInTheDocument();
    expect(screen.getByText('Complete Your Profile')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /complete onboarding/i })).toHaveAttribute(
      'href',
      '/onboarding'
    );
  });

  it('renders nothing when onboarding was not skipped', () => {
    const { container } = render(<MemoryRouter><OnboardingReentryCard onboardingSkipped={false} /></MemoryRouter>);
    expect(container.firstChild).toBeNull();
  });

  it('dismiss button hides the card', () => {
    render(<MemoryRouter><OnboardingReentryCard onboardingSkipped={true} /></MemoryRouter>);
    expect(screen.getByTestId('onboarding-reentry-card')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('onboarding-reentry-dismiss'));
    expect(screen.queryByTestId('onboarding-reentry-card')).not.toBeInTheDocument();
  });

  it('dismiss persists to localStorage', () => {
    render(<MemoryRouter><OnboardingReentryCard onboardingSkipped={true} /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('onboarding-reentry-dismiss'));
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'edusphere_onboarding_reentry_dismissed',
      'true'
    );
  });

  it('stays hidden when previously dismissed (localStorage)', () => {
    storage['edusphere_onboarding_reentry_dismissed'] = 'true';
    const { container } = render(<MemoryRouter><OnboardingReentryCard onboardingSkipped={true} /></MemoryRouter>);
    expect(container.firstChild).toBeNull();
  });
});
