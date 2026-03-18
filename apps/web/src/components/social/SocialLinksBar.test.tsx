import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SocialLinksBar, DEFAULT_SOCIAL_LINKS } from './SocialLinksBar';

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => {
    if (name === '__esModule') return true;
    return function MockIcon(props: Record<string, unknown>) {
      return <span data-testid={`icon-${String(name)}`} {...props} />;
    };
  },
}));

describe('SocialLinksBar', () => {
  it('renders links for provided platforms', () => {
    render(<SocialLinksBar links={{ linkedin: 'https://linkedin.com', twitter: 'https://twitter.com' }} />);
    expect(screen.getByLabelText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
  });

  it('does not render platforms without URLs', () => {
    render(<SocialLinksBar links={{ linkedin: 'https://linkedin.com' }} />);
    expect(screen.queryByLabelText('Facebook')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('YouTube')).not.toBeInTheDocument();
  });

  it('returns null when no links provided', () => {
    const { container } = render(<SocialLinksBar links={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders default social links', () => {
    render(<SocialLinksBar links={DEFAULT_SOCIAL_LINKS} />);
    expect(screen.getByLabelText('LinkedIn')).toHaveAttribute('href', 'https://linkedin.com/company/edusphere');
    expect(screen.getByLabelText('Twitter')).toHaveAttribute('href', 'https://twitter.com/edusphere');
    expect(screen.getByLabelText('GitHub')).toHaveAttribute('href', 'https://github.com/edusphere');
  });

  it('opens links in new tab with security attributes', () => {
    render(<SocialLinksBar links={{ linkedin: 'https://linkedin.com' }} />);
    const link = screen.getByLabelText('LinkedIn');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('applies custom className', () => {
    const { container } = render(<SocialLinksBar links={DEFAULT_SOCIAL_LINKS} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('uses role=list for accessibility', () => {
    render(<SocialLinksBar links={DEFAULT_SOCIAL_LINKS} />);
    expect(screen.getByRole('list', { name: /social links/i })).toBeInTheDocument();
  });

  it('renders all 7 platforms when all provided', () => {
    const allLinks = {
      linkedin: 'https://l', facebook: 'https://f', twitter: 'https://t',
      youtube: 'https://y', instagram: 'https://i', whatsapp: 'https://w', github: 'https://g',
    };
    render(<SocialLinksBar links={allLinks} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
  });
});
