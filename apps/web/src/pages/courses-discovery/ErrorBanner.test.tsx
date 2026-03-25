import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import { ErrorBanner } from './ErrorBanner';

describe('ErrorBanner', () => {
  it('renders error text', () => {
    render(<ErrorBanner />);
    expect(screen.getByText('unableToLoadCourses')).toBeInTheDocument();
  });

  it('has alert role', () => {
    render(<ErrorBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has correct test id', () => {
    render(<ErrorBanner />);
    expect(screen.getByTestId('courses-error-banner')).toBeInTheDocument();
  });
});
