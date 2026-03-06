/**
 * KnowledgeGraph — Personal wiki viewMode tests (PRD §4.4 regression guard).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({ DEV_MODE: true }));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('urql', () => ({
  useQuery: vi.fn(() => [{ fetching: false, data: null, error: null }]),
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), ''),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

vi.mock('@/lib/mock-annotations', () => ({ mockAnnotations: [] }));

// ── Import after mocks ────────────────────────────────────────────────────────
import { KnowledgeGraph } from './KnowledgeGraph';

function renderKG(courseId?: string) {
  return render(
    <MemoryRouter>
      <KnowledgeGraph courseId={courseId} />
    </MemoryRouter>
  );
}

describe('KnowledgeGraph — Personal wiki viewMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the view mode tab list', () => {
    renderKG();
    expect(
      screen.getByRole('tablist', { name: /knowledge graph view/i })
    ).toBeInTheDocument();
  });

  it('Global tab is selected by default', () => {
    renderKG();
    const globalTab = screen.getByTestId('kg-tab-global');
    expect(globalTab).toHaveAttribute('aria-selected', 'true');
  });

  it('Personal (My Wiki) tab is not selected by default', () => {
    renderKG();
    const personalTab = screen.getByTestId('kg-tab-personal');
    expect(personalTab).toHaveAttribute('aria-selected', 'false');
  });

  it('clicking My Wiki tab shows personal graph view', () => {
    renderKG();
    const personalTab = screen.getByTestId('kg-tab-personal');
    fireEvent.click(personalTab);
    expect(screen.getByText('Personal Knowledge Wiki')).toBeInTheDocument();
  });

  it('clicking My Wiki tab hides the main graph SVG search bar', () => {
    renderKG();
    // The search input is only shown in global mode
    expect(
      document.querySelector('input[placeholder]')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('kg-tab-personal'));
    // Search input should be gone in personal mode
    expect(
      document.querySelector('input[placeholder]')
    ).not.toBeInTheDocument();
  });

  it('switching back to Global tab hides personal graph', () => {
    renderKG();
    fireEvent.click(screen.getByTestId('kg-tab-personal'));
    expect(screen.getByText('Personal Knowledge Wiki')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('kg-tab-global'));
    expect(
      screen.queryByText('Personal Knowledge Wiki')
    ).not.toBeInTheDocument();
  });

  it('personal tab shows My Wiki label', () => {
    renderKG();
    expect(screen.getByTestId('kg-tab-personal')).toHaveTextContent('My Wiki');
  });

  it('does not expose raw errors in personal view', () => {
    renderKG();
    fireEvent.click(screen.getByTestId('kg-tab-personal'));
    expect(document.body.textContent).not.toMatch(/TypeError|Error:/);
  });
});
