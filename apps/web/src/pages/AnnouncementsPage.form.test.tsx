/**
 * AnnouncementsPage.form.test.tsx
 * Tests for the AnnouncementForm component.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AnnouncementForm,
  AnnouncementFormValues,
} from './AnnouncementsPage.form';

const BASE_VALUES: AnnouncementFormValues = {
  title: '',
  body: '',
  priority: 'INFO',
  targetAudience: 'ALL',
  publishAt: '',
  expiresAt: '',
};

function setup(overrides?: Partial<AnnouncementFormValues>) {
  const values = { ...BASE_VALUES, ...overrides };
  const onChange = vi.fn();
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <AnnouncementForm
      values={values}
      onChange={onChange}
      onSubmit={onSubmit}
      submitting={false}
      onCancel={onCancel}
    />
  );
  return { ...utils, onChange, onSubmit, onCancel };
}

describe('AnnouncementForm', () => {
  it('renders the card heading', () => {
    setup();
    expect(screen.getByText('New Announcement')).toBeInTheDocument();
  });

  it('renders all form labels', () => {
    setup();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Body')).toBeInTheDocument();
    expect(screen.getByLabelText('Priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Target Audience')).toBeInTheDocument();
    expect(screen.getByLabelText('Publish At')).toBeInTheDocument();
    expect(screen.getByLabelText('Expires At')).toBeInTheDocument();
  });

  it('submit button is disabled when title is empty', () => {
    setup({ title: '' });
    const btn = screen.getByRole('button', { name: /create announcement/i });
    expect(btn).toBeDisabled();
  });

  it('submit button is enabled when title is provided', () => {
    setup({ title: 'Hello World' });
    const btn = screen.getByRole('button', { name: /create announcement/i });
    expect(btn).not.toBeDisabled();
  });

  it('calls onSubmit when create button is clicked with a title', () => {
    const { onSubmit } = setup({ title: 'Test' });
    fireEvent.click(screen.getByRole('button', { name: /create announcement/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls onChange with updated title on input change', () => {
    const { onChange } = setup({ title: 'Old' });
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'New Title' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New Title' })
    );
  });

  it('calls onChange with updated priority on select change', () => {
    const { onChange } = setup({ title: 'T' });
    fireEvent.change(screen.getByLabelText('Priority'), {
      target: { value: 'CRITICAL' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'CRITICAL' })
    );
  });

  it('shows all priority options', () => {
    setup();
    const select = screen.getByLabelText('Priority');
    expect(select).toContainHTML('<option value="INFO">INFO</option>');
    expect(select).toContainHTML('<option value="WARNING">WARNING</option>');
    expect(select).toContainHTML('<option value="CRITICAL">CRITICAL</option>');
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const { onCancel } = setup({ title: 'T' });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows "Creating..." and disables buttons while submitting', () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <AnnouncementForm
        values={{ ...BASE_VALUES, title: 'Test' }}
        onChange={onChange}
        onSubmit={onSubmit}
        submitting={true}
      />
    );
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /creating/i })
    ).toBeDisabled();
  });
});
