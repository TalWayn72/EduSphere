import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { VsCompetitorsSection } from './VsCompetitorsSection';

describe('VsCompetitorsSection', () => {
  it('renders the section heading', () => {
    render(<VsCompetitorsSection />);
    expect(screen.getByText(/Why Switch from Canvas/i)).toBeInTheDocument();
  });

  it('renders all competitor column headers', () => {
    render(<VsCompetitorsSection />);
    expect(screen.getByText('EduSphere')).toBeInTheDocument();
    expect(screen.getByText('Canvas')).toBeInTheDocument();
    expect(screen.getByText('D2L')).toBeInTheDocument();
    expect(screen.getByText('Blackboard')).toBeInTheDocument();
    expect(screen.getByText('Docebo')).toBeInTheDocument();
  });

  it('renders all 12 feature rows', () => {
    render(<VsCompetitorsSection />);
    expect(screen.getByText('Knowledge Graph AI')).toBeInTheDocument();
    expect(screen.getByText('Visual Anchoring Sidebar')).toBeInTheDocument();
    expect(screen.getByText('Air-Gapped / On-Premise')).toBeInTheDocument();
    expect(screen.getByText('AI Chavruta Tutor')).toBeInTheDocument();
    expect(screen.getByText(/AI Course Builder/i)).toBeInTheDocument();
    expect(screen.getByText(/GraphRAG/i)).toBeInTheDocument();
    expect(screen.getByText('White-label Included')).toBeInTheDocument();
    expect(screen.getByText(/Open-source core/i)).toBeInTheDocument();
    expect(screen.getByText(/Offline-first mobile/i)).toBeInTheDocument();
    expect(screen.getByText(/B2B2C Partner API/i)).toBeInTheDocument();
  });

  it('EduSphere column shows all checkmarks (yes)', () => {
    render(<VsCompetitorsSection />);
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    // Each data row (skip header) should have EduSphere as first data cell = Yes
    const dataRows = rows.slice(1);
    dataRows.forEach((row) => {
      const cells = within(row).getAllByRole('cell');
      // cells[1] is EduSphere column
      expect(cells[1]).toHaveTextContent('✅');
    });
  });

  it('renders the legend note', () => {
    render(<VsCompetitorsSection />);
    expect(screen.getByText(/Based on publicly available documentation/i)).toBeInTheDocument();
  });
});
