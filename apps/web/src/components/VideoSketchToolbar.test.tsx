import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('lucide-react', () => ({
  Pencil: () => <span>Pencil</span>,
  Eraser: () => <span>Eraser</span>,
  Square: () => <span>Square</span>,
  ArrowUpRight: () => <span>Arrow</span>,
  Circle: () => <span>Circle</span>,
  Type: () => <span>Type</span>,
  Trash2: () => <span>Trash</span>,
  Check: () => <span>Check</span>,
  X: () => <span>X</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import { VideoSketchToolbar } from './VideoSketchToolbar';

describe('VideoSketchToolbar', () => {
  const defaultProps = {
    tool: 'freehand' as const,
    color: '#ff0000',
    saving: false,
    onToolChange: vi.fn(),
    onColorChange: vi.fn(),
    onClear: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders toolbar container', () => {
    render(<VideoSketchToolbar {...defaultProps} />);
    expect(screen.getByTestId('sketch-toolbar')).toBeInTheDocument();
  });

  it('renders all 6 tool buttons', () => {
    render(<VideoSketchToolbar {...defaultProps} />);
    expect(screen.getByTestId('sketch-tool-freehand')).toBeInTheDocument();
    expect(screen.getByTestId('sketch-tool-eraser')).toBeInTheDocument();
    expect(screen.getByTestId('sketch-tool-rect')).toBeInTheDocument();
    expect(screen.getByTestId('sketch-tool-arrow')).toBeInTheDocument();
    expect(screen.getByTestId('sketch-tool-ellipse')).toBeInTheDocument();
    expect(screen.getByTestId('sketch-tool-text')).toBeInTheDocument();
  });

  it('active tool has aria-pressed=true', () => {
    render(<VideoSketchToolbar {...defaultProps} tool="eraser" />);
    expect(screen.getByTestId('sketch-tool-eraser')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('sketch-tool-freehand')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('calls onToolChange when tool clicked', () => {
    render(<VideoSketchToolbar {...defaultProps} />);
    fireEvent.click(screen.getByTestId('sketch-tool-rect'));
    expect(defaultProps.onToolChange).toHaveBeenCalledWith('rect');
  });

  it('renders color picker', () => {
    render(<VideoSketchToolbar {...defaultProps} />);
    expect(screen.getByTestId('sketch-color-picker')).toBeInTheDocument();
  });

  it('color swatch shows current color', () => {
    render(<VideoSketchToolbar {...defaultProps} color="#00ff00" />);
    expect(screen.getByTestId('sketch-color-swatch')).toHaveStyle({
      backgroundColor: '#00ff00',
    });
  });

  it('calls onColorChange when color changed', () => {
    render(<VideoSketchToolbar {...defaultProps} />);
    fireEvent.change(screen.getByTestId('sketch-color-picker'), {
      target: { value: '#0000ff' },
    });
    expect(defaultProps.onColorChange).toHaveBeenCalledWith('#0000ff');
  });

  it('save button shows Save text', () => {
    render(<VideoSketchToolbar {...defaultProps} />);
    expect(screen.getByTestId('sketch-save-btn')).toHaveTextContent('Save');
  });

  it('save button shows Saving text when saving', () => {
    render(<VideoSketchToolbar {...defaultProps} saving={true} />);
    expect(screen.getByTestId('sketch-save-btn')).toHaveTextContent('Saving…');
  });

  it('calls onSave when save clicked', () => {
    render(<VideoSketchToolbar {...defaultProps} />);
    fireEvent.click(screen.getByTestId('sketch-save-btn'));
    expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel clicked', () => {
    render(<VideoSketchToolbar {...defaultProps} />);
    fireEvent.click(screen.getByTestId('sketch-cancel-btn'));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('clear button calls onClear', () => {
    render(<VideoSketchToolbar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Clear sketch'));
    expect(defaultProps.onClear).toHaveBeenCalledTimes(1);
  });

  it('clear button disabled when saving', () => {
    render(<VideoSketchToolbar {...defaultProps} saving={true} />);
    expect(screen.getByLabelText('Clear sketch')).toBeDisabled();
  });
});
