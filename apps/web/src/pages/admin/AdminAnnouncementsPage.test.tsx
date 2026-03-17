import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { AdminAnnouncementsPage } from './AdminAnnouncementsPage';

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminAnnouncementsPage />
    </MemoryRouter>
  );
}

describe('AdminAnnouncementsPage', () => {
  it('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('admin-announcements-page')).toBeInTheDocument();
  });

  it('displays correct data-testid attributes for form', () => {
    renderPage();
    expect(screen.getByTestId('announcement-form')).toBeInTheDocument();
    expect(screen.getByTestId('announcement-title')).toBeInTheDocument();
    expect(screen.getByTestId('announcement-body')).toBeInTheDocument();
    expect(screen.getByTestId('announcement-submit')).toBeInTheDocument();
  });

  it('shows preview when clicking Show Preview button', () => {
    renderPage();
    const previewBtn = screen.getByTestId('announcement-preview-btn');
    fireEvent.click(previewBtn);
    expect(screen.getByTestId('announcement-preview')).toBeInTheDocument();
  });

  it('displays BETA badge', () => {
    renderPage();
    expect(screen.getByText('BETA')).toBeInTheDocument();
  });

  it('shows target role checkboxes', () => {
    renderPage();
    expect(screen.getByLabelText(/STUDENT/)).toBeInTheDocument();
    expect(screen.getByLabelText(/INSTRUCTOR/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ORG_ADMIN/)).toBeInTheDocument();
  });
});
