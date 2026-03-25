import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <div data-testid="page-header">{title}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/pipeline/PipelineRunHistory', () => ({
  PipelineRunHistory: () => <div data-testid="pipeline-run-history" />,
}));

vi.mock('@/components/pipeline/PipelinePrintStyles', () => ({
  PipelineExportButton: () => <div data-testid="pipeline-export-btn" />,
}));

import { PipelineToolbar } from './PipelineToolbar';
import type { PipelineNode } from '@/lib/lesson-pipeline.store';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NODES: PipelineNode[] = [
  { id: 'n1', moduleType: 'INGESTION', label: 'Ingestion', labelHe: 'איסוף', enabled: true, order: 0, config: {} },
  { id: 'n2', moduleType: 'ASR', label: 'ASR', labelHe: 'תמלול', enabled: true, order: 1, config: {} },
];

const SERVER_TEMPLATES = [
  { id: 'tpl-1', name: 'System Template', description: 'A system template', nodes: [{ moduleType: 'ASR' }], isSystem: true },
  { id: 'tpl-2', name: 'Custom Template', description: null, nodes: [{ moduleType: 'ASR' }, { moduleType: 'INGESTION' }], isSystem: false },
];

function defaultProps() {
  return {
    courseId: 'course-1',
    lessonId: 'lesson-1',
    lessonTitle: 'Test Lesson',
    isDirty: false,
    saving: false,
    isRunning: false,
    hasResults: false,
    canUndo: false,
    canRedo: false,
    serverTemplates: SERVER_TEMPLATES,
    nodes: NODES,
    onSave: vi.fn(),
    onRun: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onTemplateChange: vi.fn(),
    onServerTemplate: vi.fn(),
    onCreateTemplate: vi.fn().mockResolvedValue(true),
    onRestore: vi.fn(),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PipelineToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header with title', () => {
    render(<PipelineToolbar {...defaultProps()} />);
    expect(screen.getByTestId('page-header')).toHaveTextContent('Lesson Pipeline');
  });

  it('renders template picker', () => {
    render(<PipelineToolbar {...defaultProps()} />);
    expect(screen.getByTestId('template-picker')).toBeInTheDocument();
  });

  it('shows run history when lessonId provided', () => {
    render(<PipelineToolbar {...defaultProps()} />);
    expect(screen.getByTestId('pipeline-run-history')).toBeInTheDocument();
  });

  it('undo button disabled when canUndo is false', () => {
    render(<PipelineToolbar {...defaultProps()} />);
    expect(screen.getByTestId('undo-btn')).toBeDisabled();
  });

  it('undo button enabled when canUndo is true', () => {
    const props = defaultProps();
    props.canUndo = true;
    render(<PipelineToolbar {...props} />);
    expect(screen.getByTestId('undo-btn')).not.toBeDisabled();
  });

  it('redo button disabled when canRedo is false', () => {
    render(<PipelineToolbar {...defaultProps()} />);
    expect(screen.getByTestId('redo-btn')).toBeDisabled();
  });

  it('save button disabled when not dirty', () => {
    render(<PipelineToolbar {...defaultProps()} />);
    expect(screen.getByTestId('save-btn')).toBeDisabled();
  });

  it('save button enabled when dirty', () => {
    const props = defaultProps();
    props.isDirty = true;
    render(<PipelineToolbar {...props} />);
    expect(screen.getByTestId('save-btn')).not.toBeDisabled();
  });

  it('save button shows saving text when saving', () => {
    const props = defaultProps();
    props.saving = true;
    render(<PipelineToolbar {...props} />);
    expect(screen.getByTestId('save-btn')).toHaveTextContent('שומר...');
  });

  it('run button shows running text when running', () => {
    const props = defaultProps();
    props.isRunning = true;
    render(<PipelineToolbar {...props} />);
    expect(screen.getByTestId('run-btn')).toHaveTextContent('מריץ...');
  });

  it('run button shows default text when not running', () => {
    render(<PipelineToolbar {...defaultProps()} />);
    expect(screen.getByTestId('run-btn')).toHaveTextContent('הפעל Pipeline');
  });

  it('calls onUndo when undo button clicked', () => {
    const props = defaultProps();
    props.canUndo = true;
    render(<PipelineToolbar {...props} />);
    fireEvent.click(screen.getByTestId('undo-btn'));
    expect(props.onUndo).toHaveBeenCalledTimes(1);
  });

  it('calls onRedo when redo button clicked', () => {
    const props = defaultProps();
    props.canRedo = true;
    render(<PipelineToolbar {...props} />);
    fireEvent.click(screen.getByTestId('redo-btn'));
    expect(props.onRedo).toHaveBeenCalledTimes(1);
  });

  it('calls onRun when run button clicked', () => {
    const props = defaultProps();
    render(<PipelineToolbar {...props} />);
    fireEvent.click(screen.getByTestId('run-btn'));
    expect(props.onRun).toHaveBeenCalledTimes(1);
  });

  it('shows save-as-template button', () => {
    render(<PipelineToolbar {...defaultProps()} />);
    expect(screen.getByTestId('save-as-template-btn')).toBeInTheDocument();
  });

  it('save-as-template disabled when no nodes', () => {
    const props = defaultProps();
    props.nodes = [];
    render(<PipelineToolbar {...props} />);
    expect(screen.getByTestId('save-as-template-btn')).toBeDisabled();
  });

  it('clicking save-as-template shows name input', () => {
    render(<PipelineToolbar {...defaultProps()} />);
    fireEvent.click(screen.getByTestId('save-as-template-btn'));
    expect(screen.getByTestId('template-name-input')).toBeInTheDocument();
  });

  it('confirm save template calls onCreateTemplate', async () => {
    const props = defaultProps();
    render(<PipelineToolbar {...props} />);
    fireEvent.click(screen.getByTestId('save-as-template-btn'));
    fireEvent.change(screen.getByTestId('template-name-input'), { target: { value: 'My Template' } });
    fireEvent.click(screen.getByTestId('confirm-save-template'));
    await waitFor(() => {
      expect(props.onCreateTemplate).toHaveBeenCalledWith('My Template');
    });
  });

  it('template picker includes server templates', () => {
    render(<PipelineToolbar {...defaultProps()} />);
    const picker = screen.getByTestId('template-picker');
    expect(picker).toHaveTextContent('System Template');
    expect(picker).toHaveTextContent('Custom Template');
  });

  it('selecting template type calls onTemplateChange', () => {
    const props = defaultProps();
    render(<PipelineToolbar {...props} />);
    fireEvent.change(screen.getByTestId('template-picker'), { target: { value: 'THEMATIC' } });
    expect(props.onTemplateChange).toHaveBeenCalledWith('THEMATIC');
  });

  it('selecting server template calls onServerTemplate', () => {
    const props = defaultProps();
    render(<PipelineToolbar {...props} />);
    fireEvent.change(screen.getByTestId('template-picker'), { target: { value: 'server:tpl-1' } });
    expect(props.onServerTemplate).toHaveBeenCalledWith(SERVER_TEMPLATES[0]);
  });
});
