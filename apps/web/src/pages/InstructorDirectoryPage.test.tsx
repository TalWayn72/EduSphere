import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/components/seo', () => ({
  PageMeta: () => <div data-testid="page-meta" />,
  PersonSchema: () => <div data-testid="person-schema" />,
  BreadcrumbSchema: () => <div data-testid="breadcrumb-schema" />,
}));

import { InstructorDirectoryPage } from './InstructorDirectoryPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <InstructorDirectoryPage />
    </MemoryRouter>
  );

describe('InstructorDirectoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Page structure ---
  it('renders page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Meet Our Instructors')).toBeInTheDocument();
  });

  it('renders header description', () => {
    renderPage();
    expect(screen.getByText(/World-class educators from leading research institutions/i)).toBeInTheDocument();
  });

  it('renders instructors list with aria-label', () => {
    renderPage();
    expect(screen.getByRole('list', { name: /EduSphere instructors/i })).toBeInTheDocument();
  });

  it('renders all 4 instructor cards', () => {
    renderPage();
    // Each instructor has an article with aria-label "Instructor: ..."
    const cards = screen.getAllByLabelText(/^Instructor:/);
    expect(cards).toHaveLength(4);
  });

  // --- Individual instructors ---
  it('renders Dr. Sarah Chen', () => {
    renderPage();
    expect(screen.getByText('Dr. Sarah Chen')).toBeInTheDocument();
    expect(screen.getByText('AI & Machine Learning Researcher')).toBeInTheDocument();
  });

  it('renders Prof. David Levi', () => {
    renderPage();
    expect(screen.getByText('Prof. David Levi')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Graph Architect')).toBeInTheDocument();
  });

  it('renders Dr. Maria Santos', () => {
    renderPage();
    expect(screen.getByText('Dr. Maria Santos')).toBeInTheDocument();
    expect(screen.getByText('L&D Strategy Director')).toBeInTheDocument();
  });

  it('renders James Thompson', () => {
    renderPage();
    expect(screen.getByText('James Thompson')).toBeInTheDocument();
    expect(screen.getByText('Corporate Training Lead')).toBeInTheDocument();
  });

  // --- Card details ---
  it('renders credentials', () => {
    renderPage();
    expect(screen.getByText('Stanford PhD, Computer Science')).toBeInTheDocument();
    expect(screen.getByText('MIT CSAIL, Semantic Web')).toBeInTheDocument();
    expect(screen.getByText('Harvard EdD, Learning Sciences')).toBeInTheDocument();
  });

  it('renders bio for each instructor', () => {
    renderPage();
    expect(screen.getByText(/Leading AI researcher/)).toBeInTheDocument();
    expect(screen.getByText(/Pioneer in enterprise knowledge graph/)).toBeInTheDocument();
  });

  it('renders expertise tags', () => {
    renderPage();
    expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Graphs')).toBeInTheDocument();
    expect(screen.getByText('Learning Design')).toBeInTheDocument();
    expect(screen.getByText('Leadership Development')).toBeInTheDocument();
  });

  it('renders course counts', () => {
    renderPage();
    expect(screen.getByText('4 courses')).toBeInTheDocument();
    expect(screen.getByText('3 courses')).toBeInTheDocument();
    expect(screen.getByText('5 courses')).toBeInTheDocument();
    expect(screen.getByText('6 courses')).toBeInTheDocument();
  });

  it('each instructor card has aria-label', () => {
    renderPage();
    expect(screen.getByLabelText(/Instructor: Dr. Sarah Chen/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Instructor: Prof. David Levi/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Instructor: Dr. Maria Santos/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Instructor: James Thompson/)).toBeInTheDocument();
  });

  it('renders "Learn with them" links', () => {
    renderPage();
    const learnLinks = screen.getAllByText(/Learn with them/);
    expect(learnLinks).toHaveLength(4);
  });

  it('"Learn with them" links have aria-labels with instructor names', () => {
    renderPage();
    expect(screen.getByLabelText(/Learn from Dr. Sarah Chen/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Learn from James Thompson/)).toBeInTheDocument();
  });

  // --- Expertise lists ---
  it('renders expertise list for each instructor', () => {
    renderPage();
    const expertiseLists = screen.getAllByRole('list', { name: /areas of expertise/i });
    expect(expertiseLists).toHaveLength(4);
  });

  // --- CTA section ---
  it('renders become-an-instructor CTA', () => {
    renderPage();
    expect(screen.getByText(/Want to become an EduSphere instructor/i)).toBeInTheDocument();
  });

  it('renders Get Started CTA button', () => {
    renderPage();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('CTA button has aria-label', () => {
    renderPage();
    expect(screen.getByLabelText(/Apply to become an EduSphere instructor/)).toBeInTheDocument();
  });

  // --- SEO ---
  it('renders SEO components', () => {
    renderPage();
    expect(screen.getByTestId('page-meta')).toBeInTheDocument();
    expect(screen.getByTestId('breadcrumb-schema')).toBeInTheDocument();
  });

  it('renders PersonSchema for each instructor', () => {
    renderPage();
    const schemas = screen.getAllByTestId('person-schema');
    expect(schemas).toHaveLength(4);
  });

  // --- Quality ---
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
    expect(body).not.toMatch(/instructor\.\w+\.\w+/);
  });

  it('does not crash on re-render', () => {
    const { rerender } = renderPage();
    rerender(
      <MemoryRouter>
        <InstructorDirectoryPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Meet Our Instructors')).toBeInTheDocument();
  });

  it('all pilot links point to /pilot', () => {
    renderPage();
    const pilotLinks = screen.getAllByRole('link').filter(
      (link) => link.getAttribute('href') === '/pilot'
    );
    // 4 "Learn with them" + 1 CTA = 5
    expect(pilotLinks.length).toBeGreaterThanOrEqual(5);
  });
});
