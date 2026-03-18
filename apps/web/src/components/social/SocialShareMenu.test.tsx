import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SocialShareMenu } from './SocialShareMenu';

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => {
    if (name === '__esModule') return true;
    return function MockIcon(props: Record<string, unknown>) {
      return <span data-testid={`icon-${String(name)}`} {...props} />;
    };
  },
}));

describe('SocialShareMenu', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('renders trigger button with default label', () => {
    render(<SocialShareMenu url="https://example.com" title="Test" />);
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
  });

  it('renders trigger with custom label', () => {
    render(<SocialShareMenu url="https://example.com" title="Test" triggerLabel="Share Badge" />);
    expect(screen.getByRole('button', { name: /share badge/i })).toBeInTheDocument();
  });

  it('shows menu items when clicked', async () => {
    render(<SocialShareMenu url="https://example.com" title="Test" />);
    fireEvent.click(screen.getByRole('button', { name: /share/i }));
    await waitFor(() => {
      expect(screen.getByText('LinkedIn')).toBeInTheDocument();
      expect(screen.getByText('Facebook')).toBeInTheDocument();
      expect(screen.getByText('X (Twitter)')).toBeInTheDocument();
      expect(screen.getByText('WhatsApp')).toBeInTheDocument();
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });
  });

  it('opens share URL when platform item clicked', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<SocialShareMenu url="https://example.com" title="Test" />);
    fireEvent.click(screen.getByRole('button', { name: /share/i }));
    await waitFor(() => screen.getByText('LinkedIn'));
    fireEvent.click(screen.getByText('LinkedIn'));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('linkedin.com'),
      '_blank',
      expect.any(String),
    );
  });

  it('copies link and shows Copied text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<SocialShareMenu url="https://example.com" title="Test" />);
    fireEvent.click(screen.getByRole('button', { name: /share/i }));
    await waitFor(() => screen.getByText('Copy Link'));
    fireEvent.click(screen.getByText('Copy Link'));
    expect(writeText).toHaveBeenCalledWith('https://example.com');
    await waitFor(() => expect(screen.getByText('Copied!')).toBeInTheDocument());
  });
});
