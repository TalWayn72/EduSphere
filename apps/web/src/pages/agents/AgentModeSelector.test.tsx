import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { AgentModeSelector } from './AgentModeSelector';

const modes = [
  { id: 'chavruta', label: 'Chavruta', icon: <span>icon</span>, color: 'text-blue-600', bg: 'bg-blue-50', description: 'Learn together', prompts: ['p1'] as readonly string[], responses: ['r1'] as readonly string[] },
  { id: 'quiz', label: 'Quiz', icon: <span>icon2</span>, color: 'text-green-600', bg: 'bg-green-50', description: 'Test yourself', prompts: ['p2'] as readonly string[], responses: ['r2'] as readonly string[] },
];

describe('AgentModeSelector', () => {
  it('renders without crash', () => {
    const { container } = render(
      <AgentModeSelector modes={modes} activeMode="chavruta" onSelect={vi.fn()} />
    );
    expect(container).toBeTruthy();
  });

  it('renders mode labels', () => {
    render(<AgentModeSelector modes={modes} activeMode="chavruta" onSelect={vi.fn()} />);
    expect(screen.getByText('Chavruta')).toBeInTheDocument();
    expect(screen.getByText('Quiz')).toBeInTheDocument();
  });
});
