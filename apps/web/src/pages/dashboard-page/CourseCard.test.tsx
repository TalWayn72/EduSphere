import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

import { CourseCard } from './CourseCard';

const course = {
  id: 'c-1',
  title: 'React Advanced',
  instructor: 'Dr. Smith',
  progress: 65,
  lastStudied: '2 hours ago',
};

describe('CourseCard', () => {
  it('renders course title', () => {
    render(<MemoryRouter><CourseCard course={course} progressLabel="Progress" /></MemoryRouter>);
    expect(screen.getByText('React Advanced')).toBeInTheDocument();
  });

  it('renders instructor name', () => {
    render(<MemoryRouter><CourseCard course={course} progressLabel="Progress" /></MemoryRouter>);
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
  });

  it('renders progress percentage', () => {
    render(<MemoryRouter><CourseCard course={course} progressLabel="Progress" /></MemoryRouter>);
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('renders progressbar with correct aria', () => {
    render(<MemoryRouter><CourseCard course={course} progressLabel="Progress" /></MemoryRouter>);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '65');
  });

  it('renders progress label', () => {
    render(<MemoryRouter><CourseCard course={course} progressLabel="Progress" /></MemoryRouter>);
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('links to course page', () => {
    render(<MemoryRouter><CourseCard course={course} progressLabel="Progress" /></MemoryRouter>);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/courses/c-1');
  });
});
