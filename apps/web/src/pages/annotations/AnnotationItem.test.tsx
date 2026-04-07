import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnotationItem } from './AnnotationItem';
import { AnnotationLayer, type Annotation } from '@/types/annotations';

// ── mock AnnotationCard ───────────────────────────────────────────────────────
vi.mock('@/pages/AnnotationCard', () => ({
  AnnotationCard: ({
    ann,
    onSeek,
  }: {
    ann: Annotation;
    onSeek: (id: string, ts?: number) => void;
  }) => (
    <div
      data-testid="annotation-card"
      onClick={() => onSeek(ann.contentId, ann.contentTimestamp)}
    >
      {ann.content}
    </div>
  ),
}));

// ── test fixture ──────────────────────────────────────────────────────────────
const baseAnnotation: Annotation = {
  id: 'ann-42',
  content: 'Test annotation content',
  layer: AnnotationLayer.PERSONAL,
  userId: 'user-1',
  userName: 'Alice',
  userRole: 'student',
  timestamp: '2026-01-15T10:00:00Z',
  contentId: 'content-99',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
};

const defaultProps = {
  ann: baseAnnotation,
  onSeek: vi.fn(),
  onDeleteRequest: vi.fn(),
};

function renderItem(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<AnnotationItem {...props} />);
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe('AnnotationItem — rendering', () => {
  it('renders the AnnotationCard with annotation data', () => {
    renderItem();
    expect(screen.getByTestId('annotation-card')).toBeTruthy();
    expect(screen.getByText('Test annotation content')).toBeTruthy();
  });

  it('renders a delete button with aria-label', () => {
    renderItem();
    const btn = screen.getByRole('button', { name: 'Delete annotation' });
    expect(btn).toBeTruthy();
  });

  it('renders with different annotation content', () => {
    const ann = { ...baseAnnotation, id: 'ann-99', content: 'Different text' };
    renderItem({ ann });
    expect(screen.getByText('Different text')).toBeTruthy();
  });
});

describe('AnnotationItem — delete interaction', () => {
  it('calls onDeleteRequest with annotation id when delete clicked', () => {
    const onDeleteRequest = vi.fn();
    renderItem({ onDeleteRequest });
    fireEvent.click(screen.getByRole('button', { name: 'Delete annotation' }));
    expect(onDeleteRequest).toHaveBeenCalledTimes(1);
    expect(onDeleteRequest).toHaveBeenCalledWith('ann-42');
  });

  it('calls onDeleteRequest with the correct id for different annotations', () => {
    const onDeleteRequest = vi.fn();
    const ann = { ...baseAnnotation, id: 'ann-special' };
    renderItem({ ann, onDeleteRequest });
    fireEvent.click(screen.getByRole('button', { name: 'Delete annotation' }));
    expect(onDeleteRequest).toHaveBeenCalledWith('ann-special');
  });

  it('does not call onSeek when delete is clicked', () => {
    const onSeek = vi.fn();
    const onDeleteRequest = vi.fn();
    renderItem({ onSeek, onDeleteRequest });
    fireEvent.click(screen.getByRole('button', { name: 'Delete annotation' }));
    expect(onSeek).not.toHaveBeenCalled();
    expect(onDeleteRequest).toHaveBeenCalledTimes(1);
  });
});

describe('AnnotationItem — annotation card delegation', () => {
  it('passes onSeek through to AnnotationCard', () => {
    const onSeek = vi.fn();
    renderItem({ onSeek });
    fireEvent.click(screen.getByTestId('annotation-card'));
    expect(onSeek).toHaveBeenCalledTimes(1);
  });

  it('renders with SHARED layer annotation', () => {
    const ann = { ...baseAnnotation, layer: AnnotationLayer.SHARED };
    renderItem({ ann });
    expect(screen.getByTestId('annotation-card')).toBeTruthy();
  });

  it('renders with INSTRUCTOR layer annotation', () => {
    const ann = {
      ...baseAnnotation,
      layer: AnnotationLayer.INSTRUCTOR,
      userRole: 'instructor' as const,
    };
    renderItem({ ann });
    expect(screen.getByTestId('annotation-card')).toBeTruthy();
  });
});
