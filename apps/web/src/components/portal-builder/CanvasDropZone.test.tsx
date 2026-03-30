import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanvasDropZone } from './CanvasDropZone';
import type { PortalBlock } from './types';

vi.mock('./blocks/BlockRenderer', () => ({
  BlockRenderer: vi.fn(({ block }: { block: PortalBlock }) => (
    <div data-testid={`block-${block.type}`}>{block.type}</div>
  )),
}));

const MOCK_BLOCKS: PortalBlock[] = [
  { id: 'b1', type: 'HeroBanner', order: 0, config: {} },
  { id: 'b2', type: 'TextBlock', order: 1, config: {} },
];

const defaultProps = {
  blocks: [],
  onDrop: vi.fn(),
  onRemove: vi.fn(),
  onReorder: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CanvasDropZone', () => {
  it('shows empty drop zone when blocks is empty', () => {
    render(<CanvasDropZone {...defaultProps} />);
    expect(
      screen.getByText(/drag blocks here to build your portal/i)
    ).toBeInTheDocument();
  });

  it('empty zone has role="region" with accessible label', () => {
    render(<CanvasDropZone {...defaultProps} />);
    expect(
      screen.getByRole('region', { name: /portal canvas drop zone/i })
    ).toBeInTheDocument();
  });

  it('renders block items when blocks array is non-empty', () => {
    render(<CanvasDropZone {...defaultProps} blocks={MOCK_BLOCKS} />);
    expect(screen.getByTestId('block-HeroBanner')).toBeInTheDocument();
    expect(screen.getByTestId('block-TextBlock')).toBeInTheDocument();
  });

  it('renders remove button for each block', () => {
    render(<CanvasDropZone {...defaultProps} blocks={MOCK_BLOCKS} />);
    expect(
      screen.getByRole('button', { name: /remove HeroBanner block/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /remove TextBlock block/i })
    ).toBeInTheDocument();
  });

  it('calls onRemove with correct block id when remove button clicked', () => {
    const onRemove = vi.fn();
    render(
      <CanvasDropZone
        {...defaultProps}
        blocks={MOCK_BLOCKS}
        onRemove={onRemove}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: /remove HeroBanner block/i })
    );
    expect(onRemove).toHaveBeenCalledWith('b1');
  });

  it('calls onDrop when a palette blockType is dropped on empty zone', () => {
    const onDrop = vi.fn();
    render(<CanvasDropZone {...defaultProps} onDrop={onDrop} />);
    const zone = screen.getByRole('region', {
      name: /portal canvas drop zone/i,
    });
    fireEvent.drop(zone, {
      dataTransfer: { getData: vi.fn(() => 'StatWidget') },
    });
    expect(onDrop).toHaveBeenCalledWith('StatWidget');
  });

  it('calls onDrop when a palette blockType is dropped on canvas with existing blocks', () => {
    const onDrop = vi.fn();
    render(
      <CanvasDropZone {...defaultProps} blocks={MOCK_BLOCKS} onDrop={onDrop} />
    );
    const canvas = screen.getByRole('list', { name: /portal canvas$/i });
    fireEvent.drop(canvas, {
      dataTransfer: { getData: vi.fn(() => 'CTAButton') },
    });
    expect(onDrop).toHaveBeenCalledWith('CTAButton');
  });

  it('canvas list has accessible label when blocks exist', () => {
    render(<CanvasDropZone {...defaultProps} blocks={MOCK_BLOCKS} />);
    expect(
      screen.getByRole('list', { name: /^Portal canvas$/i })
    ).toBeInTheDocument();
  });

  // ── IS-5568 / WCAG 2.5.7 — Keyboard reorder buttons ────────────────────

  it('renders Move up and Move down buttons for each block', () => {
    render(<CanvasDropZone {...defaultProps} blocks={MOCK_BLOCKS} />);
    expect(
      screen.getByRole('button', { name: /move HeroBanner block up/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /move HeroBanner block down/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /move TextBlock block up/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /move TextBlock block down/i })
    ).toBeInTheDocument();
  });

  it('Move up is disabled on the first block', () => {
    render(<CanvasDropZone {...defaultProps} blocks={MOCK_BLOCKS} />);
    expect(
      screen.getByRole('button', { name: /move HeroBanner block up/i })
    ).toBeDisabled();
  });

  it('Move down is disabled on the last block', () => {
    render(<CanvasDropZone {...defaultProps} blocks={MOCK_BLOCKS} />);
    expect(
      screen.getByRole('button', { name: /move TextBlock block down/i })
    ).toBeDisabled();
  });

  it('clicking Move down calls onReorder with correct indices', () => {
    const onReorder = vi.fn();
    render(
      <CanvasDropZone {...defaultProps} blocks={MOCK_BLOCKS} onReorder={onReorder} />
    );
    fireEvent.click(
      screen.getByRole('button', { name: /move HeroBanner block down/i })
    );
    expect(onReorder).toHaveBeenCalledWith(0, 1);
  });

  it('clicking Move up calls onReorder with correct indices', () => {
    const onReorder = vi.fn();
    render(
      <CanvasDropZone {...defaultProps} blocks={MOCK_BLOCKS} onReorder={onReorder} />
    );
    fireEvent.click(
      screen.getByRole('button', { name: /move TextBlock block up/i })
    );
    expect(onReorder).toHaveBeenCalledWith(1, 0);
  });

  it('renders sr-only keyboard instruction', () => {
    render(<CanvasDropZone {...defaultProps} blocks={MOCK_BLOCKS} />);
    expect(
      screen.getByText(/keyboard users: use the up and down buttons/i)
    ).toBeInTheDocument();
  });
});
