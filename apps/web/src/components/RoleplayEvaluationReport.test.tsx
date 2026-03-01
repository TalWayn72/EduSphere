import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoleplayEvaluationReport } from './RoleplayEvaluationReport';

const mockEvaluation = {
  overallScore: 82,
  criteriaScores: [
    { name: 'Communication', score: 85, feedback: 'Clear and empathetic tone.' },
    { name: 'Problem Solving', score: 78, feedback: 'Good approach, needs refinement.' },
  ],
  strengths: ['Active listening demonstrated', 'Professional language used'],
  areasForImprovement: ['More follow-up questions needed', 'Elaborate on diagnosis steps'],
  summary: 'A strong performance with room to grow in diagnostic questioning.',
};

describe('RoleplayEvaluationReport', () => {
  const onTryAgain = vi.fn();
  const onBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Session Complete" heading', () => {
    render(
      <RoleplayEvaluationReport
        evaluation={mockEvaluation}
        scenarioTitle="Medical Ethics Consultation"
        onTryAgain={onTryAgain}
        onBack={onBack}
      />
    );
    expect(screen.getByText('Session Complete')).toBeInTheDocument();
  });

  it('renders the scenario title', () => {
    render(
      <RoleplayEvaluationReport
        evaluation={mockEvaluation}
        scenarioTitle="Medical Ethics Consultation"
        onTryAgain={onTryAgain}
        onBack={onBack}
      />
    );
    expect(screen.getByText('Medical Ethics Consultation')).toBeInTheDocument();
  });

  it('renders the overall score', () => {
    render(
      <RoleplayEvaluationReport
        evaluation={mockEvaluation}
        scenarioTitle="Test Scenario"
        onTryAgain={onTryAgain}
        onBack={onBack}
      />
    );
    expect(screen.getByText('82')).toBeInTheDocument();
  });

  it('renders the summary text', () => {
    render(
      <RoleplayEvaluationReport
        evaluation={mockEvaluation}
        scenarioTitle="Test Scenario"
        onTryAgain={onTryAgain}
        onBack={onBack}
      />
    );
    expect(
      screen.getByText(
        'A strong performance with room to grow in diagnostic questioning.'
      )
    ).toBeInTheDocument();
  });

  it('renders criteria breakdown section', () => {
    render(
      <RoleplayEvaluationReport
        evaluation={mockEvaluation}
        scenarioTitle="Test Scenario"
        onTryAgain={onTryAgain}
        onBack={onBack}
      />
    );
    expect(screen.getByText('Criteria Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Communication')).toBeInTheDocument();
    expect(screen.getByText('Problem Solving')).toBeInTheDocument();
  });

  it('renders criteria feedback text', () => {
    render(
      <RoleplayEvaluationReport
        evaluation={mockEvaluation}
        scenarioTitle="Test Scenario"
        onTryAgain={onTryAgain}
        onBack={onBack}
      />
    );
    expect(screen.getByText('Clear and empathetic tone.')).toBeInTheDocument();
    expect(screen.getByText('Good approach, needs refinement.')).toBeInTheDocument();
  });

  it('renders strengths section', () => {
    render(
      <RoleplayEvaluationReport
        evaluation={mockEvaluation}
        scenarioTitle="Test Scenario"
        onTryAgain={onTryAgain}
        onBack={onBack}
      />
    );
    expect(screen.getByText('Active listening demonstrated')).toBeInTheDocument();
    expect(screen.getByText('Professional language used')).toBeInTheDocument();
  });

  it('renders areas for improvement section', () => {
    render(
      <RoleplayEvaluationReport
        evaluation={mockEvaluation}
        scenarioTitle="Test Scenario"
        onTryAgain={onTryAgain}
        onBack={onBack}
      />
    );
    expect(
      screen.getByText('More follow-up questions needed')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Elaborate on diagnosis steps')
    ).toBeInTheDocument();
  });

  it('calls onTryAgain when Try Again button is clicked', () => {
    render(
      <RoleplayEvaluationReport
        evaluation={mockEvaluation}
        scenarioTitle="Test Scenario"
        onTryAgain={onTryAgain}
        onBack={onBack}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));
    expect(onTryAgain).toHaveBeenCalledOnce();
  });

  it('calls onBack when Back to Scenarios button is clicked', () => {
    render(
      <RoleplayEvaluationReport
        evaluation={mockEvaluation}
        scenarioTitle="Test Scenario"
        onTryAgain={onTryAgain}
        onBack={onBack}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Back to Scenarios/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('does not render strengths section when strengths array is empty', () => {
    const evalNoStrengths = { ...mockEvaluation, strengths: [] };
    render(
      <RoleplayEvaluationReport
        evaluation={evalNoStrengths}
        scenarioTitle="Test Scenario"
        onTryAgain={onTryAgain}
        onBack={onBack}
      />
    );
    expect(screen.queryByText('Strengths')).not.toBeInTheDocument();
  });
});
