import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IngestionConfig } from './IngestionConfig';
import type { LessonAsset } from '../PipelineConfigPanel';

// ── mocks ─────────────────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('./ConfigField', () => ({
  ConfigField: ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div data-testid={`config-field-${label}`}>
      <label>{label}</label>
      {children}
    </div>
  ),
  ConfigSelect: ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <select
      data-testid="config-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

// ── fixtures ──────────────────────────────────────────────────────────────────
const mockVideoAsset: LessonAsset = {
  id: 'v1',
  fileUrl: 'https://cdn.test/video.mp4',
  sourceUrl: null,
};

const mockAudioAsset: LessonAsset = {
  id: 'a1',
  fileUrl: null,
  sourceUrl: 'https://cdn.test/audio.mp3',
};

const mockNotesAsset: LessonAsset = {
  id: 'n1',
  fileUrl: 'https://cdn.test/notes.pdf',
  sourceUrl: null,
};

const defaultProps = {
  config: {} as Record<string, unknown>,
  videoAssets: [] as LessonAsset[],
  audioAssets: [] as LessonAsset[],
  notesAssets: [] as LessonAsset[],
  onChange: vi.fn(),
  defaultLocale: 'he',
  onLocaleChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

function renderConfig(overrides: Partial<typeof defaultProps> = {}) {
  return render(<IngestionConfig {...{ ...defaultProps, ...overrides }} />);
}

// ── tests ─────────────────────────────────────────────────────────────────────
describe('IngestionConfig — rendering', () => {
  it('renders source file field', () => {
    renderConfig();
    expect(screen.getByText('pipeline.sourceFile')).toBeTruthy();
  });

  it('renders manual URL field', () => {
    renderConfig();
    expect(screen.getByText('pipeline.manualUrl')).toBeTruthy();
  });

  it('renders content language field', () => {
    renderConfig();
    expect(screen.getByText('pipeline.contentLanguage')).toBeTruthy();
  });

  it('renders upload from device field', () => {
    renderConfig();
    expect(screen.getByText('pipeline.uploadFromDevice')).toBeTruthy();
  });

  it('renders asset picker dropdown', () => {
    renderConfig();
    expect(screen.getByTestId('ingestion-asset-picker')).toBeTruthy();
  });

  it('renders source URL input', () => {
    renderConfig();
    expect(screen.getByTestId('ingestion-source-url')).toBeTruthy();
  });

  it('renders file upload input', () => {
    renderConfig();
    expect(screen.getByTestId('ingestion-file-upload')).toBeTruthy();
  });
});

describe('IngestionConfig — asset picker', () => {
  it('shows video assets in dropdown', () => {
    renderConfig({ videoAssets: [mockVideoAsset] });
    const option = screen.getByText(
      /cdn\.test\/video\.mp4.*pipeline\.assetVideo/
    );
    expect(option).toBeTruthy();
  });

  it('shows audio assets in dropdown', () => {
    renderConfig({ audioAssets: [mockAudioAsset] });
    const option = screen.getByText(
      /cdn\.test\/audio\.mp3.*pipeline\.assetAudio/
    );
    expect(option).toBeTruthy();
  });

  it('shows notes assets in dropdown', () => {
    renderConfig({ notesAssets: [mockNotesAsset] });
    const option = screen.getByText(
      /cdn\.test\/notes\.pdf.*pipeline\.assetNotes/
    );
    expect(option).toBeTruthy();
  });

  it('calls onChange when asset selected', () => {
    const onChange = vi.fn();
    renderConfig({ videoAssets: [mockVideoAsset], onChange });
    fireEvent.change(screen.getByTestId('ingestion-asset-picker'), {
      target: { value: 'https://cdn.test/video.mp4' },
    });
    expect(onChange).toHaveBeenCalledWith(
      'sourceUrl',
      'https://cdn.test/video.mp4'
    );
  });

  it('calls onChange with undefined when empty option selected', () => {
    const onChange = vi.fn();
    renderConfig({ onChange });
    fireEvent.change(screen.getByTestId('ingestion-asset-picker'), {
      target: { value: '' },
    });
    expect(onChange).toHaveBeenCalledWith('sourceUrl', undefined);
  });
});

describe('IngestionConfig — manual URL input', () => {
  it('shows current URL from config', () => {
    renderConfig({ config: { sourceUrl: 'https://example.com/vid.mp4' } });
    const input = screen.getByTestId(
      'ingestion-source-url'
    ) as HTMLInputElement;
    expect(input.value).toBe('https://example.com/vid.mp4');
  });

  it('calls onChange when URL typed', () => {
    const onChange = vi.fn();
    renderConfig({ onChange });
    fireEvent.change(screen.getByTestId('ingestion-source-url'), {
      target: { value: 'https://new-url.com' },
    });
    expect(onChange).toHaveBeenCalledWith('sourceUrl', 'https://new-url.com');
  });
});

describe('IngestionConfig — language select', () => {
  it('renders language select with default locale', () => {
    renderConfig({ defaultLocale: 'en' });
    const selects = screen.getAllByTestId('config-select');
    const langSelect = selects[0] as HTMLSelectElement;
    expect(langSelect.value).toBe('en');
  });
});

describe('IngestionConfig — file upload', () => {
  it('shows choose file text initially', () => {
    renderConfig();
    expect(screen.getByText('pipeline.chooseFile')).toBeTruthy();
  });
});
