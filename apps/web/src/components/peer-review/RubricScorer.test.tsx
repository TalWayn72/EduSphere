import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RubricScorer from './RubricScorer';

const criteria = [
  { id: 'c1', label: 'Content Quality', description: 'How good is the content?', maxScore: 5 },
  { id: 'c2', label: 'Clarity', description: 'How clear is it?', maxScore: 5 },
];

describe('RubricScorer', () => {
  it('renders all criteria labels', () => {
    render(<RubricScorer criteria={criteria} onChange={vi.fn()} />);
    expect(screen.getByText('Content Quality')).toBeInTheDocument();
    expect(screen.getByText('Clarity')).toBeInTheDocument();
  });

  it('renders a slider for each criterion', () => {
    render(<RubricScorer criteria={criteria} onChange={vi.fn()} />);
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(2);
  });

  it('calls onChange when slider value changes', () => {
    const onChange = vi.fn();
    render(<RubricScorer criteria={criteria} onChange={onChange} />);
    const [firstSlider] = screen.getAllByRole('slider');
    fireEvent.change(firstSlider, { target: { value: '4' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('shows total score', () => {
    render(<RubricScorer criteria={criteria} onChange={vi.fn()} />);
    expect(screen.getByText(/Total/i)).toBeInTheDocument();
  });
});
