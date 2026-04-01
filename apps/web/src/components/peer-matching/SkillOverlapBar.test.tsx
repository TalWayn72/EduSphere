import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkillOverlapBar } from './SkillOverlapBar';

describe('SkillOverlapBar', () => {
  it('shows empty message when no skills', () => {
    render(<SkillOverlapBar skills={[]} />);
    expect(screen.getByText('No skills listed')).toBeInTheDocument();
  });

  it('renders skill badges', () => {
    render(<SkillOverlapBar skills={['React', 'TypeScript']} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('truncates beyond maxVisible', () => {
    render(<SkillOverlapBar skills={['A', 'B', 'C', 'D']} maxVisible={2} />);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });
});
