import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  TouchSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: 'vertical',
  useSortable: vi.fn(() => ({
    attributes: { role: 'button', tabIndex: 0 },
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
}));

vi.mock('lucide-react', () => ({
  GripVertical: ({ size }: { size: number }) => <span data-testid="grip-icon">{size}</span>,
}));

vi.mock('@/lib/lesson-pipeline.store', () => ({
  MODULE_LABELS: {
    INGESTION: { en: 'Ingestion', he: 'איסוף חומרים' },
    ASR: { en: 'Transcription (ASR)', he: 'תמלול' },
  },
}));

import { PipelineSortableCanvas } from './PipelineSortableCanvas';
import type { PipelineNode } from '@/lib/lesson-pipeline.store';

const MOCK_NODES: PipelineNode[] = [
  { id: 'n1', moduleType: 'INGESTION', label: 'Ingestion', labelHe: 'איסוף חומרים', enabled: true, order: 0, config: {} },
  { id: 'n2', moduleType: 'ASR', label: 'Transcription (ASR)', labelHe: 'תמלול', enabled: true, order: 1, config: {} },
];

describe('PipelineSortableCanvas', () => {
  const defaultProps = {
    nodes: MOCK_NODES,
    selectedNodeId: null,
    customMode: false,
    onSelect: vi.fn(),
    onRemove: vi.fn(),
    onReorder: vi.fn(),
    onDropModule: vi.fn(),
  };

  it('renders all pipeline nodes', () => {
    render(<PipelineSortableCanvas {...defaultProps} />);
    expect(screen.getByTestId('pipeline-node-INGESTION')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-node-ASR')).toBeInTheDocument();
  });

  it('renders sr-only keyboard instructions', () => {
    render(<PipelineSortableCanvas {...defaultProps} />);
    expect(screen.getByText(/השתמש במקש Tab/)).toBeInTheDocument();
  });

  it('renders empty canvas with default message when no nodes', () => {
    render(<PipelineSortableCanvas {...defaultProps} nodes={[]} />);
    expect(screen.getByTestId('empty-canvas')).toBeInTheDocument();
    expect(screen.getByText('גרור מודולים לכאן')).toBeInTheDocument();
  });

  it('renders custom mode empty canvas message', () => {
    render(<PipelineSortableCanvas {...defaultProps} nodes={[]} customMode={true} />);
    expect(screen.getByText('מצב בנייה חופשית')).toBeInTheDocument();
  });

  it('each node has a drag handle', () => {
    render(<PipelineSortableCanvas {...defaultProps} />);
    expect(screen.getByLabelText('גרור איסוף חומרים')).toBeInTheDocument();
    expect(screen.getByLabelText('גרור תמלול')).toBeInTheDocument();
  });

  it('each node has a remove button', () => {
    render(<PipelineSortableCanvas {...defaultProps} />);
    expect(screen.getByLabelText('הסר איסוף חומרים')).toBeInTheDocument();
    expect(screen.getByLabelText('הסר תמלול')).toBeInTheDocument();
  });

  it('remove button calls onRemove', () => {
    const onRemove = vi.fn();
    render(<PipelineSortableCanvas {...defaultProps} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('הסר איסוף חומרים'));
    expect(onRemove).toHaveBeenCalledWith('n1');
  });

  it('settings button calls onSelect to toggle', () => {
    const onSelect = vi.fn();
    render(<PipelineSortableCanvas {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByLabelText('הגדרות איסוף חומרים'));
    expect(onSelect).toHaveBeenCalledWith('n1');
  });

  it('nodes have aria-roledescription="sortable"', () => {
    render(<PipelineSortableCanvas {...defaultProps} />);
    const items = screen.getAllByRole('listitem');
    for (const item of items) {
      expect(item).toHaveAttribute('aria-roledescription', 'sortable');
    }
  });

  it('nodes list has role="list"', () => {
    render(<PipelineSortableCanvas {...defaultProps} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
  });
});
