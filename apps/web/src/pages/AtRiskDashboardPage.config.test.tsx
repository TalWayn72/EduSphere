import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/slider', () => ({
  Slider: ({
    value,
    onValueChange,
    min,
    max,
    step,
  }: {
    value: number[];
    onValueChange: (v: number[]) => void;
    min: number;
    max: number;
    step: number;
  }) => (
    <input
      type="range"
      data-testid="slider"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={(e) => onValueChange([Number(e.target.value)])}
    />
  ),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { RiskThresholdConfig } from './AtRiskDashboardPage.config';
import { toast } from 'sonner';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RiskThresholdConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the card title', () => {
    render(<RiskThresholdConfig />);
    expect(
      screen.getByText('Risk Threshold Configuration')
    ).toBeInTheDocument();
  });

  it('renders inactive days label and input with default value 7', () => {
    render(<RiskThresholdConfig />);
    expect(screen.getByText(/Flag learners as at-risk/i)).toBeInTheDocument();
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(7);
  });

  it('updates inactive days input when user types', () => {
    render(<RiskThresholdConfig />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '14' } });
    expect(input).toHaveValue(14);
  });

  it('renders completion threshold label showing default 30%', () => {
    render(<RiskThresholdConfig />);
    expect(screen.getByText(/30%/)).toBeInTheDocument();
  });

  it('renders slider with default value of 30', () => {
    render(<RiskThresholdConfig />);
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveValue('30');
  });

  it('updates completion threshold when slider changes', () => {
    render(<RiskThresholdConfig />);
    const slider = screen.getByTestId('slider');
    fireEvent.change(slider, { target: { value: '50' } });
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  it('renders Save Thresholds button', () => {
    render(<RiskThresholdConfig />);
    expect(
      screen.getByRole('button', { name: /Save Thresholds/i })
    ).toBeInTheDocument();
  });

  it('shows Saving… text while saving and calls toast.success after timeout', async () => {
    render(<RiskThresholdConfig />);
    fireEvent.click(screen.getByRole('button', { name: /Save Thresholds/i }));
    expect(screen.getByRole('button', { name: /Saving/i })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
      'Risk thresholds saved'
    );
  });

  it('re-enables button after save completes', () => {
    render(<RiskThresholdConfig />);
    fireEvent.click(screen.getByRole('button', { name: /Save Thresholds/i }));

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(
      screen.getByRole('button', { name: /Save Thresholds/i })
    ).not.toBeDisabled();
  });

  it('slider has correct min/max/step attributes', () => {
    render(<RiskThresholdConfig />);
    const slider = screen.getByTestId('slider');
    expect(slider).toHaveAttribute('min', '5');
    expect(slider).toHaveAttribute('max', '80');
    expect(slider).toHaveAttribute('step', '5');
  });
});
