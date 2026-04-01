/**
 * PipelineStepper — vertical accordion-based stepper showing per-module progress.
 * Each step: pending -> running -> done -> failed with expandable details.
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  MODULE_LABELS,
  type PipelineModuleType,
  type ModuleStatusValue,
} from '@/lib/lesson-pipeline.store';

interface StepData {
  moduleType: PipelineModuleType;
  status: ModuleStatusValue;
  errorMessage?: string | null;
  output?: string | null;
}

interface Props {
  steps: StepData[];
  onRetry?: (moduleType: PipelineModuleType) => void;
  onSkip?: (moduleType: PipelineModuleType) => void;
}

const STATUS_ICON: Record<ModuleStatusValue, string> = {
  pending: '\u25CB', // Circle
  running: '\u23F3', // Hourglass
  done: '\u2705', // Check
  failed: '\u274C', // X
};

const STATUS_ARIA: Record<ModuleStatusValue, string> = {
  pending: 'ממתין',
  running: 'פועל',
  done: 'הושלם',
  failed: 'נכשל',
};

const STATUS_STYLE: Record<ModuleStatusValue, string> = {
  pending: 'border-muted-foreground/30 text-muted-foreground',
  running: 'border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950',
  done: 'border-green-500 text-green-700 bg-green-50 dark:bg-green-950',
  failed: 'border-red-500 text-red-700 bg-red-50 dark:bg-red-950',
};

export function PipelineStepper({ steps, onRetry, onSkip }: Props) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const toggle = (moduleType: string) => {
    setExpandedStep((prev) => (prev === moduleType ? null : moduleType));
  };

  return (
    <div
      dir="rtl"
      aria-live="polite"
      aria-label="סטטוס מודולי צנרת"
      className="space-y-1"
      data-testid="pipeline-stepper"
    >
      {steps.map((step, idx) => {
        const label = MODULE_LABELS[step.moduleType]?.he ?? step.moduleType;
        const isExpanded = expandedStep === step.moduleType;
        const isRunning = step.status === 'running';
        const isFailed = step.status === 'failed';
        const hasDetails = isFailed || step.output;

        return (
          <div
            key={step.moduleType}
            className={cn(
              'border rounded-lg transition-colors',
              STATUS_STYLE[step.status]
            )}
            aria-current={isRunning ? 'step' : undefined}
            data-testid={`stepper-step-${step.moduleType}`}
          >
            <button
              type="button"
              onClick={() => hasDetails && toggle(step.moduleType)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-start"
              aria-expanded={hasDetails ? isExpanded : undefined}
              disabled={!hasDetails}
            >
              {/* Step number */}
              <span className="shrink-0 w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </span>

              {/* Icon with reduced-motion fallback */}
              <span
                className={cn(
                  'shrink-0 text-base',
                  isRunning && 'motion-safe:animate-spin'
                )}
                aria-hidden="true"
              >
                {STATUS_ICON[step.status]}
              </span>

              {/* Label */}
              <span className="flex-1 font-medium">{label}</span>

              {/* Status badge */}
              <span
                className="text-xs opacity-75"
                aria-label={STATUS_ARIA[step.status]}
              >
                {STATUS_ARIA[step.status]}
              </span>

              {/* Expand indicator */}
              {hasDetails && (
                <span className="text-xs" aria-hidden="true">
                  {isExpanded ? '\u25B2' : '\u25BC'}
                </span>
              )}
            </button>

            {/* Expandable details */}
            {isExpanded && hasDetails && (
              <div className="px-3 pb-3 text-xs space-y-2 border-t mt-1 pt-2">
                {isFailed && step.errorMessage && (
                  <p
                    className="text-red-600 whitespace-pre-wrap dark:text-red-400"
                    data-testid="step-error-message"
                  >
                    {step.errorMessage}
                  </p>
                )}
                {step.output && (
                  <p className="text-foreground whitespace-pre-wrap">
                    {step.output}
                  </p>
                )}
                {isFailed && (
                  <div className="flex gap-2">
                    {onRetry && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRetry(step.moduleType)}
                        data-testid="step-retry-btn"
                      >
                        נסה שוב
                      </Button>
                    )}
                    {onSkip && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSkip(step.moduleType)}
                        data-testid="step-skip-btn"
                      >
                        דלג
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
