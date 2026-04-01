import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { AICourseBuildSection } from './AICourseBuildSection';

vi.mock(
  'lucide-react',
  () =>
    new Proxy(
      {},
      {
        get: (_, name) => {
          if (name === '__esModule') return true;
          return function MockIcon(props: Record<string, unknown>) {
            return <span data-testid={`icon-${String(name)}`} {...props} />;
          };
        },
      }
    )
);

vi.mock('@/components/ui/button', () => ({
  Button: function MockButton({
    children,
    asChild: _asChild,
    ...props
  }: Record<string, unknown>) {
    return <div {...props}>{children as React.ReactNode}</div>;
  },
}));

function renderSection() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AICourseBuildSection />
    </MemoryRouter>
  );
}

describe('AICourseBuildSection', () => {
  it('renders without crashing', () => {
    renderSection();
    expect(screen.getByTestId('ai-course-build-section')).toBeInTheDocument();
  });

  it('has correct section id for anchor navigation', () => {
    const { container } = renderSection();
    expect(container.querySelector('#ai-course-builder')).toBeInTheDocument();
  });

  it('renders the heading and description', () => {
    renderSection();
    expect(
      screen.getByText('Build a Complete Course in 10 Minutes')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /AI generates modules, lessons, quizzes, and assessments/
      )
    ).toBeInTheDocument();
  });

  it('renders all 5 steps', () => {
    renderSection();
    const list = screen.getByRole('list', { name: /AI Course Builder steps/i });
    expect(list.querySelectorAll('li')).toHaveLength(5);
    expect(
      screen.getByText('Enter a topic or upload a syllabus')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Review, customize, and publish')
    ).toBeInTheDocument();
  });

  it('renders the demo CTA link with smooth scroll to #pilot-cta', () => {
    renderSection();
    const link = screen.getByRole('link', {
      name: /See AI Course Builder Demo/i,
    });
    expect(link).toHaveAttribute('href', '/#pilot-cta');
  });
});
