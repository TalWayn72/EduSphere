import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock(
  'lucide-react',
  () =>
    new Proxy({} as Record<string, unknown>, {
      get: (_, name) => {
        if (name === '__esModule') return true;
        return function MockIcon(props: Record<string, unknown>) {
          return <span data-testid={`icon-${String(name)}`} {...props} />;
        };
      },
    })
);

import { Pagination } from './pagination';

describe('Pagination', () => {
  it('renders nothing when totalPages is 1', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when totalPages is 0', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={0} onPageChange={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders navigation with page buttons', () => {
    render(
      <Pagination currentPage={1} totalPages={3} onPageChange={vi.fn()} />
    );
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders correct number of page buttons for small page count', () => {
    render(
      <Pagination currentPage={1} totalPages={3} onPageChange={vi.fn()} />
    );
    // 3 page buttons + prev + next = 5 total buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('disables previous button on first page', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />
    );
    const prevBtn = screen.getByLabelText('Previous');
    expect(prevBtn).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(
      <Pagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />
    );
    const nextBtn = screen.getByLabelText('Next');
    expect(nextBtn).toBeDisabled();
  });

  it('calls onPageChange with correct page on click', () => {
    const handler = vi.fn();
    render(
      <Pagination currentPage={2} totalPages={5} onPageChange={handler} />
    );
    const page3Btn = screen.getByLabelText('Go to page 3');
    fireEvent.click(page3Btn);
    expect(handler).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange with previous page on prev click', () => {
    const handler = vi.fn();
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={handler} />
    );
    const prevBtn = screen.getByLabelText('Previous');
    fireEvent.click(prevBtn);
    expect(handler).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with next page on next click', () => {
    const handler = vi.fn();
    render(
      <Pagination currentPage={3} totalPages={5} onPageChange={handler} />
    );
    const nextBtn = screen.getByLabelText('Next');
    fireEvent.click(nextBtn);
    expect(handler).toHaveBeenCalledWith(4);
  });

  it('marks current page with aria-current', () => {
    render(
      <Pagination currentPage={2} totalPages={4} onPageChange={vi.fn()} />
    );
    const currentBtn = screen.getByLabelText('Go to page 2');
    expect(currentBtn).toHaveAttribute('aria-current', 'page');
  });

  it('limits visible pages for large page counts', () => {
    render(
      <Pagination currentPage={5} totalPages={20} onPageChange={vi.fn()} />
    );
    // 5 page buttons + prev + next = 7 total buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(7);
  });

  it('applies custom className', () => {
    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        onPageChange={vi.fn()}
        className="mt-8"
      />
    );
    expect(screen.getByTestId('pagination')).toHaveClass('mt-8');
  });
});
