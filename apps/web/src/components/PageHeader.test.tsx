import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('lucide-react', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return {
    ...orig,
    ArrowLeft: () => <span data-testid="arrow-left" />,
    ChevronRight: () => <span data-testid="chevron" />,
    Home: () => <span data-testid="home-icon" />,
  };
});

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import { PageHeader } from './PageHeader';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('PageHeader', () => {
  it('renders title', () => {
    renderWithRouter(<PageHeader title="Dashboard" />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders h1 heading', () => {
    renderWithRouter(<PageHeader title="Courses" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Courses');
  });

  it('renders description when provided', () => {
    renderWithRouter(<PageHeader title="T" description="Some description" />);
    expect(screen.getByText('Some description')).toBeInTheDocument();
  });

  it('renders breadcrumbs navigation', () => {
    renderWithRouter(
      <PageHeader title="T" breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Current' }]} />,
    );
    expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
  });

  it('renders back link when backTo provided', () => {
    renderWithRouter(<PageHeader title="T" backTo="/courses" />);
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('renders actions slot', () => {
    renderWithRouter(
      <PageHeader title="T" actions={<button data-testid="action-btn">Action</button>} />,
    );
    expect(screen.getByTestId('action-btn')).toBeInTheDocument();
  });

  it('uses default data-testid', () => {
    renderWithRouter(<PageHeader title="T" />);
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });

  it('uses custom data-testid', () => {
    renderWithRouter(<PageHeader title="T" data-testid="custom-header" />);
    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithRouter(<PageHeader title="T" className="my-class" />);
    expect(screen.getByTestId('page-header').className).toContain('my-class');
  });
});
