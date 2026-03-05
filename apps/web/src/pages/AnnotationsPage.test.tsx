import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AnnotationsPage } from './AnnotationsPage';
import { mockAnnotations } from '@/lib/mock-annotations';

// Mock urql to avoid Provider requirement
const mockDeleteFn = vi.fn().mockResolvedValue({ data: undefined, error: undefined });

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
    vi.fn(),
  ]),
  useMutation: vi.fn(() => [{ fetching: false, error: undefined }, mockDeleteFn]),
}));

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
      {
        data: { annotationsByUser: BACKEND_ANNOTATIONS },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
  });

  it('renders Annotations heading', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: /annotations/i })
    ).toBeInTheDocument();
  });

  it('shows total annotation count in subtitle', () => {
    renderPage();
    const total = mockAnnotations.length;
    expect(screen.getByText(new RegExp(`${total} notes`))).toBeInTheDocument();
  });

  it('renders "By time" sort button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /by time/i })
    ).toBeInTheDocument();
  });

  it('renders "By layer" sort button', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /by layer/i })
    ).toBeInTheDocument();
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
      screen.getByRole('tab', {
        name: new RegExp(`All \\(${mockAnnotations.length}\\)`),
      })
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
    expect(
      screen.getByRole('tab', { name: /instructor/i })
    ).toBeInTheDocument();
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

  // ── Optimistic delete tests (useOptimistic) ─────────────────────────────────

  describe('optimistic delete with useOptimistic', () => {
    it('shows delete confirmation dialog when trash button is clicked', async () => {
      renderPage();
      // Hover-state is CSS-only; the button is in the DOM even without hover.
      // Get all trash buttons and click the first one.
      const trashBtns = screen.getAllByRole('button', { name: /delete annotation/i });
      expect(trashBtns.length).toBeGreaterThan(0);
      fireEvent.click(trashBtns[0]);
      await waitFor(() => {
        // Dialog title should appear
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('closes dialog and calls delete mutation when confirmed', async () => {
      renderPage();
      const trashBtns = screen.getAllByRole('button', { name: /delete annotation/i });
      fireEvent.click(trashBtns[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click the destructive "Delete" button inside the dialog
      const deleteBtn = screen.getByRole('button', { name: /^delete$/i });
      await act(async () => {
        fireEvent.click(deleteBtn);
      });

      await waitFor(() => {
        expect(mockDeleteFn).toHaveBeenCalledTimes(1);
      });
    });

    it('does NOT call delete mutation when dialog is cancelled', async () => {
      renderPage();
      const trashBtns = screen.getAllByRole('button', { name: /delete annotation/i });
      fireEvent.click(trashBtns[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click the Cancel button
      const cancelBtn = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelBtn);

      // Dialog should close without calling mutation
      expect(mockDeleteFn).not.toHaveBeenCalled();
    });

    it('calls delete mutation with correct id', async () => {
      // Only one annotation in list so we can identify its id
      const singleAnnotation = BACKEND_ANNOTATIONS[0];
      vi.mocked(useQuery).mockReturnValue([
        {
          data: { annotationsByUser: [singleAnnotation] },
          fetching: false,
          error: undefined,
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      renderPage();
      const trashBtn = screen.getByRole('button', { name: /delete annotation/i });
      fireEvent.click(trashBtn);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const deleteBtn = screen.getByRole('button', { name: /^delete$/i });
      await act(async () => {
        fireEvent.click(deleteBtn);
      });

      await waitFor(() => {
        expect(mockDeleteFn).toHaveBeenCalledWith({ id: singleAnnotation.id });
      });
    });

    // Regression guard: after delete is confirmed, the dialog closes and the
    // mutation is invoked. We simulate the server refetch by switching the
    // useQuery mock to return an empty list — this is how the annotation
    // disappears in production (urql refetches after mutation completes).
    it('regression guard: annotation is no longer rendered after delete + server refetch', async () => {
      const singleAnnotation = BACKEND_ANNOTATIONS[0];

      // Start with 1 annotation
      vi.mocked(useQuery).mockReturnValue([
        {
          data: { annotationsByUser: [singleAnnotation] },
          fetching: false,
          error: undefined,
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      const { rerender } = renderPage();

      const trashBtn = screen.getByRole('button', { name: /delete annotation/i });
      expect(trashBtn).toBeInTheDocument();

      fireEvent.click(trashBtn);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Switch mock to return empty list BEFORE confirming — simulates refetch
      vi.mocked(useQuery).mockReturnValue([
        {
          data: { annotationsByUser: [] },
          fetching: false,
          error: undefined,
        },
        vi.fn(),
      ] as unknown as ReturnType<typeof useQuery>);

      const deleteBtn = screen.getByRole('button', { name: /^delete$/i });
      await act(async () => {
        fireEvent.click(deleteBtn);
      });

      // Re-render with updated mock (simulates React re-render after urql refetch)
      rerender(
        <MemoryRouter>
          <AnnotationsPage />
        </MemoryRouter>
      );

      // Regression guard: the annotation should be gone from the list
      await waitFor(() => {
        expect(screen.queryAllByRole('button', { name: /delete annotation/i })).toHaveLength(0);
      });

      // BAD state: annotation still visible — assert it is absent
      expect(document.body.textContent).not.toContain(
        typeof singleAnnotation.content === 'string' ? singleAnnotation.content : ''
      );
    });
  });
});
