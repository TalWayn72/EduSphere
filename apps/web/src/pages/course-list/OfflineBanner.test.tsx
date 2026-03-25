import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  const onRetry = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  it('renders networkUnavailable text', () => {
    render(<OfflineBanner onRetry={onRetry} />);
    expect(screen.getByText('networkUnavailable')).toBeInTheDocument();
  });

  it('renders retry button', () => {
    render(<OfflineBanner onRetry={onRetry} />);
    expect(screen.getByTestId('offline-banner-retry')).toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', () => {
    render(<OfflineBanner onRetry={onRetry} />);
    fireEvent.click(screen.getByTestId('offline-banner-retry'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('has alert role', () => {
    render(<OfflineBanner onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
