import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { RequirementLink } from './RequirementLink';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'consentRequired.message': 'AI features require your consent.',
        'consentRequired.linkText': 'Enable in Privacy Settings',
      };
      return map[key] ?? key;
    },
  }),
}));

function renderLink(
  props: Partial<Parameters<typeof RequirementLink>[0]> = {}
) {
  return render(
    <MemoryRouter>
      <RequirementLink {...props} />
    </MemoryRouter>
  );
}

describe('RequirementLink', () => {
  it('renders alert variant with warning text and link', () => {
    renderLink({ variant: 'alert' });
    expect(screen.getByTestId('requirement-link')).toBeInTheDocument();
    expect(
      screen.getByText(/AI features require your consent/)
    ).toBeInTheDocument();
    expect(screen.getByText('Enable in Privacy Settings')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders inline variant without alert role', () => {
    renderLink({ variant: 'inline' });
    expect(screen.getByTestId('requirement-link')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('generates correct link href with highlight param', () => {
    renderLink({ highlight: 'ai-consent' });
    const link = screen.getByText('Enable in Privacy Settings');
    expect(link.closest('a')).toHaveAttribute(
      'href',
      '/settings?highlight=ai-consent'
    );
  });

  it('uses custom target path', () => {
    renderLink({ to: '/profile', highlight: 'email-verify' });
    const link = screen.getByText('Enable in Privacy Settings');
    expect(link.closest('a')).toHaveAttribute(
      'href',
      '/profile?highlight=email-verify'
    );
  });

  it('defaults to alert variant', () => {
    renderLink();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
