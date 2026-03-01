import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'wizard.noModulesYet': 'No modules yet. Add your first module below.',
        'wizard.addModule': 'Add Module',
        'wizard.addModuleTitle': 'Module Title',
        'wizard.addModuleTitlePlaceholder': 'Enter module title',
        'wizard.addModuleDescriptionLabel': 'Description (optional)',
        'wizard.addModuleDescriptionPlaceholder': 'Brief description',
      };
      if (key === 'wizard.moduleNumber' && opts) return `Module ${opts['n'] as number}`;
      return map[key] ?? key;
    },
    i18n: { changeLanguage: vi.fn() },
  }),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { CourseWizardStep2 } from './CourseWizardStep2';
import type { CourseModule } from './course-create.types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MODULE_A: CourseModule = { id: 'mod-a', title: 'Introduction', description: 'Intro desc' };
const MODULE_B: CourseModule = { id: 'mod-b', title: 'Advanced Topics', description: '' };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CourseWizardStep2', () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onChange = vi.fn();
  });

  it('shows empty state when no modules exist', () => {
    render(<CourseWizardStep2 modules={[]} onChange={onChange} />);
    expect(
      screen.getByText('No modules yet. Add your first module below.')
    ).toBeInTheDocument();
  });

  it('renders existing module titles', () => {
    render(<CourseWizardStep2 modules={[MODULE_A, MODULE_B]} onChange={onChange} />);
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Advanced Topics')).toBeInTheDocument();
  });

  it('renders module numbers for each module', () => {
    render(<CourseWizardStep2 modules={[MODULE_A, MODULE_B]} onChange={onChange} />);
    expect(screen.getByText('Module 1')).toBeInTheDocument();
    expect(screen.getByText('Module 2')).toBeInTheDocument();
  });

  it('renders Add Module section', () => {
    render(<CourseWizardStep2 modules={[]} onChange={onChange} />);
    // "Add Module" appears in both the section heading paragraph and the button
    expect(screen.getAllByText('Add Module')[0]).toBeInTheDocument();
    expect(screen.getByLabelText('Module Title')).toBeInTheDocument();
  });

  it('Add Module button is disabled when title is empty', () => {
    render(<CourseWizardStep2 modules={[]} onChange={onChange} />);
    const addBtn = screen.getByRole('button', { name: /add module/i });
    expect(addBtn).toBeDisabled();
  });

  it('Add Module button enables when title is typed', () => {
    render(<CourseWizardStep2 modules={[]} onChange={onChange} />);
    const titleInput = screen.getByLabelText('Module Title');
    fireEvent.change(titleInput, { target: { value: 'New Module' } });
    const addBtn = screen.getByRole('button', { name: /add module/i });
    expect(addBtn).not.toBeDisabled();
  });

  it('clicking Add Module calls onChange with new module appended', () => {
    render(<CourseWizardStep2 modules={[MODULE_A]} onChange={onChange} />);
    const titleInput = screen.getByLabelText('Module Title');
    fireEvent.change(titleInput, { target: { value: 'New Module' } });
    fireEvent.click(screen.getByRole('button', { name: /add module/i }));
    expect(onChange).toHaveBeenCalledOnce();
    const { modules } = onChange.mock.calls[0][0] as { modules: CourseModule[] };
    expect(modules).toHaveLength(2);
    expect(modules[1]?.title).toBe('New Module');
  });

  it('pressing Enter in title input adds the module', () => {
    render(<CourseWizardStep2 modules={[]} onChange={onChange} />);
    const titleInput = screen.getByLabelText('Module Title');
    fireEvent.change(titleInput, { target: { value: 'Keyboard Module' } });
    fireEvent.keyDown(titleInput, { key: 'Enter', code: 'Enter' });
    expect(onChange).toHaveBeenCalledOnce();
    const { modules } = onChange.mock.calls[0][0] as { modules: CourseModule[] };
    expect(modules[0]?.title).toBe('Keyboard Module');
  });

  it('clicking Remove on a module calls onChange with that module excluded', () => {
    render(<CourseWizardStep2 modules={[MODULE_A, MODULE_B]} onChange={onChange} />);
    const removeBtns = screen.getAllByRole('button', { name: /remove module/i });
    fireEvent.click(removeBtns[0]!);
    expect(onChange).toHaveBeenCalledOnce();
    const { modules } = onChange.mock.calls[0][0] as { modules: CourseModule[] };
    expect(modules).toHaveLength(1);
    expect(modules[0]?.id).toBe('mod-b');
  });

  it('Move Up button is disabled for the first module', () => {
    render(<CourseWizardStep2 modules={[MODULE_A, MODULE_B]} onChange={onChange} />);
    const moveUpBtns = screen.getAllByRole('button', { name: /move up/i });
    expect(moveUpBtns[0]).toBeDisabled();
  });

  it('Move Down button is disabled for the last module', () => {
    render(<CourseWizardStep2 modules={[MODULE_A, MODULE_B]} onChange={onChange} />);
    const moveDownBtns = screen.getAllByRole('button', { name: /move down/i });
    expect(moveDownBtns[moveDownBtns.length - 1]).toBeDisabled();
  });
});
