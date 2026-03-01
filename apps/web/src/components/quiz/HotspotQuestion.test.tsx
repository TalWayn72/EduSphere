import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HotspotQuestion } from './HotspotQuestion';
import type { Hotspot } from '@/types/quiz';

const mockItem: Hotspot = {
  type: 'HOTSPOT',
  question: 'Click on the heart in the diagram',
  imageUrl: 'https://example.com/anatomy.png',
  hotspots: [
    { id: 'heart', x: 50, y: 40, radius: 8, label: 'Heart' },
    { id: 'lung', x: 30, y: 45, radius: 7, label: 'Lung' },
    { id: 'liver', x: 55, y: 60, radius: 6, label: 'Liver' },
  ],
  correctHotspotIds: ['heart'],
};

describe('HotspotQuestion', () => {
  let onChange: (value: string[]) => void;

  beforeEach(() => {
    onChange = vi.fn() as unknown as (value: string[]) => void;
  });

  it('renders the question text', () => {
    render(<HotspotQuestion item={mockItem} value={[]} onChange={onChange} />);
    expect(screen.getByText('Click on the heart in the diagram')).toBeInTheDocument();
  });

  it('renders the instruction hint', () => {
    render(<HotspotQuestion item={mockItem} value={[]} onChange={onChange} />);
    expect(screen.getByText('Click on the correct area(s) in the image')).toBeInTheDocument();
  });

  it('renders the image with alt text', () => {
    render(<HotspotQuestion item={mockItem} value={[]} onChange={onChange} />);
    expect(screen.getByAltText('Hotspot image')).toBeInTheDocument();
  });

  it('renders all hotspot circles as buttons', () => {
    render(<HotspotQuestion item={mockItem} value={[]} onChange={onChange} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('hotspot buttons have correct aria-labels', () => {
    render(<HotspotQuestion item={mockItem} value={[]} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Heart' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lung' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Liver' })).toBeInTheDocument();
  });

  it('unselected hotspots have aria-pressed="false"', () => {
    render(<HotspotQuestion item={mockItem} value={[]} onChange={onChange} />);
    const heartBtn = screen.getByRole('button', { name: 'Heart' });
    expect(heartBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('selected hotspots have aria-pressed="true"', () => {
    render(<HotspotQuestion item={mockItem} value={['heart']} onChange={onChange} />);
    const heartBtn = screen.getByRole('button', { name: 'Heart' });
    expect(heartBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onChange with added id when an unselected hotspot is clicked', () => {
    render(<HotspotQuestion item={mockItem} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Heart' }));
    expect(onChange).toHaveBeenCalledWith(['heart']);
  });

  it('calls onChange with removed id when a selected hotspot is clicked', () => {
    render(<HotspotQuestion item={mockItem} value={['heart']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Heart' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('calls onChange with multiple ids when several hotspots selected', () => {
    render(<HotspotQuestion item={mockItem} value={['heart']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lung' }));
    expect(onChange).toHaveBeenCalledWith(['heart', 'lung']);
  });

  it('does not call onChange when disabled', () => {
    render(<HotspotQuestion item={mockItem} value={[]} onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole('button', { name: 'Heart' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows label text for selected hotspot', () => {
    render(<HotspotQuestion item={mockItem} value={['heart']} onChange={onChange} />);
    // The <text> SVG element for the selected label should be in the document
    expect(screen.getByText('Heart')).toBeInTheDocument();
  });

  it('SVG overlay has aria-label', () => {
    render(<HotspotQuestion item={mockItem} value={[]} onChange={onChange} />);
    expect(screen.getByLabelText('Hotspot overlay')).toBeInTheDocument();
  });
});
