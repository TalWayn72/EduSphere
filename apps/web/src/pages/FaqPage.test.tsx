/**
 * Unit tests for FaqPage
 *
 * Tests the FaqPage component in isolation (no network, no Keycloak).
 * Validates:
 *   - Page heading renders
 *   - Category tab list is rendered with correct roles
 *   - First FAQ question is visible
 *   - Accordion aria-expanded toggle on click
 *   - Search input filters FAQ items
 *   - Empty state message on no-match search
 *   - Contact support link href
 *   - No internal hostnames or port numbers exposed in UI
 *
 * Note: react-helmet-async is mocked because JSDOM does not process <head>
 * mutations the same way a browser does; the SEO contract is tested by E2E.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FaqPage } from './FaqPage';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-helmet-async', () => ({
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock SEO components — their E2E behaviour is tested separately
vi.mock('@/components/seo', () => ({
  PageMeta: () => null,
  FAQSchema: () => null,
  BreadcrumbSchema: () => null,
  OrganizationSchema: () => null,
  WebSiteSchema: () => null,
  SoftwareApplicationSchema: () => null,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderFaqPage() {
  return render(
    <MemoryRouter>
      <FaqPage />
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FaqPage', () => {
  it('renders the main Frequently Asked Questions heading', () => {
    renderFaqPage();
    expect(
      screen.getByRole('heading', { name: /Frequently Asked Questions/i })
    ).toBeInTheDocument();
  });

  it('renders the search input with placeholder text', () => {
    renderFaqPage();
    expect(screen.getByPlaceholderText(/Search questions/i)).toBeInTheDocument();
  });

  it('renders category tabs with correct ARIA roles', () => {
    renderFaqPage();
    expect(screen.getByRole('tab', { name: /All Questions/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Pricing/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Enterprise/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Technical/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Platform/i })).toBeInTheDocument();
  });

  it('renders the first FAQ question "What is EduSphere?"', () => {
    renderFaqPage();
    expect(screen.getByText(/What is EduSphere\?/i)).toBeInTheDocument();
  });

  it('accordion button has aria-expanded attribute', () => {
    renderFaqPage();
    const button = screen.getByRole('button', { name: /What is EduSphere/i });
    const ariaExpanded = button.getAttribute('aria-expanded');
    expect(['true', 'false']).toContain(ariaExpanded);
  });

  it('accordion toggles aria-expanded on click', () => {
    renderFaqPage();
    const button = screen.getByRole('button', { name: /What is EduSphere/i });
    const initialExpanded = button.getAttribute('aria-expanded');
    fireEvent.click(button);
    const afterClickExpanded = button.getAttribute('aria-expanded');
    // Should have changed to the opposite value
    expect(afterClickExpanded).not.toBe(initialExpanded);
  });

  it('clicking a closed accordion reveals the answer text', () => {
    renderFaqPage();
    const button = screen.getByRole('button', { name: /What is EduSphere/i });
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    if (!isOpen) {
      fireEvent.click(button);
    }
    expect(screen.getByText(/AI-powered learning management system/i)).toBeInTheDocument();
  });

  it('search input filters FAQ items — SCORM query shows SCORM-related result', () => {
    renderFaqPage();
    const searchInput = screen.getByPlaceholderText(/Search questions/i);
    fireEvent.change(searchInput, { target: { value: 'SCORM' } });
    expect(screen.getAllByText(/SCORM/i).length).toBeGreaterThanOrEqual(1);
  });

  it('search with non-matching term shows "No questions found" empty state', () => {
    renderFaqPage();
    const searchInput = screen.getByPlaceholderText(/Search questions/i);
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent12345' } });
    expect(screen.getByText(/No questions found/i)).toBeInTheDocument();
  });

  it('clicking Pricing tab sets its aria-selected to "true"', () => {
    renderFaqPage();
    const pricingTab = screen.getByRole('tab', { name: 'Pricing' });
    fireEvent.click(pricingTab);
    expect(pricingTab.getAttribute('aria-selected')).toBe('true');
  });

  it('contact support link has href="mailto:support@edusphere.dev"', () => {
    renderFaqPage();
    const link = screen.getByRole('link', { name: /Contact Support/i });
    expect(link).toHaveAttribute('href', 'mailto:support@edusphere.dev');
  });

  it('does NOT render raw localhost or port number strings (internal leak guard)', () => {
    renderFaqPage();
    expect(screen.queryByText(/localhost/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/4001|4002|4003|4004|4005|4006|5432/)).not.toBeInTheDocument();
  });

  it('does NOT render stack trace or error object patterns', () => {
    renderFaqPage();
    expect(screen.queryByText(/at \w+\.\w+ \(.*:\d+:\d+\)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/TypeError:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
  });
});
