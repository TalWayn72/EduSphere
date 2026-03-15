import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CertificateCard, type Certificate } from './CertificateCard';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_CERT: Certificate = {
  id: 'cert-001',
  courseId: 'crs-abc',
  issuedAt: '2026-01-15T12:00:00Z',
  verificationCode: 'VERIFY-ABC-123',
  pdfUrl: 'https://example.com/cert.pdf',
  metadata: { courseName: 'Introduction to AI' },
};

const MOCK_CERT_NO_META: Certificate = {
  id: 'cert-002',
  courseId: 'crs-def',
  issuedAt: '2026-03-01T08:30:00Z',
  verificationCode: 'VERIFY-DEF-456',
  pdfUrl: 'https://example.com/cert2.pdf',
  metadata: null,
};

function renderCard(
  cert: Certificate = MOCK_CERT,
  onDownload = vi.fn(),
) {
  return { ...render(<CertificateCard cert={cert} onDownload={onDownload} />), onDownload };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CertificateCard', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders the course name from metadata', () => {
    renderCard();
    expect(screen.getByText('Introduction to AI')).toBeInTheDocument();
  });

  it('falls back to "Course Certificate" when metadata is null', () => {
    renderCard(MOCK_CERT_NO_META);
    expect(screen.getByText('Course Certificate')).toBeInTheDocument();
  });

  it('falls back to "Course Certificate" when courseName is missing', () => {
    const cert: Certificate = { ...MOCK_CERT, metadata: { other: 'val' } };
    renderCard(cert);
    expect(screen.getByText('Course Certificate')).toBeInTheDocument();
  });

  it('displays the formatted issue date', () => {
    renderCard();
    // "January 15, 2026" in en-US locale (may vary, just check "2026" and "Issued")
    const issuedEl = screen.getByText(/Issued:/);
    expect(issuedEl).toBeInTheDocument();
    expect(issuedEl.textContent).toContain('2026');
  });

  it('displays the verification code', () => {
    renderCard();
    const codeEl = screen.getByTestId('verification-code');
    expect(codeEl).toHaveTextContent('VERIFY-ABC-123');
  });

  it('copies verification code to clipboard on copy button click', () => {
    renderCard();
    const copyBtn = screen.getByTestId('copy-code-btn');
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('VERIFY-ABC-123');
  });

  it('calls onDownload with cert id on download button click', () => {
    const { onDownload } = renderCard();
    const dlBtn = screen.getByTestId('download-btn');
    fireEvent.click(dlBtn);
    expect(onDownload).toHaveBeenCalledWith('cert-001');
  });

  it('has an accessible copy button with aria-label', () => {
    renderCard();
    const copyBtn = screen.getByRole('button', { name: /copy verification code/i });
    expect(copyBtn).toBeInTheDocument();
  });

  it('has a download button with visible text', () => {
    renderCard();
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
  });

  it('renders the certificate card container with data-testid', () => {
    renderCard();
    expect(screen.getByTestId('certificate-card')).toBeInTheDocument();
  });

  it('does not display raw i18n keys', () => {
    renderCard();
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/\b[a-z]+\.[a-z]+\.[a-z]+\b.*\{\{/);
    expect(html).not.toContain('{{');
  });
});
