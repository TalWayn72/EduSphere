import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from './form';

// Helper component that wraps form components with required context
function TestForm({ children }: { children: React.ReactNode }) {
  const form = useForm({
    defaultValues: { name: '' },
  });

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              {children}
              <FormControl>
                <input {...field} data-testid="input" />
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

describe('Form components', () => {
  it('renders FormItem', () => {
    render(
      <TestForm>
        <FormLabel>Name</FormLabel>
      </TestForm>
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('renders FormLabel with htmlFor linked to input', () => {
    render(
      <TestForm>
        <FormLabel>Email</FormLabel>
      </TestForm>
    );
    const label = screen.getByText('Email');
    const input = screen.getByTestId('input');
    // The label should have a for attribute matching the input id
    expect(label).toHaveAttribute('for', input.id);
  });

  it('renders FormDescription', () => {
    render(
      <TestForm>
        <FormLabel>Name</FormLabel>
        <FormDescription>Enter your full name</FormDescription>
      </TestForm>
    );
    expect(screen.getByText('Enter your full name')).toBeInTheDocument();
  });

  it('FormControl links aria-describedby to description', () => {
    render(
      <TestForm>
        <FormLabel>Name</FormLabel>
        <FormDescription>Help text</FormDescription>
      </TestForm>
    );
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('aria-describedby');
  });

  it('FormControl has aria-invalid=false when no error', () => {
    render(
      <TestForm>
        <FormLabel>Name</FormLabel>
      </TestForm>
    );
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });
});

describe('FormItem', () => {
  it('has correct displayName', () => {
    expect(FormItem.displayName).toBe('FormItem');
  });
});

describe('FormLabel', () => {
  it('has correct displayName', () => {
    expect(FormLabel.displayName).toBe('FormLabel');
  });
});

describe('FormControl', () => {
  it('has correct displayName', () => {
    expect(FormControl.displayName).toBe('FormControl');
  });
});

describe('FormDescription', () => {
  it('has correct displayName', () => {
    expect(FormDescription.displayName).toBe('FormDescription');
  });

  it('forwards className', () => {
    render(
      <TestForm>
        <FormDescription className="italic" data-testid="desc">
          D
        </FormDescription>
      </TestForm>
    );
    expect(screen.getByTestId('desc')).toHaveClass('italic');
  });
});

describe('FormMessage', () => {
  it('has correct displayName', () => {
    expect(FormMessage.displayName).toBe('FormMessage');
  });
});
