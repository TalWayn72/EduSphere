/**
 * BlueprintDistributionEditor component tests
 *
 * Verifies:
 *  1. Renders title
 *  2. Renders all distribution items with labels
 *  3. Shows total percentage
 *  4. Shows valid (green) total when ~100%
 *  5. Shows invalid (red) total and alert when far from 100%
 *  6. Renders visual distribution bar
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  BlueprintDistributionEditor,
  type DistributionItem,
} from './BlueprintDistributionEditor';

const items: DistributionItem[] = [
  { label: 'Algebra', weight: 40, minPercent: 30, maxPercent: 50 },
  { label: 'Geometry', weight: 35, minPercent: 25, maxPercent: 45 },
  { label: 'Statistics', weight: 25, minPercent: 15, maxPercent: 35 },
];

describe('BlueprintDistributionEditor', () => {
  it('renders the title', () => {
    render(
      <BlueprintDistributionEditor
        title="Domain Distribution"
        items={items}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Domain Distribution')).toBeInTheDocument();
  });

  it('renders all item labels', () => {
    render(
      <BlueprintDistributionEditor
        title="Test"
        items={items}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Algebra')).toBeInTheDocument();
    expect(screen.getByText('Geometry')).toBeInTheDocument();
    expect(screen.getByText('Statistics')).toBeInTheDocument();
  });

  it('shows total percentage (100%)', () => {
    render(
      <BlueprintDistributionEditor
        title="Test"
        items={items}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Total: 100%')).toBeInTheDocument();
  });

  it('shows green total when valid (98-102%)', () => {
    render(
      <BlueprintDistributionEditor
        title="Test"
        items={items}
        onChange={vi.fn()}
      />
    );
    const total = screen.getByText('Total: 100%');
    expect(total.className).toContain('green');
  });

  it('shows red total and alert when invalid', () => {
    const badItems = [
      { label: 'A', weight: 20, minPercent: 0, maxPercent: 100 },
      { label: 'B', weight: 30, minPercent: 0, maxPercent: 100 },
    ];
    render(
      <BlueprintDistributionEditor
        title="Test"
        items={badItems}
        onChange={vi.fn()}
      />
    );
    const total = screen.getByText('Total: 50%');
    expect(total.className).toContain('red');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText(/Weights must sum to approximately 100%/)
    ).toBeInTheDocument();
  });

  it('does not show alert when total is valid', () => {
    render(
      <BlueprintDistributionEditor
        title="Test"
        items={items}
        onChange={vi.fn()}
      />
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders slider aria labels for each item', () => {
    render(
      <BlueprintDistributionEditor
        title="Test"
        items={items}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Algebra weight')).toBeInTheDocument();
    expect(screen.getByLabelText('Geometry weight')).toBeInTheDocument();
    expect(screen.getByLabelText('Statistics weight')).toBeInTheDocument();
  });

  it('renders min/max inputs for each item', () => {
    render(
      <BlueprintDistributionEditor
        title="Test"
        items={items}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Algebra min %')).toBeInTheDocument();
    expect(screen.getByLabelText('Algebra max %')).toBeInTheDocument();
  });
});
