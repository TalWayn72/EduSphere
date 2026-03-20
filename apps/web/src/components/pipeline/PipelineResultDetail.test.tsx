/**
 * PipelineResultDetail unit tests — Phase 65.
 *
 * Tests: 4 tabs, copy-to-clipboard, QA score donut SVG, raw JSON tab,
 * dialog close on escape, loading skeleton.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

let onOpenChangeHandler: ((v: boolean) => void) | undefined;

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: { children: React.ReactNode; open: boolean; onOpenChange?: (v: boolean) => void }) => {
    onOpenChangeHandler = onOpenChange;
    return open ? <div data-testid="mock-dialog">{children}</div> : null;
  },
  DialogContent: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => (
    <h2 {...props}>{children}</h2>
  ),
  DialogDescription: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p {...props}>{children}</p>
  ),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue, ...props }: { children: React.ReactNode; defaultValue: string; [k: string]: unknown }) => (
    <div data-testid="tabs" data-default={defaultValue} {...props}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value, ...props }: { children: React.ReactNode; value: string; [k: string]: unknown }) => (
    <button data-tab-value={value} {...props}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

import { PipelineResultDetail } from './PipelineResultDetail';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FULL_RESULT = {
  id: 'result-1',
  moduleName: 'SUMMARIZATION',
  outputType: 'MARKDOWN',
  outputData: {
    shortSummary: 'This is a summary of the lesson content.',
    outputMarkdown: '# Full markdown content',
    mermaidSvg: '<svg><circle cx="50" cy="50" r="40"/></svg>',
    qaScore: 85,
  },
  fileUrl: null,
};

const RESULT_NO_DIAGRAM_NO_QA = {
  id: 'result-2',
  moduleName: 'ASR',
  outputType: 'TEXT',
  outputData: {
    shortSummary: 'Transcription output',
  },
  fileUrl: null,
};

const defaultProps = {
  open: true,
  onClose: vi.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PipelineResultDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders 4 tabs when result has diagram and QA score', () => {
    render(
      <PipelineResultDetail result={FULL_RESULT} {...defaultProps} />
    );

    expect(screen.getByTestId('tab-summary')).toBeInTheDocument();
    expect(screen.getByTestId('tab-diagram')).toBeInTheDocument();
    expect(screen.getByTestId('tab-qa')).toBeInTheDocument();
    expect(screen.getByTestId('tab-raw')).toBeInTheDocument();
  });

  it('hides diagram tab when no mermaidSvg', () => {
    render(
      <PipelineResultDetail result={RESULT_NO_DIAGRAM_NO_QA} {...defaultProps} />
    );

    expect(screen.getByTestId('tab-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('tab-diagram')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-qa')).not.toBeInTheDocument();
    expect(screen.getByTestId('tab-raw')).toBeInTheDocument();
  });

  it('shows module name as dialog title', () => {
    render(
      <PipelineResultDetail result={FULL_RESULT} {...defaultProps} />
    );

    expect(screen.getByTestId('result-detail-title')).toHaveTextContent('SUMMARIZATION');
  });

  it('copy-to-clipboard button works on summary tab', async () => {
    render(
      <PipelineResultDetail result={FULL_RESULT} {...defaultProps} />
    );

    const copyBtn = screen.getByTestId('copy-summary-btn');
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'This is a summary of the lesson content.'
    );
  });

  it('copy button text changes to "הועתק!" after click', async () => {
    render(
      <PipelineResultDetail result={FULL_RESULT} {...defaultProps} />
    );

    const copyBtn = screen.getByTestId('copy-summary-btn');
    expect(copyBtn).toHaveTextContent('העתק');

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(copyBtn).toHaveTextContent('הועתק!');
  });

  it('QA score renders donut SVG', () => {
    render(
      <PipelineResultDetail result={FULL_RESULT} {...defaultProps} />
    );

    const donut = screen.getByTestId('qa-score-donut');
    expect(donut).toBeInTheDocument();
    const svg = donut.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(donut.textContent).toContain('85%');
    expect(donut.textContent).toContain('ציון איכות');
  });

  it('QA score donut uses green color for score >= 80', () => {
    render(
      <PipelineResultDetail result={FULL_RESULT} {...defaultProps} />
    );

    const scoreText = screen.getByText('85%');
    expect(scoreText.style.color).toBe('rgb(34, 197, 94)'); // #22c55e
  });

  it('Raw JSON tab shows formatted output', () => {
    render(
      <PipelineResultDetail result={FULL_RESULT} {...defaultProps} />
    );

    const rawJson = screen.getByTestId('raw-json');
    expect(rawJson).toBeInTheDocument();
    // Should contain formatted JSON
    expect(rawJson.textContent).toContain('"shortSummary"');
    expect(rawJson.textContent).toContain('"qaScore"');
  });

  it('copy JSON button copies raw JSON', async () => {
    render(
      <PipelineResultDetail result={FULL_RESULT} {...defaultProps} />
    );

    const copyJsonBtn = screen.getByTestId('copy-json-btn');
    await act(async () => {
      fireEvent.click(copyJsonBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      JSON.stringify(FULL_RESULT.outputData, null, 2)
    );
  });

  it('dialog close triggers onClose callback', () => {
    const onClose = vi.fn();
    render(
      <PipelineResultDetail result={FULL_RESULT} open={true} onClose={onClose} />
    );

    // Simulate dialog close via onOpenChange(false)
    expect(onOpenChangeHandler).toBeDefined();
    act(() => {
      onOpenChangeHandler?.(false);
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading skeleton when isLoading', () => {
    render(
      <PipelineResultDetail result={null} open={true} onClose={vi.fn()} isLoading={true} />
    );

    expect(screen.getByTestId('result-detail-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('tabs')).not.toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <PipelineResultDetail result={FULL_RESULT} open={false} onClose={vi.fn()} />
    );

    expect(screen.queryByTestId('mock-dialog')).not.toBeInTheDocument();
  });

  it('shows fallback title when result is null', () => {
    render(
      <PipelineResultDetail result={null} open={true} onClose={vi.fn()} />
    );

    expect(screen.getByTestId('result-detail-title')).toHaveTextContent('תוצאת מודול');
  });

  it('summary tab shows "אין סיכום זמין" when no summary data', () => {
    const emptyResult = {
      ...FULL_RESULT,
      outputData: {},
    };
    render(
      <PipelineResultDetail result={emptyResult} {...defaultProps} />
    );

    expect(screen.getByTestId('summary-content')).toHaveTextContent('אין סיכום זמין');
  });

  it('diagram tab renders SVG via dangerouslySetInnerHTML', () => {
    render(
      <PipelineResultDetail result={FULL_RESULT} {...defaultProps} />
    );

    const diagramContainer = screen.getByTestId('diagram-container');
    expect(diagramContainer.innerHTML).toContain('<svg>');
    expect(diagramContainer.innerHTML).toContain('<circle');
  });
});
