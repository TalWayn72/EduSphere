import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminLayout } from './AdminLayout';

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('./AdminSidebar', () => ({
  AdminSidebar: () => <nav data-testid="admin-sidebar" />,
}));

describe('AdminLayout', () => {
  it('renders children inside the layout', () => {
    render(
      <AdminLayout>
        <div data-testid="child">Content</div>
      </AdminLayout>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders AdminSidebar', () => {
    render(<AdminLayout>content</AdminLayout>);
    expect(screen.getByTestId('admin-sidebar')).toBeInTheDocument();
  });

  it('renders the title when provided', () => {
    render(<AdminLayout title="User Management">content</AdminLayout>);
    expect(
      screen.getByRole('heading', { name: 'User Management' })
    ).toBeInTheDocument();
  });

  it('does not render a heading when title is omitted', () => {
    render(<AdminLayout>content</AdminLayout>);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('renders the description when provided alongside title', () => {
    render(
      <AdminLayout title="Settings" description="Manage your account settings">
        content
      </AdminLayout>
    );
    expect(
      screen.getByText('Manage your account settings')
    ).toBeInTheDocument();
  });

  it('does not render description when title is omitted', () => {
    render(<AdminLayout description="Some description">content</AdminLayout>);
    expect(screen.queryByText('Some description')).not.toBeInTheDocument();
  });

  it('wraps content in the Layout component', () => {
    render(<AdminLayout>inner</AdminLayout>);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });
});
