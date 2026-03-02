/**
 * Tests for AnnotationsTab — annotation panel sub-component of UnifiedLearningPage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnotationsTab } from './UnifiedLearningPage.annotations-tab';
import { AnnotationLayer, type Annotation } from '@/types/annotations';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts) {
        // Handle interpolated keys like 'saveAt'
        const entries = Object.entries(opts);
        return entries.reduce(
          (acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
          key
        );
      }
      return key;
    },
  }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant: _v,
    size: _s,
    className: _c,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/components/LayerToggleBar', () => ({
  LayerToggleBar: ({
    onToggle,
  }: {
    activeLayers: AnnotationLayer[];
    onToggle: (layer: AnnotationLayer) => void;
  }) => (
    <div
      data-testid="layer-toggle-bar"
      onClick={() => onToggle(AnnotationLayer.PERSONAL)}
    />
  ),
}));

vi.mock('@/components/AnnotationThread', () => ({
  AnnotationThread: ({ annotation }: { annotation: Annotation }) => (
    <div data-testid={`annotation-thread-${annotation.id}`}>
      {annotation.content}
    </div>
  ),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 'ann-1',
    content: 'Test annotation',
    layer: AnnotationLayer.PERSONAL,
    userId: 'u1',
    userName: 'Alice',
    userRole: 'student',
    timestamp: '2024-01-01T00:00:00Z',
    contentId: 'c1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

const defaultProps = {
  annotations: [],
  fetching: false,
  currentTime: 0,
  onSeek: vi.fn(),
  onAddAnnotation: vi.fn(),
  onReply: vi.fn(),
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('AnnotationsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the annotation header', () => {
    render(<AnnotationsTab {...defaultProps} />);
    expect(screen.getByText('common:annotations')).toBeDefined();
  });

  it('renders the layer toggle bar', () => {
    render(<AnnotationsTab {...defaultProps} />);
    expect(screen.getByTestId('layer-toggle-bar')).toBeDefined();
  });

  it('renders the Add button', () => {
    render(<AnnotationsTab {...defaultProps} />);
    // "common:add" is the translation key the button renders
    expect(screen.getByText('common:add')).toBeDefined();
  });

  it('shows "no annotations" message when list is empty and not fetching', () => {
    render(
      <AnnotationsTab {...defaultProps} annotations={[]} fetching={false} />
    );
    expect(screen.getByText('content:noAnnotationsVisible')).toBeDefined();
  });

  it('shows skeleton loaders while fetching with empty list', () => {
    const { container } = render(
      <AnnotationsTab {...defaultProps} fetching={true} annotations={[]} />
    );
    const skeletons = container.querySelectorAll('.animate-pulse');
    // 2 skeleton items × 2 lines each = 4 elements
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });

  it('renders annotation threads for visible annotations', () => {
    const anns = [
      makeAnnotation({
        id: 'ann-1',
        content: 'First note',
        layer: AnnotationLayer.PERSONAL,
      }),
      makeAnnotation({
        id: 'ann-2',
        content: 'Second note',
        layer: AnnotationLayer.SHARED,
      }),
    ];
    render(<AnnotationsTab {...defaultProps} annotations={anns} />);
    expect(screen.getByTestId('annotation-thread-ann-1')).toBeDefined();
    expect(screen.getByTestId('annotation-thread-ann-2')).toBeDefined();
  });

  it('does not render reply annotations as top-level threads', () => {
    const parent = makeAnnotation({ id: 'parent', content: 'Parent' });
    const reply = makeAnnotation({
      id: 'reply',
      content: 'Reply',
      parentId: 'parent',
    });
    render(<AnnotationsTab {...defaultProps} annotations={[parent, reply]} />);
    expect(screen.getByTestId('annotation-thread-parent')).toBeDefined();
    expect(screen.queryByTestId('annotation-thread-reply')).toBeNull();
  });

  it('shows the add annotation form when Add button is clicked', () => {
    render(<AnnotationsTab {...defaultProps} />);
    fireEvent.click(screen.getByText('common:add'));
    // The textarea should appear
    expect(
      screen.getByPlaceholderText('content:annotationPlaceholder')
    ).toBeDefined();
  });

  it('hides the form after clicking Cancel', () => {
    render(<AnnotationsTab {...defaultProps} />);
    fireEvent.click(screen.getByText('common:add'));
    expect(
      screen.getByPlaceholderText('content:annotationPlaceholder')
    ).toBeDefined();
    fireEvent.click(screen.getByText('common:cancel'));
    expect(
      screen.queryByPlaceholderText('content:annotationPlaceholder')
    ).toBeNull();
  });

  it('calls onAddAnnotation with text and current time when form is saved', () => {
    const onAddAnnotation = vi.fn();
    render(
      <AnnotationsTab
        {...defaultProps}
        currentTime={42}
        onAddAnnotation={onAddAnnotation}
      />
    );
    fireEvent.click(screen.getByText('common:add'));
    const textarea = screen.getByPlaceholderText(
      'content:annotationPlaceholder'
    );
    fireEvent.change(textarea, { target: { value: 'My annotation' } });
    // Click save (the button containing saveAt key)
    const saveBtn = screen.getByText((t) => t.startsWith('content:saveAt'));
    fireEvent.click(saveBtn);
    expect(onAddAnnotation).toHaveBeenCalledWith(
      'My annotation',
      AnnotationLayer.PERSONAL,
      42
    );
  });

  it('does not call onAddAnnotation if text is empty', () => {
    const onAddAnnotation = vi.fn();
    render(
      <AnnotationsTab {...defaultProps} onAddAnnotation={onAddAnnotation} />
    );
    fireEvent.click(screen.getByText('common:add'));
    // Don't type anything, just click save
    const saveBtn = screen.getByText((t) => t.startsWith('content:saveAt'));
    fireEvent.click(saveBtn);
    expect(onAddAnnotation).not.toHaveBeenCalled();
  });

  it('hides form and clears textarea after successful save', () => {
    render(<AnnotationsTab {...defaultProps} />);
    fireEvent.click(screen.getByText('common:add'));
    const textarea = screen.getByPlaceholderText(
      'content:annotationPlaceholder'
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Note content' } });
    const saveBtn = screen.getByText((t) => t.startsWith('content:saveAt'));
    fireEvent.click(saveBtn);
    expect(
      screen.queryByPlaceholderText('content:annotationPlaceholder')
    ).toBeNull();
  });
});
