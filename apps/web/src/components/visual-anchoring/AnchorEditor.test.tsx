/**
 * AnchorEditor unit tests
 *
 * Covers:
 *  1. Renders children correctly
 *  2. On text selection: shows floating toolbar
 *  3. Toolbar "Create Anchor" click: opens modal
 *  4. Modal "Confirm" click: calls createAnchor mutation, closes modal
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ── urql mock ──────────────────────────────────────────────────────────────────
const mockCreateAnchor = vi.fn().mockResolvedValue({
  data: {
    createVisualAnchor: {
      id: 'anchor-1',
      anchorText: 'hello world',
      documentOrder: 0,
      visualAssetId: null,
      createdAt: '2026-01-01T00:00:00Z',
    },
  },
  error: undefined,
});

vi.mock('urql', () => ({
  useMutation: vi.fn(() => [{ fetching: false, error: undefined }, mockCreateAnchor]),
  useQuery: vi.fn(() => [{ data: undefined, fetching: false, error: undefined }]),
  gql: vi.fn((s: TemplateStringsArray) => String(s)),
  useClient: vi.fn(() => ({ query: vi.fn().mockResolvedValue({ data: undefined, error: undefined }) })),
}));

// ── shadcn/ui mocks ────────────────────────────────────────────────────────────
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, 'data-testid': testId }: React.HTMLAttributes<HTMLButtonElement> & { onClick?: () => void }) => (
    <button onClick={onClick} data-testid={testId}>{children}</button>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, 'data-testid': testId }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid={testId ?? 'dialog-content'}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ── AssetPicker mock ───────────────────────────────────────────────────────────
vi.mock('./AssetPicker', () => ({
  default: ({ onSelect }: { courseId: string; selectedAssetId: string | null; onSelect: (id: string | null) => void }) => (
    <div data-testid="asset-picker-mock">
      <button onClick={() => onSelect('asset-1')}>Pick asset</button>
    </div>
  ),
}));

// ── GraphQL docs mock ──────────────────────────────────────────────────────────
vi.mock('./visual-anchor.graphql', () => ({
  CREATE_VISUAL_ANCHOR: 'CREATE_VISUAL_ANCHOR',
  GET_VISUAL_ASSETS: 'GET_VISUAL_ASSETS',
  GET_PRESIGNED_UPLOAD_URL: 'GET_PRESIGNED_UPLOAD_URL',
  CONFIRM_VISUAL_ASSET_UPLOAD: 'CONFIRM_VISUAL_ASSET_UPLOAD',
}));

vi.mock('@/lib/utils', () => ({ cn: (...args: string[]) => args.filter(Boolean).join(' ') }));

import AnchorEditor from './AnchorEditor';

// ── helpers ────────────────────────────────────────────────────────────────────

function renderEditor() {
  const onAnchorCreated = vi.fn();
  const utils = render(
    <AnchorEditor
      mediaAssetId="media-1"
      courseId="course-1"
      onAnchorCreated={onAnchorCreated}
      existingAnchorCount={0}
    >
      <p data-testid="child-content">Document content here</p>
    </AnchorEditor>,
  );
  return { ...utils, onAnchorCreated };
}

/** Simulates a text selection inside the anchor editor container. */
function simulateSelection(container: HTMLElement, text = 'hello world') {
  // Create a fake range/selection
  const editorEl = container.querySelector('[data-testid="anchor-editor"]') as HTMLElement;

  // Mock window.getSelection to return a non-collapsed selection
  const mockRange = {
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 80, height: 20, right: 180, bottom: 70 } as DOMRect),
  };
  const mockSelection = {
    isCollapsed: false,
    rangeCount: 1,
    toString: () => text,
    getRangeAt: () => mockRange,
    removeAllRanges: vi.fn(),
  };
  vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection as unknown as ReturnType<typeof window.getSelection>);

  // Mock getBoundingClientRect on the container
  vi.spyOn(editorEl, 'getBoundingClientRect').mockReturnValue({
    left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({})
  } as DOMRect);

  fireEvent.mouseUp(editorEl);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('AnchorEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: true, rangeCount: 0, toString: () => '', getRangeAt: vi.fn(), removeAllRanges: vi.fn(),
    } as unknown as ReturnType<typeof window.getSelection>);
  });

  it('renders children correctly', () => {
    renderEditor();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Document content here')).toBeInTheDocument();
  });

  it('does NOT show toolbar when there is no selection', () => {
    renderEditor();
    expect(screen.queryByTestId('create-anchor-btn')).not.toBeInTheDocument();
  });

  it('shows floating toolbar after text selection', () => {
    const { container } = renderEditor();
    simulateSelection(container);
    expect(screen.getByTestId('create-anchor-btn')).toBeInTheDocument();
  });

  it('opens modal when toolbar "Create Anchor" button is clicked', () => {
    const { container } = renderEditor();
    simulateSelection(container);

    fireEvent.click(screen.getByTestId('create-anchor-btn'));

    expect(screen.getByTestId('anchor-creation-modal')).toBeInTheDocument();
    expect(screen.getByText('Create Visual Anchor')).toBeInTheDocument();
  });

  it('displays the selected text in the modal', () => {
    const { container } = renderEditor();
    simulateSelection(container, 'My selected passage');
    fireEvent.click(screen.getByTestId('create-anchor-btn'));
    expect(screen.getByText(/My selected passage/)).toBeInTheDocument();
  });

  it('calls createAnchor mutation and closes modal on confirm', async () => {
    const { container, onAnchorCreated } = renderEditor();
    simulateSelection(container);
    fireEvent.click(screen.getByTestId('create-anchor-btn'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-anchor-btn'));
    });

    await waitFor(() => {
      expect(mockCreateAnchor).toHaveBeenCalledTimes(1);
    });

    expect(mockCreateAnchor).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          mediaAssetId: 'media-1',
          courseId: 'course-1',
          anchorText: 'hello world',
        }),
      }),
    );

    await waitFor(() => {
      expect(onAnchorCreated).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'anchor-1' }),
      );
    });

    // Modal should close
    expect(screen.queryByTestId('anchor-creation-modal')).not.toBeInTheDocument();
  });

  it('closes modal without mutation when Cancel is clicked', () => {
    const { container } = renderEditor();
    simulateSelection(container);
    fireEvent.click(screen.getByTestId('create-anchor-btn'));

    expect(screen.getByTestId('anchor-creation-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByTestId('anchor-creation-modal')).not.toBeInTheDocument();
    expect(mockCreateAnchor).not.toHaveBeenCalled();
  });
});
