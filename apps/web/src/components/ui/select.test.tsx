import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './select';

describe('Select', () => {
  it('renders the trigger', () => {
    render(
      <Select>
        <SelectTrigger data-testid="trigger">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
      </Select>
    );
    expect(screen.getByTestId('trigger')).toBeInTheDocument();
  });

  it('shows placeholder text', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Choose..." />
        </SelectTrigger>
      </Select>
    );
    expect(screen.getByText('Choose...')).toBeInTheDocument();
  });

  it('trigger has combobox role', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
      </Select>
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('forwards className to trigger', () => {
    render(
      <Select>
        <SelectTrigger className="w-48" data-testid="trigger">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
      </Select>
    );
    expect(screen.getByTestId('trigger')).toHaveClass('w-48');
  });

  it('shows content when open', () => {
    render(
      <Select open>
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
          <SelectItem value="b">Option B</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });
});

describe('SelectTrigger displayName', () => {
  it('has correct displayName', () => {
    expect(SelectTrigger.displayName).toBe('SelectTrigger');
  });
});

describe('SelectContent displayName', () => {
  it('has correct displayName', () => {
    expect(SelectContent.displayName).toBe('SelectContent');
  });
});

describe('SelectItem displayName', () => {
  it('has correct displayName', () => {
    expect(SelectItem.displayName).toBe('SelectItem');
  });
});
