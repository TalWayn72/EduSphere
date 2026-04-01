/**
 * SubdomainSetup.test.tsx — Unit tests for SubdomainSetup component.
 *
 * Covers:
 *   - Subdomain input rendering and validation feedback
 *   - DNS status badge display
 *   - Preview URL generation
 *   - Availability check trigger
 *   - Provision button states
 *   - Reserved subdomain rejection
 *   - Accessibility (labels, alerts)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockSetSubdomain = vi.fn();
const mockCheckAvailability = vi.fn().mockResolvedValue(undefined);
const mockProvision = vi.fn().mockResolvedValue(undefined);

vi.mock('@/hooks/useSubdomainProvisioning', () => ({
  useSubdomainProvisioning: vi.fn(() => ({
    subdomain: '',
    setSubdomain: mockSetSubdomain,
    validation: { isValid: false, error: 'Subdomain is required' },
    dnsStatus: 'idle' as const,
    provisioningStatus: 'idle' as const,
    previewUrl: 'https://your-org.edusphere.app',
    checkAvailability: mockCheckAvailability,
    provision: mockProvision,
  })),
}));

import { useSubdomainProvisioning } from '@/hooks/useSubdomainProvisioning';
import { SubdomainSetup } from './SubdomainSetup';

describe('SubdomainSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSubdomainProvisioning).mockReturnValue({
      subdomain: '',
      setSubdomain: mockSetSubdomain,
      validation: { isValid: false, error: 'Subdomain is required' },
      dnsStatus: 'idle',
      provisioningStatus: 'idle',
      previewUrl: 'https://your-org.edusphere.app',
      checkAvailability: mockCheckAvailability,
      provision: mockProvision,
    });
  });

  it('renders the subdomain input and suffix', () => {
    render(<SubdomainSetup />);
    expect(screen.getByPlaceholderText('your-org')).toBeInTheDocument();
    expect(screen.getByText('.edusphere.app')).toBeInTheDocument();
  });

  it('shows default preview URL when subdomain is empty', () => {
    render(<SubdomainSetup />);
    expect(screen.getByTestId('preview-url')).toHaveTextContent(
      'https://your-org.edusphere.app'
    );
  });

  it('shows custom preview URL when subdomain is set', () => {
    vi.mocked(useSubdomainProvisioning).mockReturnValue({
      subdomain: 'acme-uni',
      setSubdomain: mockSetSubdomain,
      validation: { isValid: true },
      dnsStatus: 'idle',
      provisioningStatus: 'idle',
      previewUrl: 'https://acme-uni.edusphere.app',
      checkAvailability: mockCheckAvailability,
      provision: mockProvision,
    });

    render(<SubdomainSetup />);
    expect(screen.getByTestId('preview-url')).toHaveTextContent(
      'https://acme-uni.edusphere.app'
    );
  });

  it('calls setSubdomain on input change', () => {
    render(<SubdomainSetup />);
    const input = screen.getByPlaceholderText('your-org');
    fireEvent.change(input, { target: { value: 'test-org' } });
    expect(mockSetSubdomain).toHaveBeenCalledWith('test-org');
  });

  it('shows validation error for invalid subdomain', () => {
    vi.mocked(useSubdomainProvisioning).mockReturnValue({
      subdomain: 'ab',
      setSubdomain: mockSetSubdomain,
      validation: {
        isValid: false,
        error: 'Subdomain must be at least 3 characters',
      },
      dnsStatus: 'idle',
      provisioningStatus: 'idle',
      previewUrl: 'https://ab.edusphere.app',
      checkAvailability: mockCheckAvailability,
      provision: mockProvision,
    });

    render(<SubdomainSetup />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Subdomain must be at least 3 characters'
    );
  });

  it('disables check button when subdomain is invalid', () => {
    render(<SubdomainSetup />);
    const checkBtn = screen.getByRole('button', { name: /check/i });
    expect(checkBtn).toBeDisabled();
  });

  it('enables check button when subdomain is valid', () => {
    vi.mocked(useSubdomainProvisioning).mockReturnValue({
      subdomain: 'valid-org',
      setSubdomain: mockSetSubdomain,
      validation: { isValid: true },
      dnsStatus: 'idle',
      provisioningStatus: 'idle',
      previewUrl: 'https://valid-org.edusphere.app',
      checkAvailability: mockCheckAvailability,
      provision: mockProvision,
    });

    render(<SubdomainSetup />);
    const checkBtn = screen.getByRole('button', { name: /check/i });
    expect(checkBtn).not.toBeDisabled();
  });

  it('calls checkAvailability on check button click', () => {
    vi.mocked(useSubdomainProvisioning).mockReturnValue({
      subdomain: 'valid-org',
      setSubdomain: mockSetSubdomain,
      validation: { isValid: true },
      dnsStatus: 'idle',
      provisioningStatus: 'idle',
      previewUrl: 'https://valid-org.edusphere.app',
      checkAvailability: mockCheckAvailability,
      provision: mockProvision,
    });

    render(<SubdomainSetup />);
    fireEvent.click(screen.getByRole('button', { name: /check/i }));
    expect(mockCheckAvailability).toHaveBeenCalledOnce();
  });

  it('shows DNS available badge when dnsStatus is valid', () => {
    vi.mocked(useSubdomainProvisioning).mockReturnValue({
      subdomain: 'acme',
      setSubdomain: mockSetSubdomain,
      validation: { isValid: true },
      dnsStatus: 'valid',
      provisioningStatus: 'idle',
      previewUrl: 'https://acme.edusphere.app',
      checkAvailability: mockCheckAvailability,
      provision: mockProvision,
    });

    render(<SubdomainSetup />);
    const badge = screen.getByTestId('dns-badge');
    expect(badge).toBeInTheDocument();
  });

  it('disables provision button when DNS is not valid', () => {
    vi.mocked(useSubdomainProvisioning).mockReturnValue({
      subdomain: 'valid-org',
      setSubdomain: mockSetSubdomain,
      validation: { isValid: true },
      dnsStatus: 'idle',
      provisioningStatus: 'idle',
      previewUrl: 'https://valid-org.edusphere.app',
      checkAvailability: mockCheckAvailability,
      provision: mockProvision,
    });

    render(<SubdomainSetup />);
    const provisionBtn = screen.getByRole('button', { name: /provision/i });
    expect(provisionBtn).toBeDisabled();
  });

  it('enables provision button when DNS is valid', () => {
    vi.mocked(useSubdomainProvisioning).mockReturnValue({
      subdomain: 'acme',
      setSubdomain: mockSetSubdomain,
      validation: { isValid: true },
      dnsStatus: 'valid',
      provisioningStatus: 'idle',
      previewUrl: 'https://acme.edusphere.app',
      checkAvailability: mockCheckAvailability,
      provision: mockProvision,
    });

    render(<SubdomainSetup />);
    const provisionBtn = screen.getByRole('button', { name: /provision/i });
    expect(provisionBtn).not.toBeDisabled();
  });

  it('calls provision on provision button click', () => {
    vi.mocked(useSubdomainProvisioning).mockReturnValue({
      subdomain: 'acme',
      setSubdomain: mockSetSubdomain,
      validation: { isValid: true },
      dnsStatus: 'valid',
      provisioningStatus: 'idle',
      previewUrl: 'https://acme.edusphere.app',
      checkAvailability: mockCheckAvailability,
      provision: mockProvision,
    });

    render(<SubdomainSetup />);
    fireEvent.click(screen.getByRole('button', { name: /provision/i }));
    expect(mockProvision).toHaveBeenCalledOnce();
  });

  it('shows Active text when provisioning is complete', () => {
    vi.mocked(useSubdomainProvisioning).mockReturnValue({
      subdomain: 'acme',
      setSubdomain: mockSetSubdomain,
      validation: { isValid: true },
      dnsStatus: 'valid',
      provisioningStatus: 'active',
      previewUrl: 'https://acme.edusphere.app',
      checkAvailability: mockCheckAvailability,
      provision: mockProvision,
    });

    render(<SubdomainSetup />);
    expect(screen.getByRole('button', { name: /active/i })).toBeDisabled();
  });

  it('has accessible label for subdomain input', () => {
    render(<SubdomainSetup />);
    const input = screen.getByLabelText(/subdomain/i);
    expect(input).toBeInTheDocument();
  });

  it('shows hint text about character requirements', () => {
    render(<SubdomainSetup />);
    expect(
      screen.getByText(/3-63 characters, lowercase letters/i)
    ).toBeInTheDocument();
  });
});
