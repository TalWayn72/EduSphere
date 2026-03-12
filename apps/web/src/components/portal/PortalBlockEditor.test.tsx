/**
 * PortalBlockEditor — Phase 63 unit tests
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PortalBlockEditor, type PortalConfig } from './PortalBlockEditor';

// @dnd-kit requires PointerEvent in jsdom
if (typeof PointerEvent === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type: string, init?: PointerEventInit) {
      super(type, init);
    }
  };
}

const emptyConfig: PortalConfig = { blocks: [] };

describe('PortalBlockEditor', () => {
  it('renders "Add blocks" palette with all 5 block type buttons', () => {
    render(
      <PortalBlockEditor value={emptyConfig} onChange={vi.fn()} />
    );

    expect(
      screen.getByRole('button', { name: /Add Hero Banner block/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Add Featured Courses block/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Add Features Grid block/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Add Call to Action block/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Add Testimonials block/i })
    ).toBeInTheDocument();
  });

  it('renders empty state message when no blocks', () => {
    render(
      <PortalBlockEditor value={emptyConfig} onChange={vi.fn()} />
    );

    expect(
      screen.getByText(/Add blocks from the palette above to build your portal/i)
    ).toBeInTheDocument();
  });

  it('addBlock appends a block to the list', () => {
    const onChange = vi.fn();
    render(
      <PortalBlockEditor value={emptyConfig} onChange={onChange} />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Add Hero Banner block/i })
    );

    expect(onChange).toHaveBeenCalledOnce();
    const newConfig = onChange.mock.calls[0][0] as PortalConfig;
    expect(newConfig.blocks).toHaveLength(1);
    expect(newConfig.blocks[0].type).toBe('hero');
  });

  it('removeBlock removes a block from the list', () => {
    const onChange = vi.fn();
    const configWithBlock: PortalConfig = {
      blocks: [
        { id: 'block-1', type: 'hero', props: { title: 'Welcome' } },
      ],
    };

    render(
      <PortalBlockEditor value={configWithBlock} onChange={onChange} />
    );

    // The block container with testid should be present
    expect(screen.getByTestId('block-block-1')).toBeInTheDocument();

    // Click the remove button
    fireEvent.click(
      screen.getByRole('button', { name: /Remove Hero Banner/i })
    );

    expect(onChange).toHaveBeenCalledOnce();
    const newConfig = onChange.mock.calls[0][0] as PortalConfig;
    expect(newConfig.blocks).toHaveLength(0);
  });
});
