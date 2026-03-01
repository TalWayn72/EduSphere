import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as mockAnnotations from '@/lib/mock-annotations';
import { AnnotationPanel } from './AnnotationPanel';

vi.mock('@/types/annotations', () => ({
  AnnotationLayer: {
    PERSONAL: 'PERSONAL',
    SHARED: 'SHARED',
    INSTRUCTOR: 'INSTRUCTOR',
    AI_GENERATED: 'AI_GENERATED',
  },
  ANNOTATION_LAYER_CONFIGS: {
    PERSONAL: { icon: '📝', label: 'Personal', color: 'text-blue-600' },
    SHARED: { icon: '👥', label: 'Shared', color: 'text-green-600' },
    INSTRUCTOR: { icon: '🎓', label: 'Instructor', color: 'text-purple-600' },
    AI_GENERATED: { icon: '🤖', label: 'AI', color: 'text-orange-600' },
  },
}));

vi.mock('@/lib/mock-annotations', () => ({
  getThreadedAnnotations: vi.fn(),
  filterAnnotationsByLayers: vi.fn((anns: unknown[]) => anns),
  getAnnotationCountByLayer: vi.fn(),
}));

vi.mock('./AnnotationItem', () => ({
  AnnotationItem: vi.fn(
    ({ annotation }: { annotation: { id: string; content: string } }) => (
      <div data-testid={`annotation-item-${annotation.id}`}>
        {annotation.content}
      </div>
    )
  ),
}));

vi.mock('./AnnotationForm', () => ({
  AnnotationForm: vi.fn(
    ({
      onSubmit,
      onCancel,
    }: {
      onSubmit: (c: string, l: string) => void;
      onCancel: () => void;
    }) => (
      <div data-testid="annotation-form">
        <button onClick={() => onSubmit('New note', 'PERSONAL')}>Submit</button>
        <button onClick={onCancel}>Cancel Form</button>
      </div>
    )
  ),
}));

const MOCK_ANNOTATIONS = [
  {
    id: 'ann-1',
    content: 'First note',
    layer: 'PERSONAL',
    userId: 'u1',
    userName: 'Alice',
    userRole: 'student',
    timestamp: '00:30',
    contentId: 'c1',
    contentTimestamp: 30,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    replies: [],
  },
  {
    id: 'ann-2',
    content: 'Second note',
    layer: 'SHARED',
    userId: 'u2',
    userName: 'Bob',
    userRole: 'instructor',
    timestamp: '01:00',
    contentId: 'c1',
    contentTimestamp: 60,
    createdAt: '2026-01-01T11:00:00Z',
    updatedAt: '2026-01-01T11:00:00Z',
    replies: [],
  },
];

beforeEach(() => {
  vi.mocked(mockAnnotations.getThreadedAnnotations).mockReturnValue(
    MOCK_ANNOTATIONS as never
  );
  vi.mocked(mockAnnotations.filterAnnotationsByLayers).mockImplementation(
    (anns: unknown[]) => anns as never
  );
  vi.mocked(mockAnnotations.getAnnotationCountByLayer).mockReturnValue({
    PERSONAL: 1,
    SHARED: 1,
    INSTRUCTOR: 0,
    AI_GENERATED: 0,
  } as never);
});

function renderPanel() {
  return render(<AnnotationPanel contentId="c1" />);
}

describe('AnnotationPanel', () => {
  it('renders the Annotations heading', () => {
    renderPanel();
    expect(screen.getByText('Annotations')).toBeInTheDocument();
  });

  it('shows "+ New Annotation" button', () => {
    renderPanel();
    expect(
      screen.getByRole('button', { name: /\+ new annotation/i })
    ).toBeInTheDocument();
  });

  it('shows AnnotationForm when "+ New Annotation" is clicked', () => {
    renderPanel();
    expect(screen.queryByTestId('annotation-form')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /\+ new annotation/i }));
    expect(screen.getByTestId('annotation-form')).toBeInTheDocument();
  });

  it('hides AnnotationForm after cancel', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /\+ new annotation/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel form/i }));
    expect(screen.queryByTestId('annotation-form')).not.toBeInTheDocument();
  });

  it('hides AnnotationForm after submission', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /\+ new annotation/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.queryByTestId('annotation-form')).not.toBeInTheDocument();
  });

  it('renders 4 layer filter checkboxes', () => {
    renderPanel();
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
  });

  it('renders all 4 layer labels', () => {
    renderPanel();
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Shared')).toBeInTheDocument();
    expect(screen.getByText('Instructor')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('renders Timestamp and Most Recent sort buttons', () => {
    renderPanel();
    expect(
      screen.getByRole('button', { name: /timestamp/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /most recent/i })
    ).toBeInTheDocument();
  });

  it('renders AnnotationItem for each annotation', () => {
    renderPanel();
    expect(screen.getByTestId('annotation-item-ann-1')).toBeInTheDocument();
    expect(screen.getByTestId('annotation-item-ann-2')).toBeInTheDocument();
  });

  it('shows footer with annotation count', () => {
    renderPanel();
    expect(screen.getByText(/annotations visible/i)).toBeInTheDocument();
  });

  it('shows layers enabled count in footer', () => {
    renderPanel();
    expect(screen.getByText(/layers enabled/i)).toBeInTheDocument();
  });

  it('shows empty state message when no annotations', () => {
    vi.mocked(mockAnnotations.getThreadedAnnotations).mockReturnValueOnce(
      [] as never
    );
    renderPanel();
    expect(screen.getByText(/no annotations yet/i)).toBeInTheDocument();
  });
});
