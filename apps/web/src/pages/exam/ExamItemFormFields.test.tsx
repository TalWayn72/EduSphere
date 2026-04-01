import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => <span />,
}));

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormField: ({
    render: renderFn,
  }: {
    render: (props: { field: Record<string, unknown> }) => React.ReactNode;
  }) => (
    <div>
      {renderFn({
        field: {
          value: '',
          onChange: vi.fn(),
          onBlur: vi.fn(),
          name: '',
          ref: vi.fn(),
        },
      })}
    </div>
  ),
  FormItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  FormLabel: ({ children }: { children: React.ReactNode }) => (
    <label>{children}</label>
  ),
  FormControl: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  FormMessage: () => null,
}));

import { ExamItemFormFields } from './ExamItemFormFields';

const mockForm = {
  register: vi.fn(() => ({})),
  formState: { errors: {} },
  watch: vi.fn(),
  setValue: vi.fn(),
  control: {},
  handleSubmit: vi.fn((fn: () => void) => fn),
  getValues: vi.fn(),
  reset: vi.fn(),
};

describe('ExamItemFormFields', () => {
  it('renders without crash', () => {
    const { container } = render(
      <ExamItemFormFields
        form={mockForm as never}
        bloomLevels={['REMEMBER', 'UNDERSTAND', 'APPLY']}
        isEdit={false}
        onSubmit={vi.fn()}
        onBack={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });
});
