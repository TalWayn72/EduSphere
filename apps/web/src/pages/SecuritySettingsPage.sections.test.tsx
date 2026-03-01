/**
 * SecuritySettingsPage.sections.test.tsx
 * Tests for MfaSection, SessionSection, PasswordSection, AccessControlSection.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  SecurityFormValues,
  MfaSection,
  SessionSection,
  PasswordSection,
  AccessControlSection,
} from './SecuritySettingsPage.sections';

const BASE: SecurityFormValues = {
  mfaRequired: false,
  mfaRequiredForAdmins: false,
  sessionTimeoutMinutes: 60,
  maxConcurrentSessions: 3,
  loginAttemptLockoutThreshold: 5,
  passwordMinLength: 8,
  passwordRequireSpecialChars: false,
  passwordExpiryDays: '90',
  ipAllowlist: '',
};

// ---------------------------------------------------------------------------
// MfaSection
// ---------------------------------------------------------------------------
describe('MfaSection', () => {
  it('renders Multi-Factor Authentication heading', () => {
    render(<MfaSection values={BASE} onChange={vi.fn()} />);
    expect(
      screen.getByText('Multi-Factor Authentication')
    ).toBeInTheDocument();
  });

  it('renders both MFA toggle labels', () => {
    render(<MfaSection values={BASE} onChange={vi.fn()} />);
    expect(screen.getByText('Require MFA for all users')).toBeInTheDocument();
    expect(screen.getByText('Require MFA for admins')).toBeInTheDocument();
  });

  it('toggle for all users reflects checked=false', () => {
    render(<MfaSection values={BASE} onChange={vi.fn()} />);
    const sw = screen.getByRole('switch', { name: 'Require MFA for all users' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with mfaRequired=true when toggle clicked', () => {
    const onChange = vi.fn();
    render(<MfaSection values={BASE} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Require MFA for all users' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mfaRequired: true })
    );
  });

  it('toggle for admins reflects checked=true when value is true', () => {
    render(
      <MfaSection
        values={{ ...BASE, mfaRequiredForAdmins: true }}
        onChange={vi.fn()}
      />
    );
    const sw = screen.getByRole('switch', { name: 'Require MFA for admins' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange with mfaRequiredForAdmins=true when admin toggle clicked', () => {
    const onChange = vi.fn();
    render(<MfaSection values={BASE} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Require MFA for admins' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mfaRequiredForAdmins: true })
    );
  });
});

// ---------------------------------------------------------------------------
// SessionSection
// ---------------------------------------------------------------------------
describe('SessionSection', () => {
  it('renders Session Management heading', () => {
    render(<SessionSection values={BASE} onChange={vi.fn()} />);
    expect(screen.getByText('Session Management')).toBeInTheDocument();
  });

  it('renders timeout select and max concurrent input', () => {
    render(<SessionSection values={BASE} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Session Timeout')).toBeInTheDocument();
    expect(screen.getByLabelText('Max Concurrent Sessions')).toBeInTheDocument();
  });

  it('calls onChange with updated maxConcurrentSessions', () => {
    const onChange = vi.fn();
    render(<SessionSection values={BASE} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Max Concurrent Sessions'), {
      target: { value: '5' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ maxConcurrentSessions: 5 })
    );
  });

  it('calls onChange with updated sessionTimeoutMinutes', () => {
    const onChange = vi.fn();
    render(<SessionSection values={BASE} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Session Timeout'), {
      target: { value: '30' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ sessionTimeoutMinutes: 30 })
    );
  });
});

// ---------------------------------------------------------------------------
// PasswordSection
// ---------------------------------------------------------------------------
describe('PasswordSection', () => {
  it('renders Password Policy heading', () => {
    render(<PasswordSection values={BASE} onChange={vi.fn()} />);
    expect(screen.getByText('Password Policy')).toBeInTheDocument();
  });

  it('renders minimum length and expiry inputs', () => {
    render(<PasswordSection values={BASE} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Minimum Length')).toBeInTheDocument();
    expect(screen.getByLabelText('Expiry Days (0 = never)')).toBeInTheDocument();
  });

  it('calls onChange with updated passwordMinLength', () => {
    const onChange = vi.fn();
    render(<PasswordSection values={BASE} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Minimum Length'), {
      target: { value: '12' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ passwordMinLength: 12 })
    );
  });

  it('calls onChange with updated passwordExpiryDays', () => {
    const onChange = vi.fn();
    render(<PasswordSection values={BASE} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Expiry Days (0 = never)'), {
      target: { value: '0' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ passwordExpiryDays: '0' })
    );
  });

  it('special chars toggle starts unchecked', () => {
    render(<PasswordSection values={BASE} onChange={vi.fn()} />);
    const sw = screen.getByRole('switch', { name: 'Require special characters' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with passwordRequireSpecialChars=true on toggle click', () => {
    const onChange = vi.fn();
    render(<PasswordSection values={BASE} onChange={onChange} />);
    fireEvent.click(
      screen.getByRole('switch', { name: 'Require special characters' })
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ passwordRequireSpecialChars: true })
    );
  });
});

// ---------------------------------------------------------------------------
// AccessControlSection
// ---------------------------------------------------------------------------
describe('AccessControlSection', () => {
  it('renders Access Control heading', () => {
    render(<AccessControlSection values={BASE} onChange={vi.fn()} />);
    expect(screen.getByText('Access Control')).toBeInTheDocument();
  });

  it('renders lockout threshold and ip allowlist inputs', () => {
    render(<AccessControlSection values={BASE} onChange={vi.fn()} />);
    expect(
      screen.getByLabelText('Login Attempt Lockout Threshold')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        'IP Allowlist (one CIDR per line; leave empty to allow all)'
      )
    ).toBeInTheDocument();
  });

  it('calls onChange with updated lockout threshold', () => {
    const onChange = vi.fn();
    render(<AccessControlSection values={BASE} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Login Attempt Lockout Threshold'), {
      target: { value: '10' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ loginAttemptLockoutThreshold: 10 })
    );
  });

  it('calls onChange with updated ipAllowlist', () => {
    const onChange = vi.fn();
    render(<AccessControlSection values={BASE} onChange={onChange} />);
    fireEvent.change(
      screen.getByLabelText(
        'IP Allowlist (one CIDR per line; leave empty to allow all)'
      ),
      { target: { value: '10.0.0.0/8' } }
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ ipAllowlist: '10.0.0.0/8' })
    );
  });
});
