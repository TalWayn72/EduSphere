/**
 * LiveSessionCard component tests
 *
 * Covers:
 *  1. LIVE phase: shows LIVE badge
 *  2. LIVE phase: shows viewer count
 *  3. SCHEDULED phase: shows countdown badge
 *  4. ENDED phase: shows "Ended" badge
 *  5. CANCELLED phase: shows "Ended" badge
 *  6. PAUSED phase: shows "Paused" badge
 *  7. Renders title
 *  8. Renders instructor name when provided
 *  9. Links to /live/:sessionId
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LiveSessionCard } from './LiveSessionCard';
import type { LiveStreamSession } from '@/types/live-session.types';

// ── Mock child components ──────────────────────────────────────────────────────

vi.mock('./ViewerCount', () => ({
  ViewerCount: ({ count }: { count: number }) => (
    <span data-testid="viewer-count">{count}</span>
  ),
}));

// ── Mock shadcn/ui components ─────────────────────────────────────────────────

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
    <div {...props}>{children}</div>
  ),
  CardContent: ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: React.PropsWithChildren<React.HTMLAttributes<HTMLSpanElement>>) => (
    <span {...props}>{children}</span>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<LiveStreamSession> = {}): LiveStreamSession {
  return {
    id: 'sess-1',
    title: 'React Fundamentals Live',
    courseId: 'course-1',
    instructorId: 'instr-1',
    phase: 'LIVE',
    streamType: 'BROADCAST',
    streamUrl: 'https://stream.test',
    thumbnailUrl: null,
    viewerCount: 55,
    maxViewers: null,
    scheduledAt: null,
    startedAt: '2026-01-01T10:00:00Z',
    endedAt: null,
    isScreenSharing: false,
    highlightMoments: [],
    recordingUrl: null,
    createdAt: '2026-01-01T09:00:00Z',
    ...overrides,
  };
}

function renderCard(session: LiveStreamSession, instructorName?: string) {
  return render(
    <MemoryRouter>
      <LiveSessionCard session={session} instructorName={instructorName} />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LiveSessionCard', () => {
  it('renders session title', () => {
    renderCard(makeSession());
    expect(screen.getByText('React Fundamentals Live')).toBeInTheDocument();
  });

  it('renders instructor name when provided', () => {
    renderCard(makeSession(), 'Dr. Cohen');
    expect(screen.getByText('Dr. Cohen')).toBeInTheDocument();
  });

  it('LIVE phase shows LIVE badge text', () => {
    renderCard(makeSession({ phase: 'LIVE' }));
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('LIVE phase shows viewer count', () => {
    renderCard(makeSession({ phase: 'LIVE', viewerCount: 99 }));
    expect(screen.getByTestId('viewer-count')).toHaveTextContent('99');
  });

  it('ENDED phase shows Ended badge', () => {
    renderCard(makeSession({ phase: 'ENDED' }));
    expect(screen.getByText('Ended')).toBeInTheDocument();
  });

  it('CANCELLED phase shows Ended badge', () => {
    renderCard(makeSession({ phase: 'CANCELLED' }));
    expect(screen.getByText('Ended')).toBeInTheDocument();
  });

  it('PAUSED phase shows Paused badge', () => {
    renderCard(makeSession({ phase: 'PAUSED' }));
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('SCHEDULED phase shows countdown badge when scheduledAt is set', () => {
    // Set scheduledAt far in future so countdown is non-empty
    const future = new Date(Date.now() + 3_600_000).toISOString();
    renderCard(makeSession({ phase: 'SCHEDULED', scheduledAt: future }));
    // The badge containing countdown text should appear (it matches /h|m|s/)
    const badges = screen.getAllByText(/\d+[hms]/);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('LIVE phase does not show Ended badge', () => {
    renderCard(makeSession({ phase: 'LIVE' }));
    expect(screen.queryByText('Ended')).not.toBeInTheDocument();
  });

  it('links to /live/:sessionId', () => {
    const { container } = renderCard(makeSession({ id: 'sess-xyz' }));
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/live/sess-xyz');
  });

  it('has data-testid="live-session-card"', () => {
    renderCard(makeSession());
    expect(screen.getByTestId('live-session-card')).toBeInTheDocument();
  });
});
