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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let onChangeMock: ReturnType<typeof vi.fn<any>>;
  let onChange: (value: string[]) => void;

  beforeEach(() => {
    onChangeMock = vi.fn();
    onChange = onChangeMock as unknown as (value: string[]) => void;
  });

  it('renders the question text', () => {
    render(
      <DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />
    );
    expect(
      screen.getByText('Order the steps of the scientific method')
    ).toBeInTheDocument();
  });

  it('renders drag hint text', () => {
    render(
      <DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />
    );
    expect(
      screen.getByText('Drag items into the correct order')
    ).toBeInTheDocument();
  });

  it('renders all items in original order when value is empty', () => {
    render(
      <DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />
    );
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
    render(
      <DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('list has accessible role and label', () => {
    render(
      <DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />
    );
    expect(
      screen.getByRole('list', { name: 'Orderable items' })
    ).toBeInTheDocument();
  });

  it('items are draggable when not disabled', () => {
    render(
      <DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />
    );
    const items = screen.getAllByRole('listitem');
    items.forEach((li) => {
      expect(li).toHaveAttribute('draggable', 'true');
    });
  });

  it('items are not draggable when disabled', () => {
    render(
      <DragOrderQuestion
        item={mockItem}
        value={[]}
        onChange={onChange}
        disabled
      />
    );
    const items = screen.getAllByRole('listitem');
    items.forEach((li) => {
      expect(li).toHaveAttribute('draggable', 'false');
    });
  });

  it('calls onChange with reordered ids on drop', () => {
    render(
      <DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />
    );
    const items = screen.getAllByRole('listitem');
    fireEvent.dragStart(items[0]!);
    fireEvent.drop(items[2]!);
    expect(onChangeMock).toHaveBeenCalledWith(['b', 'c', 'a', 'd']);
  });

  it('does not call onChange when disabled and drop fires', () => {
    render(
      <DragOrderQuestion
        item={mockItem}
        value={[]}
        onChange={onChange}
        disabled
      />
    );
    const items = screen.getAllByRole('listitem');
    fireEvent.dragStart(items[0]!);
    fireEvent.drop(items[2]!);
    expect(onChangeMock).not.toHaveBeenCalled();
  });

  it('does not call onChange when dropping on same index', () => {
    render(
      <DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />
    );
    const items = screen.getAllByRole('listitem');
    fireEvent.dragStart(items[1]!);
    fireEvent.drop(items[1]!);
    expect(onChangeMock).not.toHaveBeenCalled();
  });

  it('allows dragOver without preventing default implicitly', () => {
    render(
      <DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />
    );
    const items = screen.getAllByRole('listitem');
    // dragOver should not throw
    expect(() => fireEvent.dragOver(items[0]!)).not.toThrow();
  });

  // ── WCAG 2.5.7 — Keyboard-accessible Up/Down buttons ────────────────────

  it('renders sr-only keyboard instruction', () => {
    render(
      <DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />
    );
    expect(
      screen.getByText(
        'Keyboard users: use the up and down buttons to reorder items'
      )
    ).toBeInTheDocument();
  });

  it('renders Move up and Move down buttons for each item', () => {
    render(
      <DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />
    );
    expect(screen.getByRole('button', { name: 'Move Observe up' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Observe down' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Conclude up' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move Conclude down' })).toBeInTheDocument();
  });

  it('Move up button is disabled on the first item', () => {
    render(
      <DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />
    );
    expect(
      screen.getByRole('button', { name: 'Move Observe up' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Move Observe down' })
    ).not.toBeDisabled();
  });

  it('Move down button is disabled on the last item', () => {
    render(
      <DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />
    );
    expect(
      screen.getByRole('button', { name: 'Move Conclude down' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Move Conclude up' })
    ).not.toBeDisabled();
  });

  it('clicking Move down on first item calls onChange with correct reordering', () => {
    render(
      <DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Move Observe down' }));
    expect(onChangeMock).toHaveBeenCalledWith(['b', 'a', 'c', 'd']);
  });

  it('clicking Move up on second item calls onChange with correct reordering', () => {
    render(
      <DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Move Hypothesize up' }));
    expect(onChangeMock).toHaveBeenCalledWith(['b', 'a', 'c', 'd']);
  });

  it('clicking Move up on last item moves it to second-to-last', () => {
    render(
      <DragOrderQuestion item={mockItem} value={[]} onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Move Conclude up' }));
    expect(onChangeMock).toHaveBeenCalledWith(['a', 'b', 'd', 'c']);
  });

  it('keyboard buttons are all disabled when prop disabled=true', () => {
    render(
      <DragOrderQuestion
        item={mockItem}
        value={[]}
        onChange={onChange}
        disabled
      />
    );
    const upButtons = screen.getAllByRole('button', { name: /Move .+ up/ });
    const downButtons = screen.getAllByRole('button', { name: /Move .+ down/ });
    [...upButtons, ...downButtons].forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('keyboard move does not call onChange when disabled', () => {
    render(
      <DragOrderQuestion
        item={mockItem}
        value={[]}
        onChange={onChange}
        disabled
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Move Hypothesize down' }));
    expect(onChangeMock).not.toHaveBeenCalled();
  });
});
