/**
 * Tests for PdfToolbar component.
 * Validates: page navigation, zoom controls, fit modes, ARIA labels, disabled states.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PdfToolbar } from './PdfToolbar';

describe('PdfToolbar', () => {
  const defaultProps = {
    pageNum: 1,
    totalPages: 10,
    scale: 1.0,
    zoomMode: 'fit-width' as const,
    onPrevPage: vi.fn(),
    onNextPage: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onFitWidth: vi.fn(),
    onFitPage: vi.fn(),
  };

  it('renders with proper toolbar role and aria-label', () => {
    render(<PdfToolbar {...defaultProps} />);
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveAttribute('aria-label', 'PDF controls');
  });

  it('shows current page number and total', () => {
    render(<PdfToolbar {...defaultProps} pageNum={3} totalPages={15} />);
    expect(screen.getByText('3 / 15')).toBeInTheDocument();
  });

  it('renders Previous page button with aria-label', () => {
    render(<PdfToolbar {...defaultProps} />);
    const prevBtn = screen.getByRole('button', { name: 'Previous page' });
    expect(prevBtn).toBeInTheDocument();
  });

  it('renders Next page button with aria-label', () => {
    render(<PdfToolbar {...defaultProps} />);
    const nextBtn = screen.getByRole('button', { name: 'Next page' });
    expect(nextBtn).toBeInTheDocument();
  });

  it('disables Previous page button on first page', () => {
    render(<PdfToolbar {...defaultProps} pageNum={1} />);
    expect(
      screen.getByRole('button', { name: 'Previous page' })
    ).toBeDisabled();
  });

  it('enables Previous page button when not on first page', () => {
    render(<PdfToolbar {...defaultProps} pageNum={5} />);
    expect(
      screen.getByRole('button', { name: 'Previous page' })
    ).not.toBeDisabled();
  });

  it('disables Next page button on last page', () => {
    render(<PdfToolbar {...defaultProps} pageNum={10} totalPages={10} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('enables Next page button when not on last page', () => {
    render(<PdfToolbar {...defaultProps} pageNum={5} totalPages={10} />);
    expect(
      screen.getByRole('button', { name: 'Next page' })
    ).not.toBeDisabled();
  });

  it('calls onPrevPage when Previous page is clicked', () => {
    const onPrevPage = vi.fn();
    render(
      <PdfToolbar {...defaultProps} pageNum={5} onPrevPage={onPrevPage} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPrevPage).toHaveBeenCalledTimes(1);
  });

  it('calls onNextPage when Next page is clicked', () => {
    const onNextPage = vi.fn();
    render(
      <PdfToolbar {...defaultProps} pageNum={5} onNextPage={onNextPage} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onNextPage).toHaveBeenCalledTimes(1);
  });

  it('renders Zoom in button with aria-label', () => {
    render(<PdfToolbar {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
  });

  it('renders Zoom out button with aria-label', () => {
    render(<PdfToolbar {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: 'Zoom out' })
    ).toBeInTheDocument();
  });

  it('calls onZoomIn when Zoom in is clicked', () => {
    const onZoomIn = vi.fn();
    render(<PdfToolbar {...defaultProps} onZoomIn={onZoomIn} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(onZoomIn).toHaveBeenCalledTimes(1);
  });

  it('calls onZoomOut when Zoom out is clicked', () => {
    const onZoomOut = vi.fn();
    render(<PdfToolbar {...defaultProps} onZoomOut={onZoomOut} />);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(onZoomOut).toHaveBeenCalledTimes(1);
  });

  it('displays the current zoom scale as percentage', () => {
    render(<PdfToolbar {...defaultProps} scale={1.5} />);
    expect(screen.getByText('150%')).toBeInTheDocument();
  });

  it('displays 100% for scale 1.0', () => {
    render(<PdfToolbar {...defaultProps} scale={1.0} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('rounds zoom percentage correctly', () => {
    render(<PdfToolbar {...defaultProps} scale={0.75} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('renders Fit width button with aria-label', () => {
    render(<PdfToolbar {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: 'Fit width' })
    ).toBeInTheDocument();
  });

  it('renders Fit page button with aria-label', () => {
    render(<PdfToolbar {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: 'Fit page' })
    ).toBeInTheDocument();
  });

  it('calls onFitWidth when Fit width is clicked', () => {
    const onFitWidth = vi.fn();
    render(<PdfToolbar {...defaultProps} onFitWidth={onFitWidth} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fit width' }));
    expect(onFitWidth).toHaveBeenCalledTimes(1);
  });

  it('calls onFitPage when Fit page is clicked', () => {
    const onFitPage = vi.fn();
    render(<PdfToolbar {...defaultProps} onFitPage={onFitPage} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fit page' }));
    expect(onFitPage).toHaveBeenCalledTimes(1);
  });

  it('highlights Fit width button when zoomMode is fit-width', () => {
    render(<PdfToolbar {...defaultProps} zoomMode="fit-width" />);
    const btn = screen.getByRole('button', { name: 'Fit width' });
    const classes = btn.className.split(/\s+/);
    expect(classes).toContain('bg-accent');
  });

  it('highlights Fit page button when zoomMode is fit-page', () => {
    render(<PdfToolbar {...defaultProps} zoomMode="fit-page" />);
    const btn = screen.getByRole('button', { name: 'Fit page' });
    const classes = btn.className.split(/\s+/);
    expect(classes).toContain('bg-accent');
  });

  it('does not highlight fit buttons when zoomMode is custom', () => {
    render(<PdfToolbar {...defaultProps} zoomMode="custom" />);
    const fitWidthBtn = screen.getByRole('button', { name: 'Fit width' });
    const fitPageBtn = screen.getByRole('button', { name: 'Fit page' });
    // The ghost variant has `hover:bg-accent` by default, so we check for
    // the standalone `bg-accent` class (space-delimited) applied by cn()
    // when the mode is active. When custom, neither button gets the extra class.
    const fitWidthClasses = fitWidthBtn.className.split(/\s+/);
    const fitPageClasses = fitPageBtn.className.split(/\s+/);
    expect(fitWidthClasses).not.toContain('bg-accent');
    expect(fitPageClasses).not.toContain('bg-accent');
  });

  it('page counter has aria-live=polite for screen readers', () => {
    render(<PdfToolbar {...defaultProps} />);
    const counter = screen.getByText('1 / 10');
    expect(counter).toHaveAttribute('aria-live', 'polite');
  });
});

describe('PdfToolbar — Accessibility', () => {
  const defaultProps = {
    pageNum: 1,
    totalPages: 10,
    scale: 1.0,
    zoomMode: 'fit-width' as const,
    onPrevPage: vi.fn(),
    onNextPage: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onFitWidth: vi.fn(),
    onFitPage: vi.fn(),
  };

  it('zoom percentage has role="status" for live announcements', () => {
    render(<PdfToolbar {...defaultProps} />);
    const zoomStatus = screen.getByRole('status');
    expect(zoomStatus).toHaveTextContent('100%');
  });

  it('zoom percentage has aria-atomic="true" so full value is announced', () => {
    render(<PdfToolbar {...defaultProps} />);
    const zoomStatus = screen.getByRole('status');
    expect(zoomStatus).toHaveAttribute('aria-atomic', 'true');
  });

  it('zoom percentage has aria-live="polite"', () => {
    render(<PdfToolbar {...defaultProps} />);
    const zoomStatus = screen.getByRole('status');
    expect(zoomStatus).toHaveAttribute('aria-live', 'polite');
  });

  it('fit-width button has aria-pressed reflecting zoom mode', () => {
    render(<PdfToolbar {...defaultProps} zoomMode="fit-width" />);
    expect(screen.getByRole('button', { name: 'Fit width' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Fit page' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('fit-page button has aria-pressed reflecting zoom mode', () => {
    render(<PdfToolbar {...defaultProps} zoomMode="fit-page" />);
    expect(screen.getByRole('button', { name: 'Fit page' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Fit width' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('neither fit button pressed when zoomMode is custom', () => {
    render(<PdfToolbar {...defaultProps} zoomMode="custom" />);
    expect(screen.getByRole('button', { name: 'Fit width' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Fit page' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('all navigation buttons have accessible labels', () => {
    render(<PdfToolbar {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: 'Previous page' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Next page' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Zoom out' })
    ).toBeInTheDocument();
  });
});
