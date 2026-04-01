import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SocialShareButton } from './SocialShareButton';

vi.mock(
  'lucide-react',
  () =>
    new Proxy(
      {},
      {
        get: (_, name) => {
          if (name === '__esModule') return true;
          return function MockIcon(props: Record<string, unknown>) {
            return <span data-testid={`icon-${String(name)}`} {...props} />;
          };
        },
      }
    )
);

describe('SocialShareButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with aria-label for linkedin', () => {
    render(
      <SocialShareButton
        platform="linkedin"
        url="https://example.com"
        title="Test"
      />
    );
    expect(
      screen.getByRole('button', { name: /linkedin/i })
    ).toBeInTheDocument();
  });

  it('renders full variant with platform label', () => {
    render(
      <SocialShareButton
        platform="facebook"
        url="https://example.com"
        title="Test"
        variant="full"
      />
    );
    expect(screen.getByText('Facebook')).toBeInTheDocument();
  });

  it('opens linkedin share URL in new window', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(
      <SocialShareButton
        platform="linkedin"
        url="https://example.com"
        title="Test"
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('linkedin.com/sharing'),
      '_blank',
      expect.any(String)
    );
  });

  it('opens twitter share URL with encoded title', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(
      <SocialShareButton
        platform="twitter"
        url="https://example.com"
        title="Hello World"
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('Hello%20World'),
      '_blank',
      expect.any(String)
    );
  });

  it('opens whatsapp share URL', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(
      <SocialShareButton
        platform="whatsapp"
        url="https://example.com"
        title="Test"
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('api.whatsapp.com'),
      '_blank',
      expect.any(String)
    );
  });

  it('copies URL to clipboard and shows Copied label', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <SocialShareButton
        platform="copy"
        url="https://example.com"
        title="Test"
        variant="full"
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(writeText).toHaveBeenCalledWith('https://example.com');
    await waitFor(() =>
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    );
  });
});
