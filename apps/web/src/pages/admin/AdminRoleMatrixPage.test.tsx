import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { AdminRoleMatrixPage } from './AdminRoleMatrixPage';

vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminRoleMatrixPage />
    </MemoryRouter>
  );
}

describe('AdminRoleMatrixPage', () => {
  it('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('admin-role-matrix-page')).toBeInTheDocument();
  });

  it('displays the role-matrix-grid data-testid', () => {
    renderPage();
    expect(screen.getByTestId('role-matrix-grid')).toBeInTheDocument();
  });

  it('renders all role column headers', () => {
    renderPage();
    expect(screen.getByText('STUDENT')).toBeInTheDocument();
    expect(screen.getByText('INSTRUCTOR')).toBeInTheDocument();
    expect(screen.getByText('ORG_ADMIN')).toBeInTheDocument();
    expect(screen.getByText('SUPER_ADMIN')).toBeInTheDocument();
    expect(screen.getByText('RESEARCHER')).toBeInTheDocument();
  });

  it('renders permission rows', () => {
    renderPage();
    expect(screen.getByText('course:read')).toBeInTheDocument();
    expect(screen.getByText('user:manage')).toBeInTheDocument();
    expect(screen.getByText('billing:manage')).toBeInTheDocument();
  });

  it('displays BETA badge', () => {
    renderPage();
    expect(screen.getByText('BETA')).toBeInTheDocument();
  });

  it('shows checkmarks for granted permissions', () => {
    renderPage();
    // SUPER_ADMIN has all permissions — at least 12 checkmarks expected
    const checkmarks = screen.getAllByLabelText('granted');
    expect(checkmarks.length).toBeGreaterThanOrEqual(12);
  });
});
