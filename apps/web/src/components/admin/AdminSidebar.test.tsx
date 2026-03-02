import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderSidebar(initialPath = '/admin') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AdminSidebar />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdminSidebar', () => {
  it('renders the "Overview" group heading', () => {
    renderSidebar();
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('renders the "Organization" group heading', () => {
    renderSidebar();
    expect(screen.getByText('Organization')).toBeInTheDocument();
  });

  it('renders the "People" group heading', () => {
    renderSidebar();
    expect(screen.getByText('People')).toBeInTheDocument();
  });

  it('renders the "Learning" group heading', () => {
    renderSidebar();
    expect(screen.getByText('Learning')).toBeInTheDocument();
  });

  it('renders the "Integrations" group heading', () => {
    renderSidebar();
    expect(screen.getByText('Integrations')).toBeInTheDocument();
  });

  it('renders the "Security & Compliance" group heading', () => {
    renderSidebar();
    expect(screen.getByText('Security & Compliance')).toBeInTheDocument();
  });

  it('renders the "Settings" group heading', () => {
    renderSidebar();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders the "Dashboard" nav link', () => {
    renderSidebar();
    expect(
      screen.getByRole('link', { name: /dashboard/i })
    ).toBeInTheDocument();
  });

  it('renders the "Branding" nav link', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: /branding/i })).toBeInTheDocument();
  });

  it('renders the "Users" nav link', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: /^users$/i })).toBeInTheDocument();
  });

  it('renders the "Roles & Permissions" nav link', () => {
    renderSidebar();
    expect(
      screen.getByRole('link', { name: /roles & permissions/i })
    ).toBeInTheDocument();
  });

  it('renders the "Security Settings" nav link', () => {
    renderSidebar();
    expect(
      screen.getByRole('link', { name: /security settings/i })
    ).toBeInTheDocument();
  });

  it('renders the "Enrollment" nav link', () => {
    renderSidebar();
    expect(
      screen.getByRole('link', { name: /enrollment/i })
    ).toBeInTheDocument();
  });

  it('renders the "Gamification" nav link', () => {
    renderSidebar();
    expect(
      screen.getByRole('link', { name: /gamification/i })
    ).toBeInTheDocument();
  });

  it('renders the "LTI 1.3" nav link', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: /lti 1\.3/i })).toBeInTheDocument();
  });

  it('Branding link href is /admin/branding', () => {
    renderSidebar();
    const link = screen.getByRole('link', { name: /branding/i });
    expect(link).toHaveAttribute('href', '/admin/branding');
  });

  it('Enrollment link href is /admin/enrollment', () => {
    renderSidebar();
    const link = screen.getByRole('link', { name: /enrollment/i });
    expect(link).toHaveAttribute('href', '/admin/enrollment');
  });
});
