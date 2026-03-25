import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('./useModuleMutations', () => ({
  useModuleMutations: () => ({
    pending: new Set(),
    handleReorder: vi.fn(),
    handleDeleteModule: vi.fn(),
    handleSaveModuleTitle: vi.fn(),
    handleAddModule: vi.fn(),
    handleAddContentItem: vi.fn(),
  }),
}));

vi.mock('./ModuleCard', () => ({
  ModuleCard: ({ mod }: { mod: { title: string } }) => <div data-testid="module-card">{mod.title}</div>,
}));

vi.mock('./AddModuleForm', () => ({
  AddModuleForm: () => <div data-testid="add-module-form" />,
}));

import { CourseEditModules } from './CourseEditModules';

const modules = [
  { id: 'm-1', title: 'Module A', orderIndex: 1, contentItems: [] },
  { id: 'm-2', title: 'Module B', orderIndex: 0, contentItems: [] },
];

describe('CourseEditModules', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders module cards', () => {
    render(<CourseEditModules courseId="c-1" modules={modules} onRefetch={vi.fn()} onToast={vi.fn()} />);
    expect(screen.getAllByTestId('module-card')).toHaveLength(2);
  });

  it('renders modules sorted by orderIndex', () => {
    render(<CourseEditModules courseId="c-1" modules={modules} onRefetch={vi.fn()} onToast={vi.fn()} />);
    const cards = screen.getAllByTestId('module-card');
    expect(cards[0]).toHaveTextContent('Module B');
    expect(cards[1]).toHaveTextContent('Module A');
  });

  it('renders add module form', () => {
    render(<CourseEditModules courseId="c-1" modules={modules} onRefetch={vi.fn()} onToast={vi.fn()} />);
    expect(screen.getByTestId('add-module-form')).toBeInTheDocument();
  });
});
