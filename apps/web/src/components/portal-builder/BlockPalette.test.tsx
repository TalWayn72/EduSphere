import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BlockPalette } from './BlockPalette';

describe('BlockPalette', () => {
  it('renders the "Block Types" section heading', () => {
    render(<BlockPalette />);
    expect(screen.getByText('Block Types')).toBeInTheDocument();
  });

  it('renders all 6 palette item labels', () => {
    render(<BlockPalette />);
    expect(screen.getByText('Hero Banner')).toBeInTheDocument();
    expect(screen.getByText('Featured Courses')).toBeInTheDocument();
    expect(screen.getByText('Stat Widget')).toBeInTheDocument();
    expect(screen.getByText('Text Block')).toBeInTheDocument();
    expect(screen.getByText('Image Block')).toBeInTheDocument();
    expect(screen.getByText('CTA Button')).toBeInTheDocument();
  });

  it('renders 6 draggable items', () => {
    render(<BlockPalette />);
    const items = screen
      .getAllByRole('generic')
      .filter((el) => el.getAttribute('draggable') === 'true');
    expect(items).toHaveLength(6);
  });

  it('each item has an aria-label following "Drag to add X" pattern', () => {
    render(<BlockPalette />);
    expect(
      screen.getByLabelText('Drag to add Hero Banner')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Drag to add Featured Courses')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Drag to add CTA Button')).toBeInTheDocument();
  });

  it('calls onDragStart with correct block type on dragstart', () => {
    const onDragStart = vi.fn();
    render(<BlockPalette onDragStart={onDragStart} />);
    const heroBanner = screen.getByLabelText('Drag to add Hero Banner');
    fireEvent.dragStart(heroBanner, {
      dataTransfer: { setData: vi.fn(), effectAllowed: '' },
    });
    expect(onDragStart).toHaveBeenCalledWith('HeroBanner');
  });

  it('does not throw when onDragStart is not provided', () => {
    render(<BlockPalette />);
    const textBlock = screen.getByLabelText('Drag to add Text Block');
    expect(() =>
      fireEvent.dragStart(textBlock, {
        dataTransfer: { setData: vi.fn(), effectAllowed: '' },
      })
    ).not.toThrow();
  });

  it('renders block descriptions', () => {
    render(<BlockPalette />);
    expect(screen.getByText('Full-width header with CTA')).toBeInTheDocument();
    expect(screen.getByText('Rich text content')).toBeInTheDocument();
  });
});
