import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/button', () => ({
  Button: (props: Record<string, unknown>) => <button {...props} />,
}));

import { PipelineExportButton, PipelinePrintStylesheet } from './PipelinePrintStyles';

describe('PipelineExportButton', () => {
  it('renders with Hebrew label', () => {
    render(<PipelineExportButton lessonTitle="Test" hasResults={true} />);
    expect(screen.getByTestId('export-pdf-btn')).toHaveTextContent('ייצוא PDF');
  });

  it('is disabled when no results', () => {
    render(<PipelineExportButton lessonTitle="Test" hasResults={false} />);
    expect(screen.getByTestId('export-pdf-btn')).toBeDisabled();
  });

  it('is enabled when results exist', () => {
    render(<PipelineExportButton lessonTitle="Test" hasResults={true} />);
    expect(screen.getByTestId('export-pdf-btn')).not.toBeDisabled();
  });

  it('calls window.print() on click', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(<PipelineExportButton lessonTitle="Lesson 1" hasResults={true} />);
    fireEvent.click(screen.getByTestId('export-pdf-btn'));
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it('sets document title during print', () => {
    const originalTitle = document.title;
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {
      // During print, title should be set
      expect(document.title).toBe('Pipeline — My Lesson');
    });
    render(<PipelineExportButton lessonTitle="My Lesson" hasResults={true} />);
    fireEvent.click(screen.getByTestId('export-pdf-btn'));
    // After print, title should be restored
    expect(document.title).toBe(originalTitle);
    printSpy.mockRestore();
  });
});

describe('PipelinePrintStylesheet', () => {
  it('renders a style element with @media print rules', () => {
    const { container } = render(<PipelinePrintStylesheet />);
    const style = container.querySelector('style');
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain('@media print');
    expect(style?.textContent).toContain('display: none');
  });

  it('includes print header visibility rule', () => {
    const { container } = render(<PipelinePrintStylesheet />);
    const style = container.querySelector('style');
    expect(style?.textContent).toContain('print-header');
  });
});
