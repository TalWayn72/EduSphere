/**
 * BrandingSettingsPage.form.test.tsx
 * Tests for BrandingIdentityCard, BrandingLogosCard, BrandingColorsCard, BrandingMiscCard.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  BrandingFormState,
  BrandingIdentityCard,
  BrandingLogosCard,
  BrandingColorsCard,
  BrandingMiscCard,
} from './BrandingSettingsPage.form';

const BASE_FORM: BrandingFormState = {
  logoUrl: '',
  logoMarkUrl: '',
  faviconUrl: '',
  primaryColor: '#4f46e5',
  secondaryColor: '#06b6d4',
  accentColor: '#f59e0b',
  backgroundColor: '#ffffff',
  fontFamily: 'Inter',
  organizationName: 'Acme Corp',
  tagline: 'Learn Anything',
  privacyPolicyUrl: '',
  termsOfServiceUrl: '',
  supportEmail: 'help@acme.com',
  hideEduSphereBranding: false,
};

describe('BrandingIdentityCard', () => {
  it('renders Organization Identity heading', () => {
    render(<BrandingIdentityCard form={BASE_FORM} onChange={vi.fn()} />);
    expect(screen.getByText('Organization Identity')).toBeInTheDocument();
  });

  it('displays current organizationName value', () => {
    render(<BrandingIdentityCard form={BASE_FORM} onChange={vi.fn()} />);
    const input = screen.getByDisplayValue('Acme Corp');
    expect(input).toBeInTheDocument();
  });

  it('calls onChange with updated organizationName', () => {
    const onChange = vi.fn();
    render(<BrandingIdentityCard form={BASE_FORM} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('Acme Corp'), {
      target: { value: 'New Corp' },
    });
    expect(onChange).toHaveBeenCalledWith('organizationName', 'New Corp');
  });

  it('calls onChange when tagline is updated', () => {
    const onChange = vi.fn();
    render(<BrandingIdentityCard form={BASE_FORM} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('Learn Anything'), {
      target: { value: 'New Tagline' },
    });
    expect(onChange).toHaveBeenCalledWith('tagline', 'New Tagline');
  });

  it('calls onChange when supportEmail is updated', () => {
    const onChange = vi.fn();
    render(<BrandingIdentityCard form={BASE_FORM} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('help@acme.com'), {
      target: { value: 'new@acme.com' },
    });
    expect(onChange).toHaveBeenCalledWith('supportEmail', 'new@acme.com');
  });
});

describe('BrandingLogosCard', () => {
  it('renders Logos & Favicon heading', () => {
    render(<BrandingLogosCard form={BASE_FORM} onChange={vi.fn()} />);
    expect(screen.getByText('Logos & Favicon')).toBeInTheDocument();
  });

  it('does not show logo preview when logoUrl is empty', () => {
    render(<BrandingLogosCard form={BASE_FORM} onChange={vi.fn()} />);
    expect(screen.queryByAltText('Logo preview')).not.toBeInTheDocument();
  });

  it('shows logo preview when logoUrl is provided', () => {
    render(
      <BrandingLogosCard
        form={{ ...BASE_FORM, logoUrl: 'https://example.com/logo.png' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByAltText('Logo preview')).toBeInTheDocument();
  });

  it('calls onChange when logoUrl input changes', () => {
    const onChange = vi.fn();
    render(<BrandingLogosCard form={BASE_FORM} onChange={onChange} />);
    const inputs = screen.getAllByPlaceholderText('https://...');
    fireEvent.change(inputs[0]!, {
      target: { value: 'https://cdn.example.com/logo.png' },
    });
    expect(onChange).toHaveBeenCalledWith(
      'logoUrl',
      'https://cdn.example.com/logo.png'
    );
  });
});

describe('BrandingColorsCard', () => {
  it('renders Colors heading', () => {
    render(<BrandingColorsCard form={BASE_FORM} onChange={vi.fn()} />);
    expect(screen.getByText('Colors')).toBeInTheDocument();
  });

  it('renders all four color labels', () => {
    render(<BrandingColorsCard form={BASE_FORM} onChange={vi.fn()} />);
    expect(screen.getByText('Primary Color')).toBeInTheDocument();
    expect(screen.getByText('Secondary Color')).toBeInTheDocument();
    expect(screen.getByText('Accent Color')).toBeInTheDocument();
    expect(screen.getByText('Background Color')).toBeInTheDocument();
  });

  it('calls onChange when primary color text input changes', () => {
    const onChange = vi.fn();
    render(<BrandingColorsCard form={BASE_FORM} onChange={onChange} />);
    const textInputs = screen
      .getAllByDisplayValue('#4f46e5')
      .filter((el) => (el as HTMLInputElement).type === 'text');
    fireEvent.change(textInputs[0]!, { target: { value: '#123456' } });
    expect(onChange).toHaveBeenCalledWith('primaryColor', '#123456');
  });
});

describe('BrandingMiscCard', () => {
  it('renders Typography, Policies & Branding heading', () => {
    render(<BrandingMiscCard form={BASE_FORM} onChange={vi.fn()} />);
    expect(
      screen.getByText('Typography, Policies & Branding')
    ).toBeInTheDocument();
  });

  it('renders font family select with Inter selected', () => {
    render(<BrandingMiscCard form={BASE_FORM} onChange={vi.fn()} />);
    const select = screen.getByDisplayValue('Inter');
    expect(select).toBeInTheDocument();
  });

  it('calls onChange when font family changes', () => {
    const onChange = vi.fn();
    render(<BrandingMiscCard form={BASE_FORM} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('Inter'), {
      target: { value: 'Roboto' },
    });
    expect(onChange).toHaveBeenCalledWith('fontFamily', 'Roboto');
  });

  it('checkbox reflects hideEduSphereBranding=false', () => {
    render(<BrandingMiscCard form={BASE_FORM} onChange={vi.fn()} />);
    const checkbox = screen.getByLabelText('Hide EduSphere Branding') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('calls onChange with boolean true when checkbox is toggled on', () => {
    const onChange = vi.fn();
    render(<BrandingMiscCard form={BASE_FORM} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Hide EduSphere Branding'));
    expect(onChange).toHaveBeenCalledWith('hideEduSphereBranding', true);
  });
});
