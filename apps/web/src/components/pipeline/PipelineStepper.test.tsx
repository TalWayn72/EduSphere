/**
 * PipelineStepper unit tests — Phase 65.
 *
 * Tests: step rendering, status icons, aria attributes, retry/skip buttons,
 * expandable details, reduced-motion handling.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/lib/lesson-pipeline.store', () => ({
  MODULE_LABELS: {
    INGESTION: { en: 'Ingestion', he: 'איסוף חומרים' },
    ASR: { en: 'Transcription (ASR)', he: 'תמלול' },
    SUMMARIZATION: { en: 'Summarization', he: 'סיכום' },
    QA_GATE: { en: 'QA Gate', he: 'בקרת איכות' },
    PUBLISH_SHARE: { en: 'Publish & Share', he: 'יצוא והפצה' },
  },
}));

import { PipelineStepper } from './PipelineStepper';
import type { ModuleStatusValue } from '@/lib/lesson-pipeline.store';

// ── Helpers ───────────────────────────────────────────────────────────────────

type StepData = {
  moduleType: string;
  status: ModuleStatusValue;
  errorMessage?: string | null;
  output?: string | null;
};

function makeSteps(statuses: Record<string, ModuleStatusValue>): StepData[] {
  return Object.entries(statuses).map(([moduleType, status]) => ({
    moduleType,
    status,
    errorMessage: status === 'failed' ? `Error in ${moduleType}` : null,
    output: status === 'done' ? `Output for ${moduleType}` : null,
  }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PipelineStepper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all module steps', () => {
    const steps = makeSteps({
      INGESTION: 'pending',
      ASR: 'pending',
      SUMMARIZATION: 'pending',
    });
    render(<PipelineStepper steps={steps} />);

    expect(screen.getByTestId('stepper-step-INGESTION')).toBeInTheDocument();
    expect(screen.getByTestId('stepper-step-ASR')).toBeInTheDocument();
    expect(screen.getByTestId('stepper-step-SUMMARIZATION')).toBeInTheDocument();
  });

  it('shows Hebrew labels for each step', () => {
    const steps = makeSteps({ INGESTION: 'pending', QA_GATE: 'done' });
    render(<PipelineStepper steps={steps} />);

    expect(screen.getByText('איסוף חומרים')).toBeInTheDocument();
    expect(screen.getByText('בקרת איכות')).toBeInTheDocument();
  });

  it('shows correct status icons per status', () => {
    const steps = makeSteps({
      INGESTION: 'done',
      ASR: 'running',
      SUMMARIZATION: 'failed',
      QA_GATE: 'pending',
    });
    render(<PipelineStepper steps={steps} />);

    // Check icon text content matches STATUS_ICON values
    const stepperEl = screen.getByTestId('pipeline-stepper');
    // done = checkmark (U+2705), running = hourglass (U+23F3),
    // failed = X (U+274C), pending = circle (U+25CB)
    expect(stepperEl.textContent).toContain('\u2705');
    expect(stepperEl.textContent).toContain('\u23F3');
    expect(stepperEl.textContent).toContain('\u274C');
    expect(stepperEl.textContent).toContain('\u25CB');
  });

  it('shows Hebrew status labels', () => {
    const steps = makeSteps({
      INGESTION: 'done',
      ASR: 'running',
      SUMMARIZATION: 'failed',
      QA_GATE: 'pending',
    });
    render(<PipelineStepper steps={steps} />);

    expect(screen.getByText('הושלם')).toBeInTheDocument();
    expect(screen.getByText('פועל')).toBeInTheDocument();
    expect(screen.getByText('נכשל')).toBeInTheDocument();
    expect(screen.getByText('ממתין')).toBeInTheDocument();
  });

  it('has aria-live="polite" on container', () => {
    const steps = makeSteps({ INGESTION: 'pending' });
    render(<PipelineStepper steps={steps} />);

    const container = screen.getByTestId('pipeline-stepper');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });

  it('sets aria-current="step" on running step', () => {
    const steps = makeSteps({ INGESTION: 'done', ASR: 'running', SUMMARIZATION: 'pending' });
    render(<PipelineStepper steps={steps} />);

    expect(screen.getByTestId('stepper-step-ASR')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('stepper-step-INGESTION')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('stepper-step-SUMMARIZATION')).not.toHaveAttribute('aria-current');
  });

  it('failed step shows retry and skip buttons when expanded', () => {
    const onRetry = vi.fn();
    const onSkip = vi.fn();
    const steps = makeSteps({ INGESTION: 'failed' });
    render(<PipelineStepper steps={steps} onRetry={onRetry} onSkip={onSkip} />);

    // Click to expand the failed step
    const stepButton = screen.getByTestId('stepper-step-INGESTION').querySelector('button')!;
    fireEvent.click(stepButton);

    expect(screen.getByTestId('step-retry-btn')).toBeInTheDocument();
    expect(screen.getByTestId('step-skip-btn')).toBeInTheDocument();
    expect(screen.getByText('נסה שוב')).toBeInTheDocument();
    expect(screen.getByText('דלג')).toBeInTheDocument();
  });

  it('retry button calls onRetry with moduleType', () => {
    const onRetry = vi.fn();
    const steps = makeSteps({ INGESTION: 'failed' });
    render(<PipelineStepper steps={steps} onRetry={onRetry} />);

    const stepButton = screen.getByTestId('stepper-step-INGESTION').querySelector('button')!;
    fireEvent.click(stepButton);
    fireEvent.click(screen.getByTestId('step-retry-btn'));

    expect(onRetry).toHaveBeenCalledWith('INGESTION');
  });

  it('skip button calls onSkip with moduleType', () => {
    const onSkip = vi.fn();
    const steps = makeSteps({ INGESTION: 'failed' });
    render(<PipelineStepper steps={steps} onSkip={onSkip} />);

    const stepButton = screen.getByTestId('stepper-step-INGESTION').querySelector('button')!;
    fireEvent.click(stepButton);
    fireEvent.click(screen.getByTestId('step-skip-btn'));

    expect(onSkip).toHaveBeenCalledWith('INGESTION');
  });

  it('expanding a step shows error message details', () => {
    const steps = makeSteps({ INGESTION: 'failed' });
    render(<PipelineStepper steps={steps} />);

    // Before expanding — no error message visible
    expect(screen.queryByTestId('step-error-message')).not.toBeInTheDocument();

    // Expand
    const stepButton = screen.getByTestId('stepper-step-INGESTION').querySelector('button')!;
    fireEvent.click(stepButton);

    expect(screen.getByTestId('step-error-message')).toHaveTextContent('Error in INGESTION');
  });

  it('expanding a done step shows output', () => {
    const steps: StepData[] = [
      { moduleType: 'INGESTION', status: 'done', output: 'Completed successfully' },
    ];
    render(<PipelineStepper steps={steps} />);

    const stepButton = screen.getByTestId('stepper-step-INGESTION').querySelector('button')!;
    fireEvent.click(stepButton);

    expect(screen.getByText('Completed successfully')).toBeInTheDocument();
  });

  it('pending steps are not expandable (button disabled)', () => {
    const steps = makeSteps({ INGESTION: 'pending' });
    render(<PipelineStepper steps={steps} />);

    const stepButton = screen.getByTestId('stepper-step-INGESTION').querySelector('button')!;
    expect(stepButton).toBeDisabled();
  });

  it('uses motion-safe:animate-spin on running step icon (prefers-reduced-motion)', () => {
    const steps = makeSteps({ ASR: 'running' });
    render(<PipelineStepper steps={steps} />);

    const stepEl = screen.getByTestId('stepper-step-ASR');
    // The icon span should have motion-safe:animate-spin (NOT animate-spin directly)
    const iconSpans = stepEl.querySelectorAll('span[aria-hidden="true"]');
    const spinnerSpan = Array.from(iconSpans).find(
      (s) => s.className.includes('motion-safe:animate-spin')
    );
    expect(spinnerSpan).toBeDefined();
    // Should NOT have plain animate-spin (without the motion-safe prefix)
    expect(spinnerSpan?.className).not.toMatch(/(?<!motion-safe:)animate-spin/);
  });

  it('toggling expand on same step collapses it', () => {
    const steps = makeSteps({ INGESTION: 'failed' });
    render(<PipelineStepper steps={steps} />);

    const stepButton = screen.getByTestId('stepper-step-INGESTION').querySelector('button')!;

    // Expand
    fireEvent.click(stepButton);
    expect(screen.getByTestId('step-error-message')).toBeInTheDocument();

    // Collapse
    fireEvent.click(stepButton);
    expect(screen.queryByTestId('step-error-message')).not.toBeInTheDocument();
  });

  it('renders step numbers starting from 1', () => {
    const steps = makeSteps({ INGESTION: 'pending', ASR: 'pending', QA_GATE: 'pending' });
    render(<PipelineStepper steps={steps} />);

    const container = screen.getByTestId('pipeline-stepper');
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('3');
  });
});
