import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders Live Now for LIVE status', () => {
    render(<StatusBadge status="LIVE" />);
    expect(screen.getByTestId('session-status-live')).toBeInTheDocument();
    expect(screen.getByText('Live Now')).toBeInTheDocument();
  });

  it('renders Scheduled for SCHEDULED status', () => {
    render(<StatusBadge status="SCHEDULED" />);
    expect(screen.getByTestId('session-status-scheduled')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('renders Ended for ENDED status', () => {
    render(<StatusBadge status="ENDED" />);
    expect(screen.getByTestId('session-status-ended')).toBeInTheDocument();
    expect(screen.getByText('Ended')).toBeInTheDocument();
  });
});
