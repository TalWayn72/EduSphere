import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DragOrderQuestion } from './DragOrderQuestion';
import type { DragOrder } from '@/types/quiz';

const mockItem: DragOrder = {
  type: 'DRAG_ORDER',
  question: 'Order the steps of the scientific method',
  items: [
    { id: 'a', text: 'Observe' },
    { id: 'b', text: 'Hypothesize' },
    { id: 'c', text: 'Experiment' },
    { id: 'd', text: 'Conclude' },
  ],
  correctOrder: ['a', 'b', 'c', 'd'],
};

describe('DragOrderQuestion', () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it('renders the question text', () => {
    render(<DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />);
    expect(screen.getByText('Order the steps of the scientific method')).toBeInTheDocument();
  });

  it('renders drag hint text', () => {
    render(<DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />);
    expect(screen.getByText('Drag items into the correct order')).toBeInTheDocument();
  });

  it('renders all items in original order when value is empty', () => {
    render(<DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />);
    expect(screen.getByText('Observe')).toBeInTheDocument();
    expect(screen.getByText('Hypothesize')).toBeInTheDocument();
    expect(screen.getByText('Experiment')).toBeInTheDocument();
    expect(screen.getByText('Conclude')).toBeInTheDocument();
  });

  it('renders items in provided value order', () => {
    render(
      <DragOrderQuestion
        item={mockItem}
        value={['d', 'c', 'b', 'a']}
        onChange={onChange}
      />
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Conclude');
    expect(items[1]).toHaveTextContent('Experiment');
    expect(items[2]).toHaveTextContent('Hypothesize');
    expect(items[3]).toHaveTextContent('Observe');
  });

  it('renders numbered position labels', () => {
    render(<DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('list has accessible role and label', () => {
    render(<DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />);
    expect(screen.getByRole('list', { name: 'Orderable items' })).toBeInTheDocument();
  });

  it('items are draggable when not disabled', () => {
    render(<DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />);
    const items = screen.getAllByRole('listitem');
    items.forEach((li) => {
      expect(li).toHaveAttribute('draggable', 'true');
    });
  });

  it('items are not draggable when disabled', () => {
    render(<DragOrderQuestion item={mockItem} value={[]} onChange={onChange} disabled />);
    const items = screen.getAllByRole('listitem');
    items.forEach((li) => {
      expect(li).toHaveAttribute('draggable', 'false');
    });
  });

  it('calls onChange with reordered ids on drop', () => {
    render(<DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />);
    const items = screen.getAllByRole('listitem');
    fireEvent.dragStart(items[0]);
    fireEvent.drop(items[2]);
    expect(onChange).toHaveBeenCalledWith(['b', 'c', 'a', 'd']);
  });

  it('does not call onChange when disabled and drop fires', () => {
    render(<DragOrderQuestion item={mockItem} value={[]} onChange={onChange} disabled />);
    const items = screen.getAllByRole('listitem');
    fireEvent.dragStart(items[0]);
    fireEvent.drop(items[2]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when dropping on same index', () => {
    render(<DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />);
    const items = screen.getAllByRole('listitem');
    fireEvent.dragStart(items[1]);
    fireEvent.drop(items[1]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('allows dragOver without preventing default implicitly', () => {
    render(<DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />);
    const items = screen.getAllByRole('listitem');
    // dragOver should not throw
    expect(() => fireEvent.dragOver(items[0])).not.toThrow();
  });
});
