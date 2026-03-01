import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnotationsPanel } from './AnnotationsPanel';
import type { Annotation } from '@/lib/mock-content-data';

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
  }: {
    id?: string;
    checked?: boolean;
    onCheckedChange?: () => void;
  }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked ?? false}
      onChange={() => onCheckedChange?.()}
    />
  ),
}));

const NOW = new Date();

const ANNOTATIONS: Annotation[] = [
  {
    id: 'a1',
    timestamp: 30,
    layer: 'SHARED',
    author: 'Alice',
    content: 'Shared note content',
    createdAt: NOW,
  },
  {
    id: 'a2',
    timestamp: 60,
    layer: 'INSTRUCTOR',
    author: 'Prof. Bob',
    content: 'Instructor note content',
    createdAt: NOW,
  },
  {
    id: 'a3',
    timestamp: 10,
    layer: 'PERSONAL',
    author: 'Me',
    content: 'Personal note content',
    createdAt: NOW,
  },
  {
    id: 'a4',
    timestamp: 90,
    layer: 'AI_GENERATED',
    author: 'AI',
    content: 'AI note content',
    createdAt: NOW,
  },
];

const defaultProps = {
  annotations: ANNOTATIONS,
  currentTime: 0,
  onSeek: vi.fn(),
  onAddAnnotation: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AnnotationsPanel', () => {
  it('renders "Annotation Layers" heading', () => {
    render(<AnnotationsPanel {...defaultProps} />);
    expect(screen.getByText('Annotation Layers')).toBeInTheDocument();
  });

  it('renders all 4 layer labels', () => {
    render(<AnnotationsPanel {...defaultProps} />);
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Shared')).toBeInTheDocument();
    expect(screen.getByText('Instructor')).toBeInTheDocument();
    expect(screen.getByText('AI Generated')).toBeInTheDocument();
  });

  it('renders "Add Note" button', () => {
    render(<AnnotationsPanel {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /add note/i })
    ).toBeInTheDocument();
  });

  it('calls onAddAnnotation when Add Note button is clicked', () => {
    const onAddAnnotation = vi.fn();
    render(<AnnotationsPanel {...defaultProps} onAddAnnotation={onAddAnnotation} />);
    fireEvent.click(screen.getByRole('button', { name: /add note/i }));
    expect(onAddAnnotation).toHaveBeenCalledTimes(1);
  });

  it('shows SHARED and INSTRUCTOR annotations by default', () => {
    render(<AnnotationsPanel {...defaultProps} />);
    expect(screen.getByText('Shared note content')).toBeInTheDocument();
    expect(screen.getByText('Instructor note content')).toBeInTheDocument();
  });

  it('hides PERSONAL and AI annotations by default', () => {
    render(<AnnotationsPanel {...defaultProps} />);
    expect(screen.queryByText('Personal note content')).not.toBeInTheDocument();
    expect(screen.queryByText('AI note content')).not.toBeInTheDocument();
  });

  it('shows empty-state message when no annotations match visible layers', () => {
    render(
      <AnnotationsPanel
        {...defaultProps}
        annotations={[ANNOTATIONS[2]!]} // only PERSONAL annotation
      />
    );
    expect(
      screen.getByText(/no annotations for selected layers/i)
    ).toBeInTheDocument();
  });

  it('calls onSeek with annotation timestamp when a card is clicked', () => {
    const onSeek = vi.fn();
    render(<AnnotationsPanel {...defaultProps} onSeek={onSeek} />);
    fireEvent.click(screen.getByText('Shared note content'));
    expect(onSeek).toHaveBeenCalledWith(30);
  });

  it('shows annotation author names', () => {
    render(<AnnotationsPanel {...defaultProps} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Prof. Bob')).toBeInTheDocument();
  });

  it('shows layer count badge for each layer', () => {
    render(<AnnotationsPanel {...defaultProps} />);
    // SHARED=1, INSTRUCTOR=1, PERSONAL=1, AI_GENERATED=1
    const countBadges = screen.getAllByText('(1)');
    expect(countBadges.length).toBeGreaterThanOrEqual(4);
  });

  it('toggles PERSONAL layer to show personal annotation', () => {
    render(<AnnotationsPanel {...defaultProps} />);
    // PERSONAL is unchecked by default — toggle it on
    const personalCheckbox = screen.getByRole('checkbox', {
      name: /personal/i,
    });
    fireEvent.click(personalCheckbox);
    expect(screen.getByText('Personal note content')).toBeInTheDocument();
  });
});
