/**
 * PipelineConfigPanel unit tests.
 *
 * BUG-045 regression: hardcoded 'he' locale defaults replaced with DEFAULT_LOCALE.
 * Feature A: QA_GATE quality threshold shows ⓘ tooltip icon.
 * Feature B: Content language remembers last selection via localStorage.
 * Feature C: INGESTION module shows file upload input.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_LOCALE } from '@edusphere/i18n';

// ── Mock the lesson-pipeline store ───────────────────────────────────────────

const mockUpdateNodeConfig = vi.fn();
const mockToggleNode = vi.fn();

vi.mock('@/lib/lesson-pipeline.store', () => ({
  useLessonPipelineStore: vi.fn(() => ({
    updateNodeConfig: mockUpdateNodeConfig,
    toggleNode: mockToggleNode,
  })),
}));

import { PipelineConfigPanel } from './PipelineConfigPanel';
import type { PipelineNode } from '@/lib/lesson-pipeline.store';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNode(moduleType: string, config: Record<string, unknown> = {}): PipelineNode {
  return {
    id: 'node-1',
    label: 'Test Node',
    labelHe: 'צומת בדיקה',
    moduleType,
    enabled: true,
    config,
  } as unknown as PipelineNode;
}

// ── BUG-045 regression tests ──────────────────────────────────────────────────

describe('PipelineConfigPanel — BUG-045 regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('BUG-045: ASR node default language is DEFAULT_LOCALE, not hardcoded "he"', () => {
    // When no language is configured, it must default to DEFAULT_LOCALE ('en')
    const node = makeNode('ASR', {}); // no 'language' in config
    render(
      <PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe(DEFAULT_LOCALE);
    expect(select.value).not.toBe('he');
  });

  it('BUG-045: INGESTION content language default is DEFAULT_LOCALE, not "he"', () => {
    const node = makeNode('INGESTION', {}); // no 'locale' in config
    render(
      <PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />
    );
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    // The locale select is the last select in the ingestion config
    const localeSelect = selects.at(-1) as HTMLSelectElement;
    expect(localeSelect.value).toBe(DEFAULT_LOCALE);
    expect(localeSelect.value).not.toBe('he');
  });

  it('renders English i18n labels for Enable toggle', () => {
    const node = makeNode('ASR');
    render(
      <PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />
    );
    // English from content.json pipeline.enableModule
    expect(screen.getByText('Enable this module')).toBeInTheDocument();
    // Must NOT contain hardcoded Hebrew
    expect(screen.queryByText('הפעל מודול זה')).not.toBeInTheDocument();
  });

  it('renders English i18n label for ASR language field', () => {
    const node = makeNode('ASR');
    render(
      <PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />
    );
    expect(screen.getByText('Transcription language')).toBeInTheDocument();
    expect(screen.queryByText('שפת תמלול')).not.toBeInTheDocument();
  });

  it('renders English i18n labels for SUMMARIZATION style options', () => {
    const node = makeNode('SUMMARIZATION');
    render(
      <PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />
    );
    expect(screen.getByText('Summary style')).toBeInTheDocument();
    expect(screen.getByText('Academic')).toBeInTheDocument();
    expect(screen.getByText('Accessible')).toBeInTheDocument();
    expect(screen.getByText('Brief')).toBeInTheDocument();
  });

  it('renders English i18n labels for auto-module nodes', () => {
    const node = makeNode('CONTENT_CLEANING');
    render(
      <PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />
    );
    expect(
      screen.getByText('This module runs automatically — no additional settings.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('מודול זה פועל אוטומטית — אין הגדרות נוספות.')
    ).not.toBeInTheDocument();
  });

  it('close button has English aria-label', () => {
    const node = makeNode('ASR');
    render(
      <PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />
    );
    const closeBtn = screen.getByRole('button', { name: 'Close settings' });
    expect(closeBtn).toBeInTheDocument();
  });
});

// ── Feature A: QA_GATE tooltip ────────────────────────────────────────────────

describe('PipelineConfigPanel — Feature A: QA_GATE tooltip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('QA_GATE module shows ⓘ tooltip icon', () => {
    const node = makeNode('QA_GATE', { threshold: 70 });
    render(<PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />);
    const tooltip = screen.getByTestId('field-tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip.textContent).toBe('ⓘ');
  });

  it('QA_GATE tooltip has correct title attribute with explanation', () => {
    const node = makeNode('QA_GATE', { threshold: 80 });
    render(<PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />);
    const tooltip = screen.getByTestId('field-tooltip');
    const title = tooltip.getAttribute('title') ?? '';
    // Should contain meaningful content (from content.json pipeline.qualityThresholdTooltip)
    expect(title.length).toBeGreaterThan(10);
    expect(title).toContain('quality gate');
  });

  it('non-QA_GATE modules do NOT show tooltip icon', () => {
    const node = makeNode('ASR', {});
    render(<PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />);
    expect(screen.queryByTestId('field-tooltip')).not.toBeInTheDocument();
  });

  it('QA_GATE tooltip aria-label matches title', () => {
    const node = makeNode('QA_GATE', { threshold: 50 });
    render(<PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />);
    const tooltip = screen.getByTestId('field-tooltip');
    expect(tooltip.getAttribute('aria-label')).toBe(tooltip.getAttribute('title'));
  });
});

// ── Feature B: remembered content language ────────────────────────────────────

describe('PipelineConfigPanel — Feature B: remembered content language', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('content language defaults to i18n.language (en) when no localStorage entry', () => {
    // Global mock has i18n.language = 'en'; localStorage is clear
    const node = makeNode('INGESTION', {});
    render(<PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />);
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const localeSelect = selects.at(-1) as HTMLSelectElement;
    // i18n.language = 'en' from global setup.ts mock
    expect(localeSelect.value).toBe('en');
  });

  it('content language defaults to localStorage value when set', () => {
    localStorage.setItem('edusphere:pipeline:contentLocale', 'he');
    const node = makeNode('INGESTION', {});
    render(<PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />);
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const localeSelect = selects.at(-1) as HTMLSelectElement;
    expect(localeSelect.value).toBe('he');
  });

  it('changing content language persists to localStorage', () => {
    const node = makeNode('INGESTION', {});
    render(<PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />);
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const localeSelect = selects.at(-1) as HTMLSelectElement;

    act(() => {
      fireEvent.change(localeSelect, { target: { value: 'ar' } });
    });

    expect(localStorage.getItem('edusphere:pipeline:contentLocale')).toBe('ar');
  });

  it('locale select uses config value over defaultLocale when config.locale is set', () => {
    const node = makeNode('INGESTION', { locale: 'ar' });
    render(<PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />);
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const localeSelect = selects.at(-1) as HTMLSelectElement;
    expect(localeSelect.value).toBe('ar');
  });
});

// ── Feature C: file upload from device ───────────────────────────────────────

describe('PipelineConfigPanel — Feature C: file upload from device', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('INGESTION module shows file upload input', () => {
    const node = makeNode('INGESTION', {});
    render(<PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />);
    const fileInput = screen.getByTestId('ingestion-file-upload');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');
  });

  it('file upload input accepts video, audio, and document types', () => {
    const node = makeNode('INGESTION', {});
    render(<PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />);
    const fileInput = screen.getByTestId('ingestion-file-upload');
    const accept = fileInput.getAttribute('accept') ?? '';
    expect(accept).toContain('video/*');
    expect(accept).toContain('audio/*');
    expect(accept).toContain('.pdf');
  });

  it('upload section shows "Upload from device" label', () => {
    const node = makeNode('INGESTION', {});
    render(<PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />);
    // The label text comes from pipeline.uploadFromDevice i18n key
    expect(screen.getByText('Upload from device')).toBeInTheDocument();
  });

  it('upload section shows "Choose file..." placeholder before selection', () => {
    const node = makeNode('INGESTION', {});
    render(<PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />);
    expect(screen.getByText('Choose file...')).toBeInTheDocument();
  });

  it('non-INGESTION modules do NOT show file upload input', () => {
    const node = makeNode('ASR', {});
    render(<PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />);
    expect(screen.queryByTestId('ingestion-file-upload')).not.toBeInTheDocument();
  });

  it('uploading state hides after successful mock upload', async () => {
    // Mock URL.createObjectURL
    const mockObjectUrl = 'blob:http://localhost/mock-file';
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue(mockObjectUrl);

    const node = makeNode('INGESTION', {});
    render(<PipelineConfigPanel node={node} assets={[]} onClose={vi.fn()} />);

    const fileInput = screen.getByTestId('ingestion-file-upload');
    const mockFile = new File(['content'], 'lecture.mp4', { type: 'video/mp4' });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [mockFile] } });
    });

    // After upload, file name replaces placeholder
    expect(screen.getByText('lecture.mp4')).toBeInTheDocument();
    // Uploading spinner should NOT be present after completion
    expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
    // mockUpdateNodeConfig called with sourceUrl and sourceFileName
    expect(mockUpdateNodeConfig).toHaveBeenCalledWith(
      'node-1',
      expect.objectContaining({ sourceUrl: mockObjectUrl })
    );
  });
});
