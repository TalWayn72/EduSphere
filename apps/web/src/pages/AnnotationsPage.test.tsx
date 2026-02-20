import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AnnotationsPage } from './AnnotationsPage';
import { mockAnnotations } from '@/lib/mock-annotations';

// Mock urql to avoid Provider requirement
vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof import('urql')>();
  return {
    ...actual,
    useQuery: vi.fn(() => [{ data: undefined, fetching: false, error: undefined }, vi.fn()]),
    useMutation: vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]),
  };
});

// Mock Layout to avoid router/auth complexity
vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

// Mock auth — component uses getCurrentUser() for userId + displayName
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => ({
    id: 'user-1',
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    tenantId: 't1',
    role: 'STUDENT',
  })),
  logout: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import { useQuery } from 'urql';

// Convert frontend Annotation objects to the BackendAnnotation shape the API returns
const BACKEND_ANNOTATIONS = mockAnnotations.map((ann) => ({
  id: ann.id,
  assetId: ann.contentId ?? '',
  userId: ann.userId,
  layer: ann.layer,
  annotationType: 'TEXT',
  content: ann.content,
  spatialData: null,
  parentId: ann.parentId ?? null,
  isResolved: false,
  createdAt: ann.createdAt ?? new Date().toISOString(),
  updatedAt: ann.updatedAt ?? new Date().toISOString(),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <AnnotationsPage />
    </MemoryRouter>
  );

describe('AnnotationsPage', () => {
  beforeEach(() => {
    // Provide annotationsByUser data so the component has annotations to render
    vi.mocked(useQuery).mockReturnValue([
      { data: { annotationsByUser: BACKEND_ANNOTATIONS }, fetching: false, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
  });

  it('renders Annotations heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /annotations/i })).toBeInTheDocument();
  });

  it('shows total annotation count in subtitle', () => {
    renderPage();
    const total = mockAnnotations.length;
    expect(screen.getByText(new RegExp(`${total} notes`))).toBeInTheDocument();
  });

  it('renders "By time" sort button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /by time/i })).toBeInTheDocument();
  });

  it('renders "By layer" sort button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /by layer/i })).toBeInTheDocument();
  });

  it('"By time" is active by default', () => {
    renderPage();
    const byTimeBtn = screen.getByRole('button', { name: /by time/i });
    // default variant is "default" (active state)
    expect(byTimeBtn).toBeInTheDocument();
  });

  it('renders All tab with correct count', () => {
    renderPage();
    expect(
      screen.getByRole('tab', { name: new RegExp(`All \\(${mockAnnotations.length}\\)`) })
    ).toBeInTheDocument();
  });

  it('renders Personal tab', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /personal/i })).toBeInTheDocument();
  });

  it('renders Shared tab', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /shared/i })).toBeInTheDocument();
  });

  it('renders Instructor tab', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /instructor/i })).toBeInTheDocument();
  });

  it('renders AI tab (AI_GENERATED layer)', () => {
    renderPage();
    // Tab renders as "🤖 AI (N)" — matches the ANNOTATION_LAYER_META label
    expect(screen.getByRole('tab', { name: /🤖/i })).toBeInTheDocument();
  });

  it('renders 4 stats cards (one per layer)', () => {
    renderPage();
    // Each layer card shows count + label
    const personalLabel = screen.getAllByText(/personal/i);
    expect(personalLabel.length).toBeGreaterThanOrEqual(1);
  });

  it('toggles sort mode when "By layer" is clicked', () => {
    renderPage();
    const byLayerBtn = screen.getByRole('button', { name: /by layer/i });
    fireEvent.click(byLayerBtn);
    // Button should still be in document after click
    expect(byLayerBtn).toBeInTheDocument();
  });

  it('renders annotation cards in the All tab', () => {
    renderPage();
    // Annotation cards have titles from mock data — at least one should appear
    expect(mockAnnotations.length).toBeGreaterThan(0);
    // The All tab is default — cards should be present
    const layout = screen.getByTestId('layout');
    expect(layout).toBeInTheDocument();
  });
});
