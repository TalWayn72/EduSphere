import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: { 'aria-describedby': 'dnd-desc' },
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock('lucide-react', () => ({
  GripVertical: () => <span data-testid="grip-icon" />,
}));

import { SortablePipelineNode } from './SortablePipelineNode';
import type { PipelineNode } from '@/lib/lesson-pipeline.store';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NODE: PipelineNode = {
  id: 'node-1',
  moduleType: 'ASR',
  label: 'Transcription (ASR)',
  labelHe: 'תמלול',
  enabled: true,
  order: 0,
  config: {},
};

const DISABLED_NODE: PipelineNode = {
  ...NODE,
  id: 'node-2',
  enabled: false,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SortablePipelineNode', () => {
  const onSelect = vi.fn();
  const onRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with correct testid', () => {
    render(
      <SortablePipelineNode node={NODE} idx={0} total={3} isSelected={false} onSelect={onSelect} onRemove={onRemove} />,
    );
    expect(screen.getByTestId('pipeline-node-ASR')).toBeInTheDocument();
  });

  it('shows Hebrew label', () => {
    render(
      <SortablePipelineNode node={NODE} idx={0} total={3} isSelected={false} onSelect={onSelect} onRemove={onRemove} />,
    );
    expect(screen.getByText('תמלול')).toBeInTheDocument();
  });

  it('shows English label', () => {
    render(
      <SortablePipelineNode node={NODE} idx={0} total={3} isSelected={false} onSelect={onSelect} onRemove={onRemove} />,
    );
    expect(screen.getByText('Transcription (ASR)')).toBeInTheDocument();
  });

  it('displays 1-based index number', () => {
    render(
      <SortablePipelineNode node={NODE} idx={2} total={5} isSelected={false} onSelect={onSelect} onRemove={onRemove} />,
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('has correct aria-label with module position', () => {
    render(
      <SortablePipelineNode node={NODE} idx={1} total={4} isSelected={false} onSelect={onSelect} onRemove={onRemove} />,
    );
    expect(screen.getByTestId('pipeline-node-ASR')).toHaveAttribute(
      'aria-label',
      'תמלול — מודול 2 מתוך 4',
    );
  });

  it('has role=listitem and aria-roledescription=sortable', () => {
    render(
      <SortablePipelineNode node={NODE} idx={0} total={1} isSelected={false} onSelect={onSelect} onRemove={onRemove} />,
    );
    const el = screen.getByTestId('pipeline-node-ASR');
    expect(el).toHaveAttribute('role', 'listitem');
    expect(el).toHaveAttribute('aria-roledescription', 'sortable');
  });

  it('calls onSelect when label clicked', () => {
    render(
      <SortablePipelineNode node={NODE} idx={0} total={1} isSelected={false} onSelect={onSelect} onRemove={onRemove} />,
    );
    fireEvent.click(screen.getByLabelText('הגדרות תמלול'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onRemove when remove button clicked', () => {
    render(
      <SortablePipelineNode node={NODE} idx={0} total={1} isSelected={false} onSelect={onSelect} onRemove={onRemove} />,
    );
    fireEvent.click(screen.getByLabelText('הסר תמלול'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('drag handle has correct aria-label', () => {
    render(
      <SortablePipelineNode node={NODE} idx={0} total={1} isSelected={false} onSelect={onSelect} onRemove={onRemove} />,
    );
    expect(screen.getByLabelText('גרור תמלול')).toBeInTheDocument();
  });

  it('applies selected border class when isSelected', () => {
    render(
      <SortablePipelineNode node={NODE} idx={0} total={1} isSelected={true} onSelect={onSelect} onRemove={onRemove} />,
    );
    const node = screen.getByTestId('pipeline-node-ASR');
    expect(node.className).toContain('border-blue-500');
  });

  it('applies muted class when node is disabled', () => {
    render(
      <SortablePipelineNode node={DISABLED_NODE} idx={0} total={1} isSelected={false} onSelect={onSelect} onRemove={onRemove} />,
    );
    const node = screen.getByTestId('pipeline-node-ASR');
    expect(node.className).toContain('opacity-50');
  });
});
