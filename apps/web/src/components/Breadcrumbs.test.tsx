import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('lucide-react', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>();
  return {
    ...orig,
    ChevronRight: () => <span data-testid="chevron" />,
    Home: () => <span data-testid="home-icon" />,
  };
});

import { Breadcrumbs } from './Breadcrumbs';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Breadcrumbs', () => {
  it('renders nav with Breadcrumb aria-label', () => {
    renderWithRouter(<Breadcrumbs items={[{ label: 'Courses' }]} />);
    expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
  });

  it('renders Home link', () => {
    renderWithRouter(<Breadcrumbs items={[{ label: 'Courses' }]} />);
    expect(screen.getByLabelText('Home')).toBeInTheDocument();
  });

  it('renders breadcrumb items', () => {
    renderWithRouter(
      <Breadcrumbs items={[
        { label: 'Courses', href: '/courses' },
        { label: 'Math 101' },
      ]} />,
    );
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('Math 101')).toBeInTheDocument();
  });

  it('last item has aria-current=page', () => {
    renderWithRouter(
      <Breadcrumbs items={[
        { label: 'Courses', href: '/courses' },
        { label: 'Current Page' },
      ]} />,
    );
    expect(screen.getByText('Current Page')).toHaveAttribute('aria-current', 'page');
  });

  it('intermediate items with href render as links', () => {
    renderWithRouter(
      <Breadcrumbs items={[
        { label: 'Courses', href: '/courses' },
        { label: 'Details' },
      ]} />,
    );
    expect(screen.getByText('Courses').closest('a')).toHaveAttribute('href', '/courses');
  });

  it('applies custom className', () => {
    renderWithRouter(<Breadcrumbs items={[{ label: 'X' }]} className="my-class" />);
    expect(screen.getByLabelText('Breadcrumb')).toHaveClass('my-class');
  });
});
