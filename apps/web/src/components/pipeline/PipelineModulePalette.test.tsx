import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/lesson-pipeline.store', () => ({
  MODULE_LABELS: {
    INGESTION: { en: 'Ingestion', he: 'איסוף חומרים' },
    ASR: { en: 'Transcription (ASR)', he: 'תמלול' },
    NER_SOURCE_LINKING: {
      en: 'NER + Source Linking',
      he: 'זיהוי ישויות ומקורות',
    },
    CONTENT_CLEANING: { en: 'Content Cleaning', he: 'ניקוי תוכן' },
    SUMMARIZATION: { en: 'Summarization', he: 'סיכום' },
    STRUCTURED_NOTES: { en: 'Structured Notes', he: 'תיעוד מובנה' },
    DIAGRAM_GENERATOR: { en: 'Diagram Generator', he: 'יצירת תרשימים' },
    CITATION_VERIFIER: { en: 'Citation Verifier', he: 'אימות ציטוטים' },
    QA_GATE: { en: 'QA Gate', he: 'בקרת איכות' },
    PUBLISH_SHARE: { en: 'Publish & Share', he: 'יצוא והפצה' },
  },
}));

vi.mock('@/components/ui/button', () => ({
  Button: (props: Record<string, unknown>) => <button {...props} />,
}));

import { PipelineModulePalette } from './PipelineModulePalette';

describe('PipelineModulePalette', () => {
  it('renders all 10 module buttons in desktop sidebar', () => {
    render(<PipelineModulePalette onAddModule={vi.fn()} />);
    expect(screen.getByTestId('palette-module-INGESTION')).toBeInTheDocument();
    expect(
      screen.getByTestId('palette-module-PUBLISH_SHARE')
    ).toBeInTheDocument();
  });

  it('calls onAddModule when a module is clicked', () => {
    const onAdd = vi.fn();
    render(<PipelineModulePalette onAddModule={onAdd} />);
    fireEvent.click(screen.getByTestId('palette-module-ASR'));
    expect(onAdd).toHaveBeenCalledWith('ASR');
  });

  it('renders Hebrew labels', () => {
    render(<PipelineModulePalette onAddModule={vi.fn()} />);
    expect(screen.getByText('איסוף חומרים')).toBeInTheDocument();
    expect(screen.getByText('תמלול')).toBeInTheDocument();
  });

  it('renders mobile toggle button', () => {
    render(<PipelineModulePalette onAddModule={vi.fn()} />);
    expect(screen.getByTestId('mobile-palette-toggle')).toBeInTheDocument();
  });

  it('opens mobile sheet when toggle is clicked', () => {
    render(<PipelineModulePalette onAddModule={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mobile-palette-toggle'));
    expect(screen.getByTestId('mobile-palette-sheet')).toBeInTheDocument();
  });

  it('closes mobile sheet via backdrop click', () => {
    render(<PipelineModulePalette onAddModule={vi.fn()} />);
    fireEvent.click(screen.getByTestId('mobile-palette-toggle'));
    expect(screen.getByTestId('mobile-palette-sheet')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mobile-palette-backdrop'));
    expect(
      screen.queryByTestId('mobile-palette-sheet')
    ).not.toBeInTheDocument();
  });

  it('each module button has min 44px touch target', () => {
    render(<PipelineModulePalette onAddModule={vi.fn()} />);
    const btn = screen.getByTestId('palette-module-INGESTION');
    expect(btn.className).toContain('min-h-[44px]');
  });

  it('module buttons are draggable', () => {
    render(<PipelineModulePalette onAddModule={vi.fn()} />);
    const btn = screen.getByTestId('palette-module-INGESTION');
    expect(btn).toHaveAttribute('draggable', 'true');
  });
});
