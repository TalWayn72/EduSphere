import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { PageHeader } from '../PageHeader';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('PageHeader', () => {
  it('renders h1 with title text', () => {
    renderWithRouter(<PageHeader title="Dashboard" />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Dashboard');
  });

  it('defaults to data-testid "page-header"', () => {
    renderWithRouter(<PageHeader title="Test" />);
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });

  it('accepts custom data-testid', () => {
    renderWithRouter(<PageHeader title="Test" data-testid="custom-header" />);
    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    renderWithRouter(<PageHeader title="Test" description="A brief summary" />);
    expect(screen.getByText('A brief summary')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = renderWithRouter(<PageHeader title="Test" />);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(0);
  });

  it('renders breadcrumbs with proper aria-label', () => {
    renderWithRouter(
      <PageHeader
        title="Lesson"
        breadcrumbs={[
          { label: 'Courses', href: '/courses' },
          { label: 'Math 101' },
        ]}
      />,
    );
    expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
  });

  it('last breadcrumb has aria-current="page"', () => {
    renderWithRouter(
      <PageHeader
        title="Lesson"
        breadcrumbs={[
          { label: 'Courses', href: '/courses' },
          { label: 'Current Page' },
        ]}
      />,
    );
    const lastCrumb = screen.getByText('Current Page');
    expect(lastCrumb).toHaveAttribute('aria-current', 'page');
  });

  it('non-last breadcrumbs with href are links', () => {
    renderWithRouter(
      <PageHeader
        title="Lesson"
        breadcrumbs={[
          { label: 'Courses', href: '/courses' },
          { label: 'Math', href: '/courses/math' },
          { label: 'Lesson 1' },
        ]}
      />,
    );
    const coursesLink = screen.getByText('Courses');
    expect(coursesLink.closest('a')).toHaveAttribute('href', '/courses');
  });

  it('renders back button with correct href', () => {
    renderWithRouter(<PageHeader title="Details" backTo="/list" />);
    const backLink = screen.getByText('Back');
    expect(backLink.closest('a')).toHaveAttribute('href', '/list');
  });

  it('renders actions slot', () => {
    renderWithRouter(
      <PageHeader title="Page" actions={<button>Create</button>} />,
    );
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('does not render breadcrumbs nav when breadcrumbs not provided', () => {
    renderWithRouter(<PageHeader title="Test" />);
    expect(screen.queryByLabelText('Breadcrumb')).not.toBeInTheDocument();
  });
});
