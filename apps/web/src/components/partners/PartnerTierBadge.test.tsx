import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PartnerTierBadge } from './PartnerTierBadge';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => vi.fn()), useParams: vi.fn(() => ({})) };
});

describe('PartnerTierBadge', () => {
  it('renders BRONZE badge with amber class', () => {
    render(<PartnerTierBadge tier="BRONZE" />);
    const badge = screen.getByTestId('partner-tier-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/amber/);
  });

  it('renders PLATINUM badge with violet class', () => {
    render(<PartnerTierBadge tier="PLATINUM" />);
    const badge = screen.getByTestId('partner-tier-badge');
    expect(badge.className).toMatch(/violet/);
  });

  it('renders GOLD badge with yellow class', () => {
    render(<PartnerTierBadge tier="GOLD" />);
    const badge = screen.getByTestId('partner-tier-badge');
    expect(badge.className).toMatch(/yellow/);
  });

  it('renders SILVER badge with slate class', () => {
    render(<PartnerTierBadge tier="SILVER" />);
    const badge = screen.getByTestId('partner-tier-badge');
    expect(badge.className).toMatch(/slate/);
  });

  it('shows tier name text', () => {
    render(<PartnerTierBadge tier="GOLD" />);
    expect(screen.getByTestId('partner-tier-badge').textContent).toMatch(/Gold/);
  });

  it('has data-testid=partner-tier-badge and tier-specific testid', () => {
    render(<PartnerTierBadge tier="PLATINUM" />);
    expect(screen.getByTestId('partner-tier-badge')).toBeInTheDocument();
    expect(screen.getByTestId('tier-platinum')).toBeInTheDocument();
  });

  it('renders in sm size with smaller padding class', () => {
    render(<PartnerTierBadge tier="BRONZE" size="sm" />);
    const badge = screen.getByTestId('partner-tier-badge');
    expect(badge.className).toMatch(/text-xs/);
  });

  it('renders in lg size with larger padding class', () => {
    render(<PartnerTierBadge tier="GOLD" size="lg" />);
    const badge = screen.getByTestId('partner-tier-badge');
    expect(badge.className).toMatch(/text-base/);
  });
});
