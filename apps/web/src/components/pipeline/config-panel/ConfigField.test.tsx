import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigField, ConfigSelect } from './ConfigField';

// ── ConfigField tests ─────────────────────────────────────────────────────────
describe('ConfigField — rendering', () => {
  it('renders the label text', () => {
    render(
      <ConfigField label="Batch Size">
        <input />
      </ConfigField>
    );
    expect(screen.getByText('Batch Size')).toBeTruthy();
  });

  it('renders children content', () => {
    render(
      <ConfigField label="Test">
        <span data-testid="child-content">Hello</span>
      </ConfigField>
    );
    expect(screen.getByTestId('child-content')).toBeTruthy();
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('does not render tooltip when not provided', () => {
    render(
      <ConfigField label="No Tip">
        <input />
      </ConfigField>
    );
    expect(screen.queryByTestId('field-tooltip')).toBeNull();
  });

  it('renders tooltip icon when tooltip is provided', () => {
    render(
      <ConfigField label="With Tip" tooltip="Help text here">
        <input />
      </ConfigField>
    );
    const tooltip = screen.getByTestId('field-tooltip');
    expect(tooltip).toBeTruthy();
    expect(tooltip.getAttribute('title')).toBe('Help text here');
  });

  it('sets aria-label on tooltip element', () => {
    render(
      <ConfigField label="Field" tooltip="Accessible help">
        <input />
      </ConfigField>
    );
    const tooltip = screen.getByTestId('field-tooltip');
    expect(tooltip.getAttribute('aria-label')).toBe('Accessible help');
  });

  it('renders multiple children', () => {
    render(
      <ConfigField label="Multi">
        <span data-testid="first">A</span>
        <span data-testid="second">B</span>
      </ConfigField>
    );
    expect(screen.getByTestId('first')).toBeTruthy();
    expect(screen.getByTestId('second')).toBeTruthy();
  });
});

// ── ConfigSelect tests ────────────────────────────────────────────────────────
describe('ConfigSelect — rendering', () => {
  const options = [
    { value: 'csv', label: 'CSV' },
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
  ];

  it('renders a select element', () => {
    render(<ConfigSelect value="csv" onChange={vi.fn()} options={options} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeTruthy();
  });

  it('renders all options', () => {
    render(<ConfigSelect value="csv" onChange={vi.fn()} options={options} />);
    const optionElements = screen.getAllByRole('option');
    expect(optionElements).toHaveLength(3);
  });

  it('renders option labels correctly', () => {
    render(<ConfigSelect value="csv" onChange={vi.fn()} options={options} />);
    expect(screen.getByText('CSV')).toBeTruthy();
    expect(screen.getByText('JSON')).toBeTruthy();
    expect(screen.getByText('XML')).toBeTruthy();
  });

  it('sets the correct selected value', () => {
    render(<ConfigSelect value="json" onChange={vi.fn()} options={options} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('json');
  });

  it('calls onChange with selected value when changed', () => {
    const onChange = vi.fn();
    render(<ConfigSelect value="csv" onChange={onChange} options={options} />);
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'xml' },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('xml');
  });

  it('renders with a single option', () => {
    const singleOption = [{ value: 'only', label: 'Only Option' }];
    render(
      <ConfigSelect value="only" onChange={vi.fn()} options={singleOption} />
    );
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByText('Only Option')).toBeTruthy();
  });

  it('renders with empty options array', () => {
    render(<ConfigSelect value="" onChange={vi.fn()} options={[]} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeTruthy();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});

describe('ConfigSelect — interaction sequences', () => {
  const formats = [
    { value: 'mp4', label: 'MP4' },
    { value: 'webm', label: 'WebM' },
    { value: 'avi', label: 'AVI' },
  ];

  it('calls onChange each time value changes', () => {
    const onChange = vi.fn();
    render(<ConfigSelect value="mp4" onChange={onChange} options={formats} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'webm' } });
    fireEvent.change(select, { target: { value: 'avi' } });
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenNthCalledWith(1, 'webm');
    expect(onChange).toHaveBeenNthCalledWith(2, 'avi');
  });
});
