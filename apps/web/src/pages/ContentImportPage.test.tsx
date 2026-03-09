import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useMutation: vi.fn(() => ({
      mutateAsync: vi.fn().mockResolvedValue({
        importFromYoutube: { id: 'job-1', status: 'COMPLETE', lessonCount: 5, estimatedMinutes: 1 },
      }),
      isPending: false,
    })),
  };
});

vi.mock('graphql-request', () => ({
  request: vi.fn(),
  gql: (s: TemplateStringsArray) => s[0],
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/providers/AuthProvider', () => ({
  useAuthContext: vi.fn(() => ({
    user: { role: 'INSTRUCTOR', id: 'u-1' },
  })),
}));

vi.mock('@/components/content-import/ImportSourceSelector', () => ({
  ImportSourceSelector: ({ onSelect }: { onSelect: (s: string) => void }) => (
    <button data-testid="source-youtube" onClick={() => onSelect('youtube')}>
      YouTube
    </button>
  ),
}));

vi.mock('@/components/content-import/FolderUploadZone', () => ({
  FolderUploadZone: () => <div data-testid="folder-zone">Folder Zone</div>,
}));

vi.mock('@/components/content-import/ImportProgressPanel', () => ({
  ImportProgressPanel: ({ job }: { job: { lessonCount: number } }) => (
    <div data-testid="progress-panel">Job: {job.lessonCount} lessons</div>
  ),
}));

vi.mock('@/hooks/useContentImport', () => ({
  useContentImport: vi.fn(() => ({
    importFromYoutube: vi.fn().mockResolvedValue(undefined),
    importFromWebsite: vi.fn().mockResolvedValue(undefined),
    cancelImport: vi.fn(),
    importJob: null,
    isImporting: false,
    error: null,
  })),
}));

// ── Import after mocks ─────────────────────────────────────────────────────────

import { ContentImportPage } from './ContentImportPage';

// ── Tests ──────────────────────────────────────────────────────────────────────

function renderWithRouter(courseId = 'course-123') {
  return render(
    <MemoryRouter initialEntries={[`/courses/${courseId}/import`]}>
      <Routes>
        <Route path="/courses/:courseId/import" element={<ContentImportPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ContentImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Import Content" heading', () => {
    renderWithRouter();
    expect(screen.getByRole('heading', { name: /import content/i })).toBeInTheDocument();
  });

  it('renders ImportSourceSelector', () => {
    renderWithRouter();
    expect(screen.getByTestId('source-youtube')).toBeInTheDocument();
  });

  it('shows YouTube URL input after selecting YouTube source', () => {
    renderWithRouter();
    fireEvent.click(screen.getByTestId('source-youtube'));
    expect(screen.getByPlaceholderText(/youtube.com\/playlist/i)).toBeInTheDocument();
  });

  it('redirects to /dashboard when user is STUDENT', () => {
    const { useAuthContext } = vi.mocked(await import('@/providers/AuthProvider') as never) as { useAuthContext: ReturnType<typeof vi.fn> };
    useAuthContext.mockReturnValueOnce({ user: { role: 'STUDENT', id: 'u-2' } });
    // No heading if redirected
    const { container } = renderWithRouter();
    // Should redirect — heading not present
    expect(container.textContent).not.toContain('Import Content');
  });

  it('does not render ImportProgressPanel when no job', () => {
    renderWithRouter();
    expect(screen.queryByTestId('progress-panel')).not.toBeInTheDocument();
  });

  it('shows ImportProgressPanel when importJob exists', async () => {
    const { useContentImport } = await import('@/hooks/useContentImport');
    vi.mocked(useContentImport).mockReturnValueOnce({
      importFromYoutube: vi.fn(),
      importFromWebsite: vi.fn(),
      cancelImport: vi.fn(),
      importJob: { id: 'job-1', status: 'COMPLETE', lessonCount: 5, estimatedMinutes: 1 },
      isImporting: false,
      error: null,
    });
    renderWithRouter();
    expect(screen.getByTestId('progress-panel')).toBeInTheDocument();
    expect(screen.getByText(/5 lessons/)).toBeInTheDocument();
  });

  it('shows error message when import fails', async () => {
    const { useContentImport } = await import('@/hooks/useContentImport');
    vi.mocked(useContentImport).mockReturnValueOnce({
      importFromYoutube: vi.fn(),
      importFromWebsite: vi.fn(),
      cancelImport: vi.fn(),
      importJob: null,
      isImporting: false,
      error: 'YouTube API quota exceeded',
    });
    renderWithRouter();
    fireEvent.click(screen.getByTestId('source-youtube'));
    expect(screen.getByRole('alert')).toHaveTextContent('YouTube API quota exceeded');
  });
});
