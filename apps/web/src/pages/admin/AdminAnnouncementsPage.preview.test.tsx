import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { AnnouncementPreview } from './AdminAnnouncementsPage.preview';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AnnouncementPreview', () => {
  const baseData = {
    title: 'System Maintenance',
    body: 'We will be performing scheduled maintenance this weekend.',
    scheduleDate: '2026-04-01T10:00:00Z',
    targetRoles: ['STUDENT', 'INSTRUCTOR'],
  };

  it('renders preview card', () => {
    render(<AnnouncementPreview data={baseData} />);
    expect(screen.getByTestId('announcement-preview')).toBeInTheDocument();
  });

  it('shows announcement title', () => {
    render(<AnnouncementPreview data={baseData} />);
    expect(screen.getByTestId('preview-title')).toHaveTextContent('System Maintenance');
  });

  it('shows announcement body', () => {
    render(<AnnouncementPreview data={baseData} />);
    expect(screen.getByTestId('preview-body')).toHaveTextContent('scheduled maintenance');
  });

  it('shows schedule date', () => {
    render(<AnnouncementPreview data={baseData} />);
    expect(screen.getByText(/announcements.scheduled/)).toBeInTheDocument();
  });

  it('shows target role badges', () => {
    render(<AnnouncementPreview data={baseData} />);
    expect(screen.getByText('STUDENT')).toBeInTheDocument();
    expect(screen.getByText('INSTRUCTOR')).toBeInTheDocument();
  });

  it('shows untitled when title is empty', () => {
    render(<AnnouncementPreview data={{ ...baseData, title: '' }} />);
    expect(screen.getByTestId('preview-title')).toHaveTextContent('announcements.untitled');
  });

  it('shows no content when body is empty', () => {
    render(<AnnouncementPreview data={{ ...baseData, body: '' }} />);
    expect(screen.getByTestId('preview-body')).toHaveTextContent('announcements.noContent');
  });

  it('does not show schedule section when date is empty', () => {
    render(<AnnouncementPreview data={{ ...baseData, scheduleDate: '' }} />);
    expect(screen.queryByText(/announcements.scheduled/)).not.toBeInTheDocument();
  });
});
