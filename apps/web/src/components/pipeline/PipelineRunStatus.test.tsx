import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('./PipelineStepper', () => ({
  PipelineStepper: (props: Record<string, unknown>) => <div data-testid="pipeline-stepper" {...props} />,
}));

vi.mock('./PipelineStepperSkeleton', () => ({
  PipelineStepperSkeleton: () => <div data-testid="pipeline-stepper-skeleton" />,
}));

vi.mock('./PipelineResultDetail', () => ({
  PipelineResultDetail: ({ open, result }: { open: boolean; result: unknown }) => (
    open ? <div data-testid="pipeline-result-detail">{JSON.stringify(result)}</div> : null
  ),
}));

vi.mock('@/lib/lesson-pipeline.store', () => ({
  useLessonPipelineStore: (selector: (s: Record<string, unknown>) => unknown) => {
    const state = {
      moduleStatuses: { INGESTION: 'done', ASR: 'running' },
      nodes: [
        { moduleType: 'INGESTION', enabled: true },
        { moduleType: 'ASR', enabled: true },
      ],
    };
    return selector(state);
  },
}));

import { PipelineRunStatus } from './PipelineRunStatus';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const COMPLETED_RUN = {
  id: 'run-1',
  status: 'COMPLETED',
  startedAt: '2026-03-10T10:00:00Z',
  completedAt: '2026-03-10T10:05:00Z',
  results: [
    { id: 'r1', moduleName: 'SUMMARIZATION', outputType: 'TEXT', outputData: { shortSummary: 'Summary text here' } },
    { id: 'r2', moduleName: 'QA_GATE', outputType: 'TEXT', outputData: { qaScore: 85 } },
    { id: 'r3', moduleName: 'ASR', outputType: 'TEXT', outputData: { transcript: 'Transcript text' } },
  ],
};

const RUNNING_RUN = {
  id: 'run-2',
  status: 'RUNNING',
  startedAt: '2026-03-10T10:00:00Z',
  completedAt: null,
  results: [],
};

const FAILED_RUN = {
  id: 'run-3',
  status: 'FAILED',
  startedAt: '2026-03-10T10:00:00Z',
  completedAt: null,
  results: [],
};

const CANCELLED_RUN = {
  id: 'run-4',
  status: 'CANCELLED',
  startedAt: null,
  completedAt: null,
  results: [],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PipelineRunStatus', () => {
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the status container', () => {
    render(<PipelineRunStatus run={COMPLETED_RUN} onCancel={onCancel} />);
    expect(screen.getByTestId('pipeline-run-status')).toBeInTheDocument();
  });

  it('shows completed status label in Hebrew', () => {
    render(<PipelineRunStatus run={COMPLETED_RUN} onCancel={onCancel} />);
    expect(screen.getByTestId('run-status-label')).toHaveTextContent('הושלם');
  });

  it('shows running status label in Hebrew', () => {
    render(<PipelineRunStatus run={RUNNING_RUN} onCancel={onCancel} />);
    expect(screen.getByTestId('run-status-label')).toHaveTextContent('מריץ...');
  });

  it('shows failed status label', () => {
    render(<PipelineRunStatus run={FAILED_RUN} onCancel={onCancel} />);
    expect(screen.getByTestId('run-status-label')).toHaveTextContent('נכשל');
  });

  it('shows cancelled status label', () => {
    render(<PipelineRunStatus run={CANCELLED_RUN} onCancel={onCancel} />);
    expect(screen.getByTestId('run-status-label')).toHaveTextContent('בוטל');
  });

  it('shows cancel button for running runs', () => {
    render(<PipelineRunStatus run={RUNNING_RUN} onCancel={onCancel} />);
    expect(screen.getByTestId('cancel-run-btn')).toBeInTheDocument();
  });

  it('calls onCancel when cancel clicked', () => {
    render(<PipelineRunStatus run={RUNNING_RUN} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('cancel-run-btn'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not show cancel button for completed runs', () => {
    render(<PipelineRunStatus run={COMPLETED_RUN} onCancel={onCancel} />);
    expect(screen.queryByTestId('cancel-run-btn')).not.toBeInTheDocument();
  });

  it('shows PipelineStepper for running runs', () => {
    render(<PipelineRunStatus run={RUNNING_RUN} onCancel={onCancel} />);
    expect(screen.getByTestId('pipeline-stepper')).toBeInTheDocument();
  });

  it('shows skeleton when running and isLoading', () => {
    render(<PipelineRunStatus run={RUNNING_RUN} onCancel={onCancel} isLoading />);
    expect(screen.getByTestId('pipeline-stepper-skeleton')).toBeInTheDocument();
  });

  it('shows result pills for completed runs', () => {
    render(<PipelineRunStatus run={COMPLETED_RUN} onCancel={onCancel} />);
    expect(screen.getByTestId('result-pill-SUMMARIZATION')).toBeInTheDocument();
    expect(screen.getByTestId('result-pill-QA_GATE')).toBeInTheDocument();
    expect(screen.getByTestId('result-pill-ASR')).toBeInTheDocument();
  });

  it('shows summary output for completed runs', () => {
    render(<PipelineRunStatus run={COMPLETED_RUN} onCancel={onCancel} />);
    expect(screen.getByTestId('result-summary')).toHaveTextContent('Summary text here');
  });

  it('shows QA score for completed runs', () => {
    render(<PipelineRunStatus run={COMPLETED_RUN} onCancel={onCancel} />);
    expect(screen.getByTestId('result-qa-score')).toHaveTextContent('85%');
  });

  it('shows transcript snippet for completed runs', () => {
    render(<PipelineRunStatus run={COMPLETED_RUN} onCancel={onCancel} />);
    expect(screen.getByTestId('result-transcript')).toHaveTextContent('Transcript text');
  });

  it('clicking a result pill opens detail', () => {
    render(<PipelineRunStatus run={COMPLETED_RUN} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('result-pill-SUMMARIZATION'));
    expect(screen.getByTestId('pipeline-result-detail')).toBeInTheDocument();
  });

  it('shows fallback message when no key outputs', () => {
    const runNoOutputs = {
      ...COMPLETED_RUN,
      results: [{ id: 'r1', moduleName: 'OTHER', outputType: 'TEXT', outputData: null }],
    };
    render(<PipelineRunStatus run={runNoOutputs} onCancel={onCancel} />);
    expect(screen.getByText(/Pipeline הסתיים/)).toBeInTheDocument();
  });
});
