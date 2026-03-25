import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('react-router-dom', () => ({
  useParams: () => ({ courseId: 'c-1' }),
}));

import { ExamAnalyticsDashboard } from './ExamAnalyticsDashboard';

describe('ExamAnalyticsDashboard', () => {
  it('renders heading', () => {
    render(<ExamAnalyticsDashboard />);
    expect(screen.getByText('Exam Analytics')).toBeInTheDocument();
  });

  it('shows course ID', () => {
    render(<ExamAnalyticsDashboard />);
    expect(screen.getByText(/c-1/)).toBeInTheDocument();
  });
});
