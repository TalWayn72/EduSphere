import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LayerToggleBar } from './LayerToggleBar';
import { AnnotationLayer } from '@/types/annotations';

const defaultProps = {
  activeLayers: [AnnotationLayer.PERSONAL, AnnotationLayer.SHARED],
  onToggle: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LayerToggleBar', () => {
  it('renders the group with correct aria-label', () => {
    render(<LayerToggleBar {...defaultProps} />);
    expect(
      screen.getByRole('group', { name: /annotation layer visibility toggles/i })
    ).toBeInTheDocument();
  });

  it('renders all 4 layer buttons', () => {
    render(<LayerToggleBar {...defaultProps} />);
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('shows label text for each layer', () => {
    render(<LayerToggleBar {...defaultProps} />);
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Shared')).toBeInTheDocument();
    expect(screen.getByText('Instructor')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('active layers have aria-pressed=true', () => {
    render(<LayerToggleBar {...defaultProps} />);
    const personalBtn = screen.getByRole('button', {
      name: /hide personal annotations/i,
    });
    expect(personalBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('inactive layers have aria-pressed=false', () => {
    render(<LayerToggleBar {...defaultProps} />);
    const instructorBtn = screen.getByRole('button', {
      name: /show instructor annotations/i,
    });
    expect(instructorBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('active layer aria-label starts with "Hide"', () => {
    render(<LayerToggleBar {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /hide personal annotations/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /hide shared annotations/i })
    ).toBeInTheDocument();
  });

  it('inactive layer aria-label starts with "Show"', () => {
    render(<LayerToggleBar {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /show instructor annotations/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /show ai annotations/i })
    ).toBeInTheDocument();
  });

  it('calls onToggle with the correct layer when a button is clicked', () => {
    const onToggle = vi.fn();
    render(<LayerToggleBar {...defaultProps} onToggle={onToggle} />);
    fireEvent.click(
      screen.getByRole('button', { name: /show instructor annotations/i })
    );
    expect(onToggle).toHaveBeenCalledWith(AnnotationLayer.INSTRUCTOR);
  });

  it('calls onToggle for an active layer when clicked (toggle off)', () => {
    const onToggle = vi.fn();
    render(<LayerToggleBar {...defaultProps} onToggle={onToggle} />);
    fireEvent.click(
      screen.getByRole('button', { name: /hide personal annotations/i })
    );
    expect(onToggle).toHaveBeenCalledWith(AnnotationLayer.PERSONAL);
  });

  it('shows count badge when counts prop is provided', () => {
    render(
      <LayerToggleBar
        {...defaultProps}
        counts={{ [AnnotationLayer.PERSONAL]: 5, [AnnotationLayer.SHARED]: 12 }}
      />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('does not render count badge when counts prop is omitted', () => {
    render(<LayerToggleBar {...defaultProps} />);
    // No standalone number nodes should appear beyond the layer labels
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  it('renders correctly when no layers are active', () => {
    render(<LayerToggleBar activeLayers={[]} onToggle={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
