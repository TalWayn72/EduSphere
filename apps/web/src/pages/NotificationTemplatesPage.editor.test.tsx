import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/graphql/admin-notifications.queries', () => ({}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { NotificationTemplateEditor } from './NotificationTemplatesPage.editor';
import type { NotificationTemplate } from '@/lib/graphql/admin-notifications.queries';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TEMPLATE: NotificationTemplate = {
  id: 'tmpl-1',
  key: 'welcome_email',
  name: 'Welcome Email',
  subject: 'Welcome to EduSphere!',
  bodyHtml: '<p>Hello {{user.name}}</p>',
  variables: ['{{user.name}}'],
  isActive: true,
  updatedAt: '2024-01-01T00:00:00Z',
};

function renderEditor(
  overrides: Partial<{
    template: NotificationTemplate;
    saved: boolean;
    onSave: (id: string, subject: string, bodyHtml: string) => void;
    onReset: (id: string) => void;
  }> = {}
) {
  const props = {
    template: TEMPLATE,
    onSave: vi.fn(),
    onReset: vi.fn(),
    saved: false,
    ...overrides,
  };
  return render(<NotificationTemplateEditor {...props} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NotificationTemplateEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the template name as the card title', () => {
    renderEditor();
    expect(screen.getByText('Welcome Email')).toBeInTheDocument();
  });

  it('renders the template key as a badge', () => {
    renderEditor();
    expect(screen.getByText('welcome_email')).toBeInTheDocument();
  });

  it('renders the subject input pre-filled with template subject', () => {
    renderEditor();
    const subjectInput = screen.getByRole('textbox', { name: /subject/i });
    expect(subjectInput).toHaveValue('Welcome to EduSphere!');
  });

  it('renders available variable chips', () => {
    renderEditor();
    expect(screen.getByText('{{user.name}}')).toBeInTheDocument();
    expect(screen.getByText('{{user.email}}')).toBeInTheDocument();
    expect(screen.getByText('{{course.title}}')).toBeInTheDocument();
  });

  it('updates subject input when user types a new subject', () => {
    renderEditor();
    const subjectInput = screen.getByRole('textbox', { name: /subject/i });
    fireEvent.change(subjectInput, { target: { value: 'New Subject Line' } });
    expect(subjectInput).toHaveValue('New Subject Line');
  });

  it('renders Edit and Preview tabs', () => {
    renderEditor();
    expect(screen.getByText(/^Edit$/)).toBeInTheDocument();
    expect(screen.getByText(/Preview HTML/i)).toBeInTheDocument();
  });

  it('shows the body textarea in Edit tab', () => {
    renderEditor();
    expect(screen.getByRole('textbox', { name: '' })).toBeInTheDocument();
  });

  it('calls onSave with template id, subject and bodyHtml when Save is clicked', () => {
    const onSave = vi.fn();
    renderEditor({ onSave });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(
      'tmpl-1',
      'Welcome to EduSphere!',
      '<p>Hello {{user.name}}</p>'
    );
  });

  it('calls onReset with template id when Reset is clicked', () => {
    const onReset = vi.fn();
    renderEditor({ onReset });
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(onReset).toHaveBeenCalledWith('tmpl-1');
  });

  it('shows "Saved" text and checkmark when saved prop is true', () => {
    renderEditor({ saved: true });
    expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument();
  });

  it('shows "Save Changes" text when saved prop is false', () => {
    renderEditor({ saved: false });
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });
});
