import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { BlogPostPage } from './BlogPostPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/components/seo', () => ({
  PageMeta: vi.fn(() => null),
  ArticleSchema: vi.fn(() => null),
  BreadcrumbSchema: vi.fn(() => null),
  PersonSchema: vi.fn(() => null),
}));

vi.mock('react-helmet-async', () => ({
  Helmet: vi.fn(({ children }: { children: React.ReactNode }) => <>{children}</>),
  HelmetProvider: vi.fn(({ children }: { children: React.ReactNode }) => <>{children}</>),
}));

function renderAtSlug(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/blog/${slug}`]}>
      <Routes>
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/blog" element={<div>Blog List</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BlogPostPage', () => {
  it('renders the post title for a known slug', () => {
    renderAtSlug('knowledge-graphs-in-education');
    expect(
      screen.getByRole('heading', { level: 1, name: /Knowledge Graphs Are the Future/i })
    ).toBeInTheDocument();
  });

  it('renders the author name', () => {
    renderAtSlug('knowledge-graphs-in-education');
    expect(screen.getByText('Dr. Miriam Levi')).toBeInTheDocument();
  });

  it('renders the back link to /blog', () => {
    renderAtSlug('knowledge-graphs-in-education');
    const backLink = screen.getByRole('link', { name: /← Blog/i });
    expect(backLink.getAttribute('href')).toBe('/blog');
  });

  it('redirects to /blog for an unknown slug', () => {
    mockNavigate.mockClear();
    renderAtSlug('non-existent-slug');
    expect(mockNavigate).toHaveBeenCalledWith('/blog', { replace: true });
  });

  it('renders body content for the chavruta post', () => {
    renderAtSlug('ai-tutoring-chavruta-method');
    expect(screen.getByRole('heading', { level: 1, name: /Chavruta Method/i })).toBeInTheDocument();
    expect(screen.getByText('Dr. Sarah Cohen')).toBeInTheDocument();
  });
});
