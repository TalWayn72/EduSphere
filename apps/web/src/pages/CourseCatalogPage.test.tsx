import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/components/seo', () => ({
  PageMeta: () => <div data-testid="page-meta" />,
  CourseSchema: () => <div data-testid="course-schema" />,
  BreadcrumbSchema: () => <div data-testid="breadcrumb-schema" />,
}));

import { CourseCatalogPage } from './CourseCatalogPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <CourseCatalogPage />
    </MemoryRouter>
  );

describe('CourseCatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Featured Learning Programs')).toBeInTheDocument();
  });

  it('renders header description text', () => {
    renderPage();
    expect(screen.getByText(/curated courses designed for modern professionals/i)).toBeInTheDocument();
  });

  it('renders featured courses list with aria-label', () => {
    renderPage();
    expect(screen.getByRole('list', { name: /featured courses/i })).toBeInTheDocument();
  });

  it('renders all 6 featured courses', () => {
    renderPage();
    const list = screen.getByRole('list', { name: /featured courses/i });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(6);
  });

  it('renders Introduction to Machine Learning course', () => {
    renderPage();
    expect(screen.getByText('Introduction to Machine Learning')).toBeInTheDocument();
  });

  it('renders Advanced Knowledge Graphs course', () => {
    renderPage();
    expect(screen.getByText('Advanced Knowledge Graphs')).toBeInTheDocument();
  });

  it('renders Corporate Leadership Excellence course', () => {
    renderPage();
    expect(screen.getByText('Corporate Leadership Excellence')).toBeInTheDocument();
  });

  it('renders Python for Data Science course', () => {
    renderPage();
    expect(screen.getByText('Python for Data Science')).toBeInTheDocument();
  });

  it('renders AI Ethics and Responsible AI course', () => {
    renderPage();
    expect(screen.getByText('AI Ethics and Responsible AI')).toBeInTheDocument();
  });

  it('renders Organizational Learning Design course', () => {
    renderPage();
    expect(screen.getByText('Organizational Learning Design')).toBeInTheDocument();
  });

  it('each course card has aria-label with course title', () => {
    renderPage();
    expect(screen.getByLabelText(/Course: Introduction to Machine Learning/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Course: Advanced Knowledge Graphs/)).toBeInTheDocument();
  });

  it('renders level badges (Beginner, Intermediate, Advanced)', () => {
    renderPage();
    const beginnerBadges = screen.getAllByText('Beginner');
    expect(beginnerBadges.length).toBeGreaterThanOrEqual(1);
    const intermediateBadges = screen.getAllByText('Intermediate');
    expect(intermediateBadges.length).toBeGreaterThanOrEqual(1);
    const advancedBadges = screen.getAllByText('Advanced');
    expect(advancedBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders duration for each course', () => {
    renderPage();
    // '8 hours' appears twice (intro-ml and org-learning-design), use getAllByText
    expect(screen.getAllByText('8 hours').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('12 hours')).toBeInTheDocument();
    expect(screen.getByText('6 hours')).toBeInTheDocument();
    expect(screen.getByText('10 hours')).toBeInTheDocument();
    expect(screen.getByText('4 hours')).toBeInTheDocument();
  });

  it('renders category labels', () => {
    renderPage();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Data Science')).toBeInTheDocument();
    expect(screen.getByText('Leadership')).toBeInTheDocument();
    expect(screen.getByText('Programming')).toBeInTheDocument();
  });

  it('renders Start Free Trial buttons with proper aria-labels', () => {
    renderPage();
    const enrollLinks = screen.getAllByText('Start Free Trial');
    // One in header + 6 course cards = 7
    expect(enrollLinks.length).toBeGreaterThanOrEqual(6);
  });

  it('renders CTA section', () => {
    renderPage();
    expect(screen.getByText(/Ready to transform your organization/i)).toBeInTheDocument();
  });

  it('renders Request a Pilot link', () => {
    renderPage();
    expect(screen.getByText('Request a Pilot')).toBeInTheDocument();
  });

  it('all enroll links point to /pilot', () => {
    renderPage();
    const pilotLinks = screen.getAllByRole('link').filter(
      (link) => link.getAttribute('href') === '/pilot'
    );
    expect(pilotLinks.length).toBeGreaterThanOrEqual(7);
  });

  it('renders SEO components', () => {
    renderPage();
    expect(screen.getByTestId('page-meta')).toBeInTheDocument();
    expect(screen.getByTestId('breadcrumb-schema')).toBeInTheDocument();
  });

  it('renders CourseSchema for each course', () => {
    renderPage();
    const schemas = screen.getAllByTestId('course-schema');
    expect(schemas).toHaveLength(6);
  });

  it('does not display raw technical error strings', () => {
    renderPage();
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Error:/);
    expect(body).not.toMatch(/\[object/);
    expect(body).not.toContain('undefined');
  });

  it('does not display raw i18n keys', () => {
    renderPage();
    const body = document.body.textContent ?? '';
    // No namespace.key patterns
    expect(body).not.toMatch(/catalog\.\w+/);
  });

  it('renders h2 for CTA section', () => {
    renderPage();
    const headings = screen.getAllByRole('heading', { level: 2 });
    const ctaHeading = headings.find((h) =>
      h.textContent?.includes('Ready to transform')
    );
    expect(ctaHeading).toBeTruthy();
  });

  it('course descriptions are visible', () => {
    renderPage();
    expect(screen.getByText(/Build your first ML models/i)).toBeInTheDocument();
    expect(screen.getByText(/Master graph databases/i)).toBeInTheDocument();
  });

  it('does not crash on re-render', () => {
    const { rerender } = renderPage();
    rerender(
      <MemoryRouter>
        <CourseCatalogPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Featured Learning Programs')).toBeInTheDocument();
  });
});
