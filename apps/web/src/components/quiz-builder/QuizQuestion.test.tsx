import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/input', () => ({ Input: React.forwardRef((p: any, ref: any) => <input ref={ref} {...p} />) }));
vi.mock('@/components/ui/button', () => ({ Button: (p: any) => <button onClick={p.onClick} {...p}>{p.children}</button> }));
vi.mock('@/components/ui/label', () => ({ Label: (p: any) => <label {...p} /> }));
vi.mock('lucide-react', () => ({ Trash2: () => <span>X</span> }));

import React from 'react';
import { QuizQuestion } from './QuizQuestion';

const Q = { type: "MULTIPLE_CHOICE" as const, question: "What?", choices: ["A","B","C","D"] as [string,string,string,string], correctIndex: 0 };

describe('QuizQuestion', () => {
  it('renders question input', () => {
    render(<QuizQuestion index={0} question={Q} onChange={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByDisplayValue("What?")).toBeInTheDocument();
  });

  it('renders 4 choice inputs', () => {
    render(<QuizQuestion index={0} question={Q} onChange={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByDisplayValue("A")).toBeInTheDocument();
    expect(screen.getByDisplayValue("D")).toBeInTheDocument();
  });

  it('calls onRemove when remove clicked', () => {
    const onRemove = vi.fn();
    render(<QuizQuestion index={0} question={Q} onChange={vi.fn()} onRemove={onRemove} />);
    const removeBtn = screen.getAllByRole("button").find(b => b.textContent?.includes("X") || b.getAttribute("aria-label")?.includes("Remove"));
    if (removeBtn) fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalled();
  });
});