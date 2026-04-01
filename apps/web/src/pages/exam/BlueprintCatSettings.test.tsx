import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: () => <div data-testid="switch" />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => (
    <label>{children}</label>
  ),
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
  FormDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

import { BlueprintCatSettings } from './BlueprintCatSettings';

const mockForm = {
  register: vi.fn(() => ({})),
  formState: { errors: {} },
  watch: vi.fn(),
  setValue: vi.fn(),
  control: {},
  handleSubmit: vi.fn(),
  getValues: vi.fn(),
  reset: vi.fn(),
};

describe('BlueprintCatSettings', () => {
  it('renders without crash', () => {
    const { container } = render(
      <BlueprintCatSettings
        form={mockForm as never}
        enableCat={false}
        onEnableCatChange={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });
});
