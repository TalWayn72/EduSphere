import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { BlogListPage } from './BlogListPage';

vi.mock('@/components/seo', () => ({
  PageMeta: vi.fn(() => null),
  BreadcrumbSchema: vi.fn(() => null),
}));

vi.mock('react-helmet-async', () => ({
  Helmet: vi.fn(({ children }: { children: React.ReactNode }) => <>{children}</>),
  HelmetProvider: vi.fn(({ children }: { children: React.ReactNode }) => <>{children}</>),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <BlogListPage />
    </MemoryRouter>
  );
}

describe('BlogListPage', () => {
  it('renders 4 post cards', () => {
    renderPage();
    const readMoreLinks = screen.getAllByRole('link', { name: /Read:/i });
    expect(readMoreLinks).toHaveLength(4);
  });

  it('each card has a link matching /blog/', () => {
    renderPage();
    const readMoreLinks = screen.getAllByRole('link', { name: /Read:/i });
    readMoreLinks.forEach((link) => {
      expect(link.getAttribute('href')).toMatch(/^\/blog\//);
    });
  });

  it('renders page heading containing "EduSphere Blog"', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /EduSphere Blog/i })).toBeInTheDocument();
  });

  it('renders all 4 post titles', () => {
    renderPage();
    expect(screen.getByText(/Knowledge Graphs Are the Future/i)).toBeInTheDocument();
    expect(screen.getByText(/Chavruta Method/i)).toBeInTheDocument();
    expect(screen.getByText(/Is SCORM Dead/i)).toBeInTheDocument();
    expect(screen.getByText(/Automating Compliance Training/i)).toBeInTheDocument();
  });

  it('renders category badges', () => {
    renderPage();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Pedagogy')).toBeInTheDocument();
    expect(screen.getByText('Standards')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });
});
