import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseCard, CATEGORY_GRADIENTS } from './CourseCard';

const BASE_PROPS = {
  id: 'test-1',
  title: 'Introduction to TypeScript',
  instructor: 'Jane Doe',
  category: 'Programming',
  lessonCount: 20,
  estimatedHours: 5,
} as const;

describe('CourseCard', () => {
  it('renders the course title', () => {
    render(<CourseCard {...BASE_PROPS} />);
    expect(screen.getByText('Introduction to TypeScript')).toBeInTheDocument();
  });

  it('renders the instructor name', () => {
    render(<CourseCard {...BASE_PROPS} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('renders the category badge', () => {
    render(<CourseCard {...BASE_PROPS} />);
    expect(screen.getByText('Programming')).toBeInTheDocument();
  });

  it('renders lesson count', () => {
    render(<CourseCard {...BASE_PROPS} />);
    expect(screen.getByText('20 lessons')).toBeInTheDocument();
  });

  it('renders estimated hours', () => {
    render(<CourseCard {...BASE_PROPS} />);
    expect(screen.getByText('5h')).toBeInTheDocument();
  });

  it('shows progress bar when enrolled and progress provided', () => {
    render(<CourseCard {...BASE_PROPS} enrolled progress={60} />);
    expect(
      screen.getByTestId('course-card-progress-test-1')
    ).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('hides progress bar when not enrolled', () => {
    render(<CourseCard {...BASE_PROPS} enrolled={false} />);
    expect(
      screen.queryByTestId('course-card-progress-test-1')
    ).not.toBeInTheDocument();
  });

  it('hides progress bar when enrolled is omitted', () => {
    render(<CourseCard {...BASE_PROPS} />);
    expect(
      screen.queryByTestId('course-card-progress-test-1')
    ).not.toBeInTheDocument();
  });

  it('renders MasteryBadge with the correct level', () => {
    render(<CourseCard {...BASE_PROPS} mastery="proficient" />);
    expect(screen.getByTestId('mastery-badge-proficient')).toBeInTheDocument();
  });

  it('renders MasteryBadge defaulting to none when mastery is omitted', () => {
    render(<CourseCard {...BASE_PROPS} />);
    expect(screen.getByTestId('mastery-badge-none')).toBeInTheDocument();
  });

  it('shows FEATURED badge when featured=true', () => {
    render(<CourseCard {...BASE_PROPS} featured />);
    expect(screen.getByText(/FEATURED/)).toBeInTheDocument();
  });

  it('does not show FEATURED badge when featured=false', () => {
    render(<CourseCard {...BASE_PROPS} featured={false} />);
    expect(screen.queryByText(/FEATURED/)).not.toBeInTheDocument();
  });

  it('has the correct data-testid on the card root', () => {
    render(<CourseCard {...BASE_PROPS} />);
    expect(screen.getByTestId('course-card-test-1')).toBeInTheDocument();
  });

  it('fires onClick when the card is clicked', () => {
    const handleClick = vi.fn();
    render(<CourseCard {...BASE_PROPS} onClick={handleClick} />);
    fireEvent.click(screen.getByTestId('course-card-test-1'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('has the correct aria-label equal to the title', () => {
    render(<CourseCard {...BASE_PROPS} />);
    const article = screen.getByRole('article', {
      name: 'Introduction to TypeScript',
    });
    expect(article).toBeInTheDocument();
  });

  it('applies a category gradient class to the thumbnail', () => {
    render(<CourseCard {...BASE_PROPS} category="Design" />);
    const thumbnail = screen.getByTestId('course-card-thumbnail-test-1');
    const designGradient = CATEGORY_GRADIENTS['Design'] ?? '';
    // The gradient string contains multiple class tokens; check at least one
    const firstToken = designGradient.split(' ')[0] ?? '';
    expect(thumbnail.className).toContain(firstToken);
  });

  it('shows "Continue" CTA when enrolled', () => {
    render(<CourseCard {...BASE_PROPS} enrolled progress={50} />);
    expect(screen.getByText(/Continue/)).toBeInTheDocument();
  });

  it('shows "Enroll Free" CTA when not enrolled', () => {
    render(<CourseCard {...BASE_PROPS} enrolled={false} />);
    expect(screen.getByText('Enroll Free')).toBeInTheDocument();
  });

  it('does not display raw technical strings', () => {
    render(<CourseCard {...BASE_PROPS} />);
    const card = screen.getByTestId('course-card-test-1');
    expect(card.textContent).not.toContain('undefined');
    expect(card.textContent).not.toContain('null');
    expect(card.textContent).not.toContain('Error');
  });
});
