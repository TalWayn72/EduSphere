import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="helmet">{children}</div>
  ),
}));

vi.mock('@/components/seo', () => ({
  PageMeta: () => <div data-testid="page-meta" />,
  BreadcrumbSchema: () => <div data-testid="breadcrumb-schema" />,
  OrganizationSchema: () => <div data-testid="org-schema" />,
  SoftwareApplicationSchema: () => <div data-testid="software-schema" />,
}));

vi.mock('@/lib/safe-json-ld', () => ({
  safeJsonLd: (obj: unknown) => JSON.stringify(obj),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => {
    // Handle asChild by rendering the child directly
    if (props.asChild && React.isValidElement(children)) {
      return children;
    }
    return <button {...props as React.ButtonHTMLAttributes<HTMLButtonElement>}>{children}</button>;
  },
}));

import { FeaturesPage } from './FeaturesPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <FeaturesPage />
    </MemoryRouter>
  );

describe('FeaturesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Page structure ---
  it('renders page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Everything You Need to Learn Smarter')).toBeInTheDocument();
  });

  it('renders header description', () => {
    renderPage();
    expect(screen.getByText(/AI tutoring, knowledge graphs, gamification/i)).toBeInTheDocument();
  });

  it('renders Get Started Free link', () => {
    renderPage();
    const links = screen.getAllByText('Get Started Free');
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it('renders View FAQ link', () => {
    renderPage();
    expect(screen.getByText('View FAQ')).toBeInTheDocument();
  });

  // --- Feature sections ---
  it('renders AI Tutoring feature section', () => {
    renderPage();
    expect(screen.getByText('AI Tutoring (Chavruta)')).toBeInTheDocument();
    expect(screen.getByText('The AI that thinks with you')).toBeInTheDocument();
  });

  it('renders Knowledge Graph feature section', () => {
    renderPage();
    expect(screen.getByText('Knowledge Graph')).toBeInTheDocument();
    expect(screen.getByText('Your personal concept map')).toBeInTheDocument();
  });

  it('renders Gamification feature section', () => {
    renderPage();
    expect(screen.getByText('Gamification')).toBeInTheDocument();
    expect(screen.getByText('Learning that keeps you coming back')).toBeInTheDocument();
  });

  it('renders Enterprise Grade feature section', () => {
    renderPage();
    expect(screen.getByText('Enterprise Grade')).toBeInTheDocument();
    expect(screen.getByText('Built for scale and compliance')).toBeInTheDocument();
  });

  it('renders Multi-Language feature section', () => {
    renderPage();
    expect(screen.getByText('Multi-Language')).toBeInTheDocument();
    expect(screen.getByText('50+ languages with full RTL support')).toBeInTheDocument();
  });

  it('renders Live Sessions feature section', () => {
    renderPage();
    expect(screen.getByText('Live Sessions')).toBeInTheDocument();
    expect(screen.getByText('Real-time collaborative learning')).toBeInTheDocument();
  });

  // --- Feature content ---
  it('renders benefits for AI Tutoring', () => {
    renderPage();
    expect(screen.getByText(/Adapts to your learning pace/)).toBeInTheDocument();
    expect(screen.getByText(/Socratic questioning/)).toBeInTheDocument();
  });

  it('renders How it Works sections for features that have steps', () => {
    renderPage();
    const howItWorks = screen.getAllByText('How it works');
    // 4 features have howItWorks steps (AI Tutor, Knowledge Graph, Gamification, Enterprise)
    expect(howItWorks).toHaveLength(4);
  });

  it('renders step numbers for how it works', () => {
    renderPage();
    // Each feature with steps has 4 steps = 16 step numbers, but steps 1-4 repeat
    const step1s = screen.getAllByText('1');
    expect(step1s.length).toBeGreaterThanOrEqual(4);
  });

  // --- Sections have proper aria ---
  it('each feature section has aria-labelledby', () => {
    renderPage();
    const sections = document.querySelectorAll('section[aria-labelledby]');
    expect(sections.length).toBe(6);
  });

  it('feature sections have correct ids for anchoring', () => {
    renderPage();
    expect(document.getElementById('ai-tutor')).toBeTruthy();
    expect(document.getElementById('knowledge-graph')).toBeTruthy();
    expect(document.getElementById('gamification')).toBeTruthy();
    expect(document.getElementById('enterprise')).toBeTruthy();
    expect(document.getElementById('multilingual')).toBeTruthy();
    expect(document.getElementById('live-sessions')).toBeTruthy();
  });

  // --- CTA section ---
  it('renders CTA section', () => {
    renderPage();
    expect(screen.getByText('Ready to Transform Learning?')).toBeInTheDocument();
  });

  it('CTA has no credit card text', () => {
    renderPage();
    expect(screen.getByText(/No credit card required/)).toBeInTheDocument();
  });

  // --- SEO ---
  it('renders SEO components', () => {
    renderPage();
    expect(screen.getByTestId('page-meta')).toBeInTheDocument();
    expect(screen.getByTestId('breadcrumb-schema')).toBeInTheDocument();
    expect(screen.getByTestId('org-schema')).toBeInTheDocument();
    expect(screen.getByTestId('software-schema')).toBeInTheDocument();
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
    expect(body).not.toMatch(/features\.\w+\.\w+/);
  });

  it('does not crash on re-render', () => {
    const { rerender } = renderPage();
    rerender(
      <MemoryRouter>
        <FeaturesPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Everything You Need to Learn Smarter')).toBeInTheDocument();
  });

  it('renders multiple heading levels (h1, h2, h3)', () => {
    renderPage();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const h2s = screen.getAllByRole('heading', { level: 2 });
    // 6 feature h2 titles + CTA h2 = 7
    expect(h2s.length).toBeGreaterThanOrEqual(7);
  });
});
