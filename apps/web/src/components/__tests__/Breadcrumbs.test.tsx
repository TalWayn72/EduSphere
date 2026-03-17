import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { Breadcrumbs } from '../Breadcrumbs';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Breadcrumbs', () => {
  it('renders nav with aria-label="Breadcrumb"', () => {
    renderWithRouter(<Breadcrumbs items={[{ label: 'Home' }]} />);
    expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
  });

  it('renders Home link as first item', () => {
    renderWithRouter(<Breadcrumbs items={[{ label: 'Page' }]} />);
    const homeLink = screen.getByLabelText('Home');
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('renders items with correct labels', () => {
    renderWithRouter(
      <Breadcrumbs
        items={[
          { label: 'Courses', href: '/courses' },
          { label: 'Math 101' },
        ]}
      />,
    );
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('Math 101')).toBeInTheDocument();
  });

  it('middle items with href are rendered as links', () => {
    renderWithRouter(
      <Breadcrumbs
        items={[
          { label: 'Courses', href: '/courses' },
          { label: 'Math', href: '/courses/math' },
          { label: 'Lesson 1' },
        ]}
      />,
    );
    const coursesLink = screen.getByText('Courses');
    expect(coursesLink.closest('a')).toHaveAttribute('href', '/courses');
    const mathLink = screen.getByText('Math');
    expect(mathLink.closest('a')).toHaveAttribute('href', '/courses/math');
  });

  it('last item has aria-current="page"', () => {
    renderWithRouter(
      <Breadcrumbs
        items={[
          { label: 'Courses', href: '/courses' },
          { label: 'Current' },
        ]}
      />,
    );
    const lastItem = screen.getByText('Current');
    expect(lastItem).toHaveAttribute('aria-current', 'page');
  });

  it('last item is not a link even if href is provided', () => {
    renderWithRouter(
      <Breadcrumbs
        items={[
          { label: 'Courses', href: '/courses' },
          { label: 'Current', href: '/current' },
        ]}
      />,
    );
    const lastItem = screen.getByText('Current');
    expect(lastItem.closest('a')).toBeNull();
    expect(lastItem.tagName).toBe('SPAN');
  });

  it('applies custom className', () => {
    renderWithRouter(
      <Breadcrumbs items={[{ label: 'Test' }]} className="mt-4" />,
    );
    const nav = screen.getByLabelText('Breadcrumb');
    expect(nav.className).toContain('mt-4');
  });
});
