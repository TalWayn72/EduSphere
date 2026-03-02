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
    const canvas = screen.getByRole('region', { name: /portal canvas$/i });
    fireEvent.drop(canvas, {
      dataTransfer: { getData: vi.fn(() => 'CTAButton') },
    });
    expect(onDrop).toHaveBeenCalledWith('CTAButton');
  });

  it('canvas region has accessible label when blocks exist', () => {
    render(<CanvasDropZone {...defaultProps} blocks={MOCK_BLOCKS} />);
    expect(
      screen.getByRole('region', { name: /^Portal canvas$/i })
    ).toBeInTheDocument();
  });
});
