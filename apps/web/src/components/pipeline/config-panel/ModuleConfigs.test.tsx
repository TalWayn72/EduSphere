import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModuleConfigs } from './ModuleConfigs';

// ── mocks ─────────────────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    },
  }),
}));

vi.mock('@edusphere/i18n', () => ({
  DEFAULT_LOCALE: 'he',
  LOCALE_LABELS: {
    he: { native: 'עברית' },
    en: { native: 'English' },
    ar: { native: 'العربية' },
  },
}));

vi.mock('./ConfigField', () => ({
  ConfigField: ({
    label,
    children,
  }: {
    label: string;
    tooltip?: string;
    children: React.ReactNode;
  }) => (
    <div data-testid={`config-field`}>
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

beforeEach(() => {
  vi.clearAllMocks();
});

// ── tests ─────────────────────────────────────────────────────────────────────
describe('ModuleConfigs — ASR module', () => {
  it('renders ASR language field', () => {
    render(
      <ModuleConfigs moduleType="ASR" config={{}} onChange={vi.fn()} />
    );
    expect(screen.getByText('pipeline.asrLanguage')).toBeTruthy();
  });

  it('defaults to DEFAULT_LOCALE when no language set', () => {
    render(
      <ModuleConfigs moduleType="ASR" config={{}} onChange={vi.fn()} />
    );
    const select = screen.getByTestId('config-select') as HTMLSelectElement;
    expect(select.value).toBe('he');
  });

  it('shows current language from config', () => {
    render(
      <ModuleConfigs
        moduleType="ASR"
        config={{ language: 'en' }}
        onChange={vi.fn()}
      />
    );
    const select = screen.getByTestId('config-select') as HTMLSelectElement;
    expect(select.value).toBe('en');
  });

  it('calls onChange with language key when changed', () => {
    const onChange = vi.fn();
    render(
      <ModuleConfigs moduleType="ASR" config={{}} onChange={onChange} />
    );
    fireEvent.change(screen.getByTestId('config-select'), {
      target: { value: 'ar' },
    });
    expect(onChange).toHaveBeenCalledWith('language', 'ar');
  });
});

describe('ModuleConfigs — SUMMARIZATION module', () => {
  it('renders summarization style field', () => {
    render(
      <ModuleConfigs moduleType="SUMMARIZATION" config={{}} onChange={vi.fn()} />
    );
    expect(screen.getByText('pipeline.summarizationStyle')).toBeTruthy();
  });

  it('defaults to academic style', () => {
    render(
      <ModuleConfigs moduleType="SUMMARIZATION" config={{}} onChange={vi.fn()} />
    );
    const select = screen.getByTestId('config-select') as HTMLSelectElement;
    expect(select.value).toBe('academic');
  });

  it('calls onChange with style when changed', () => {
    const onChange = vi.fn();
    render(
      <ModuleConfigs moduleType="SUMMARIZATION" config={{}} onChange={onChange} />
    );
    fireEvent.change(screen.getByTestId('config-select'), {
      target: { value: 'friendly' },
    });
    expect(onChange).toHaveBeenCalledWith('style', 'friendly');
  });
});

describe('ModuleConfigs — DIAGRAM_GENERATOR module', () => {
  it('renders diagram type field', () => {
    render(
      <ModuleConfigs moduleType="DIAGRAM_GENERATOR" config={{}} onChange={vi.fn()} />
    );
    expect(screen.getByText('pipeline.diagramType')).toBeTruthy();
  });

  it('defaults to mindmap type', () => {
    render(
      <ModuleConfigs moduleType="DIAGRAM_GENERATOR" config={{}} onChange={vi.fn()} />
    );
    const select = screen.getByTestId('config-select') as HTMLSelectElement;
    expect(select.value).toBe('mindmap');
  });

  it('calls onChange with diagramType when changed', () => {
    const onChange = vi.fn();
    render(
      <ModuleConfigs moduleType="DIAGRAM_GENERATOR" config={{}} onChange={onChange} />
    );
    fireEvent.change(screen.getByTestId('config-select'), {
      target: { value: 'flowchart' },
    });
    expect(onChange).toHaveBeenCalledWith('diagramType', 'flowchart');
  });
});

describe('ModuleConfigs — CITATION_VERIFIER module', () => {
  it('renders strict mode checkbox', () => {
    render(
      <ModuleConfigs moduleType="CITATION_VERIFIER" config={{}} onChange={vi.fn()} />
    );
    expect(screen.getByTestId('strict-mode-toggle')).toBeTruthy();
    expect(screen.getByText('pipeline.strictMode')).toBeTruthy();
  });

  it('checkbox is unchecked when strictMode is false', () => {
    render(
      <ModuleConfigs
        moduleType="CITATION_VERIFIER"
        config={{ strictMode: false }}
        onChange={vi.fn()}
      />
    );
    const cb = screen.getByTestId('strict-mode-toggle') as HTMLInputElement;
    expect(cb.checked).toBe(false);
  });

  it('checkbox is checked when strictMode is true', () => {
    render(
      <ModuleConfigs
        moduleType="CITATION_VERIFIER"
        config={{ strictMode: true }}
        onChange={vi.fn()}
      />
    );
    const cb = screen.getByTestId('strict-mode-toggle') as HTMLInputElement;
    expect(cb.checked).toBe(true);
  });

  it('calls onChange with strictMode when toggled', () => {
    const onChange = vi.fn();
    render(
      <ModuleConfigs
        moduleType="CITATION_VERIFIER"
        config={{ strictMode: false }}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByTestId('strict-mode-toggle'));
    expect(onChange).toHaveBeenCalledWith('strictMode', true);
  });
});

describe('ModuleConfigs — QA_GATE module', () => {
  it('renders quality threshold slider', () => {
    render(
      <ModuleConfigs moduleType="QA_GATE" config={{}} onChange={vi.fn()} />
    );
    expect(screen.getByTestId('qa-threshold')).toBeTruthy();
  });

  it('defaults to 70 threshold', () => {
    render(
      <ModuleConfigs moduleType="QA_GATE" config={{}} onChange={vi.fn()} />
    );
    const slider = screen.getByTestId('qa-threshold') as HTMLInputElement;
    expect(slider.value).toBe('70');
  });

  it('shows custom threshold from config', () => {
    render(
      <ModuleConfigs
        moduleType="QA_GATE"
        config={{ threshold: 90 }}
        onChange={vi.fn()}
      />
    );
    const slider = screen.getByTestId('qa-threshold') as HTMLInputElement;
    expect(slider.value).toBe('90');
  });

  it('calls onChange with threshold when slider moved', () => {
    const onChange = vi.fn();
    render(
      <ModuleConfigs moduleType="QA_GATE" config={{}} onChange={onChange} />
    );
    fireEvent.change(screen.getByTestId('qa-threshold'), {
      target: { value: '85' },
    });
    expect(onChange).toHaveBeenCalledWith('threshold', 85);
  });
});

describe('ModuleConfigs — auto modules', () => {
  it.each([
    'NER_SOURCE_LINKING',
    'CONTENT_CLEANING',
    'STRUCTURED_NOTES',
    'PUBLISH_SHARE',
  ])('renders auto module message for %s', (moduleType) => {
    render(
      <ModuleConfigs moduleType={moduleType} config={{}} onChange={vi.fn()} />
    );
    expect(screen.getByText('pipeline.autoModule')).toBeTruthy();
  });
});

describe('ModuleConfigs — unknown module', () => {
  it('renders nothing for unknown module type', () => {
    const { container } = render(
      <ModuleConfigs moduleType="UNKNOWN_MODULE" config={{}} onChange={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });
});
