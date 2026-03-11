/**
 * Unit tests for GlossaryPage
 *
 * Tests the GlossaryPage component in isolation (no network, no Keycloak).
 * Validates:
 *   - Page heading renders
 *   - Search input presence
 *   - At least 10 article elements with schema.org/DefinedTerm itemtype
 *   - Search filters visible terms
 *   - Empty state on no-match search
 *   - "All" button is present in alphabet navigation
 *   - Letter K filter button shows Knowledge Graph term
 *   - Read more / Show less toggle
 *   - No internal data leakage
 *
 * Note: react-helmet-async and SEO components are mocked; their
 * behaviour is covered by E2E tests in aeo-glossary-page.spec.ts.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { GlossaryPage } from './GlossaryPage';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-helmet-async', () => ({
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/seo', () => ({
  PageMeta: () => null,
  FAQSchema: () => null,
  BreadcrumbSchema: () => null,
  OrganizationSchema: () => null,
  WebSiteSchema: () => null,
  SoftwareApplicationSchema: () => null,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderGlossaryPage() {
  return render(
    <MemoryRouter>
      <GlossaryPage />
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GlossaryPage', () => {
  it('renders the main EdTech Glossary heading', () => {
    renderGlossaryPage();
    expect(screen.getByRole('heading', { name: /EdTech Glossary/i })).toBeInTheDocument();
  });

  it('renders the search input with correct placeholder', () => {
    renderGlossaryPage();
    expect(screen.getByPlaceholderText(/Search terms/i)).toBeInTheDocument();
  });

  it('renders at least 10 glossary term article elements', () => {
    renderGlossaryPage();
    // GlossaryTermCard renders <article itemType="https://schema.org/DefinedTerm">
    const articles = document.querySelectorAll('article[itemtype="https://schema.org/DefinedTerm"]');
    expect(articles.length).toBeGreaterThanOrEqual(10);
  });

  it('Knowledge Graph term is visible on initial load', () => {
    renderGlossaryPage();
    expect(screen.getByRole('heading', { name: 'Knowledge Graph' })).toBeInTheDocument();
  });

  it('SCORM term is visible on initial load', () => {
    renderGlossaryPage();
    expect(screen.getByRole('heading', { name: 'SCORM' })).toBeInTheDocument();
  });

  it('search filters to show SCORM and hide unrelated terms', () => {
    renderGlossaryPage();
    const searchInput = screen.getByPlaceholderText(/Search terms/i);
    fireEvent.change(searchInput, { target: { value: 'SCORM' } });
    expect(screen.getByRole('heading', { name: 'SCORM' })).toBeInTheDocument();
    // Apache AGE starts with "A" and is unrelated to SCORM
    expect(screen.queryByRole('heading', { name: 'Apache AGE' })).not.toBeInTheDocument();
  });

  it('search with non-matching term shows "No terms found" empty state', () => {
    renderGlossaryPage();
    const searchInput = screen.getByPlaceholderText(/Search terms/i);
    fireEvent.change(searchInput, { target: { value: 'xyznotexist99999' } });
    expect(screen.getByText(/No terms found/i)).toBeInTheDocument();
  });

  it('"All" button is present in alphabet navigation', () => {
    renderGlossaryPage();
    const nav = screen.getByRole('navigation', { name: /Alphabetical navigation/i });
    expect(within(nav).getByRole('button', { name: 'All' })).toBeInTheDocument();
  });

  it('"All" button has aria-pressed="true" on initial load', () => {
    renderGlossaryPage();
    const nav = screen.getByRole('navigation', { name: /Alphabetical navigation/i });
    const allButton = within(nav).getByRole('button', { name: 'All' });
    expect(allButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('letter K button filters to show Knowledge Graph', () => {
    renderGlossaryPage();
    const nav = screen.getByRole('navigation', { name: /Alphabetical navigation/i });
    const letterK = within(nav).getByRole('button', { name: 'K' });
    fireEvent.click(letterK);
    expect(letterK.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Knowledge Graph' })).toBeInTheDocument();
  });

  it('clicking letter K hides terms starting with other letters', () => {
    renderGlossaryPage();
    const nav = screen.getByRole('navigation', { name: /Alphabetical navigation/i });
    const letterK = within(nav).getByRole('button', { name: 'K' });
    fireEvent.click(letterK);
    // SCORM starts with S — should not be visible
    expect(screen.queryByRole('heading', { name: 'SCORM' })).not.toBeInTheDocument();
  });

  it('clicking letter K then "All" restores full list', () => {
    renderGlossaryPage();
    const nav = screen.getByRole('navigation', { name: /Alphabetical navigation/i });
    const letterK = within(nav).getByRole('button', { name: 'K' });
    fireEvent.click(letterK);
    const allButton = within(nav).getByRole('button', { name: 'All' });
    fireEvent.click(allButton);
    // All terms visible again
    expect(screen.getByRole('heading', { name: 'SCORM' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Knowledge Graph' })).toBeInTheDocument();
  });

  it('Read more button expands term definition (shows "Show less")', () => {
    renderGlossaryPage();
    const readMoreButtons = screen.getAllByRole('button', { name: /Read more/i });
    expect(readMoreButtons.length).toBeGreaterThan(0);
    fireEvent.click(readMoreButtons[0]);
    expect(screen.getAllByRole('button', { name: /Show less/i }).length).toBeGreaterThan(0);
  });

  it('Show less button collapses back to "Read more" state', () => {
    renderGlossaryPage();
    const readMoreButtons = screen.getAllByRole('button', { name: /Read more/i });
    fireEvent.click(readMoreButtons[0]);
    const showLessButton = screen.getAllByRole('button', { name: /Show less/i })[0];
    fireEvent.click(showLessButton);
    // Back to "Read more" state
    const readMoreAfter = screen.getAllByRole('button', { name: /Read more/i });
    expect(readMoreAfter.length).toBeGreaterThan(0);
  });

  it('term count text is visible showing total count', () => {
    renderGlossaryPage();
    // "Showing X of 20 terms"
    expect(screen.getByText(/Showing \d+ of \d+ terms/i)).toBeInTheDocument();
  });

  it('does NOT render localhost or port numbers in visible text', () => {
    renderGlossaryPage();
    expect(screen.queryByText(/localhost/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/4001|4002|4003|4004|4005|4006|5432/)).not.toBeInTheDocument();
  });
});
