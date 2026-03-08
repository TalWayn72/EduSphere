/**
 * AssetUploader unit tests
 *
 * Covers:
 *  1. Shows idle state (upload zone) initially
 *  2. File > 15 MB shows client-side error immediately (no mutation call)
 *  3. Successful upload flow reaches 'success' state and calls onUploaded
 *  4. PUT fetch failure sets error state
 *  5. Infected scan result sets infected state
 *  6. Reset ("Try again") returns to idle state
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { VisualAsset } from './visual-anchor.types';

// ── urql mock ──────────────────────────────────────────────────────────────────
const mockConfirmUpload = vi.fn();
const mockQueryFn = vi.fn();

vi.mock('urql', () => ({
  useMutation: vi.fn(() => [{ fetching: false, error: undefined }, mockConfirmUpload]),
  useClient: vi.fn(() => ({ query: mockQueryFn })),
  gql: vi.fn((s: TemplateStringsArray) => String(s)),
}));

vi.mock('./visual-anchor.graphql', () => ({
  CONFIRM_VISUAL_ASSET_UPLOAD: 'CONFIRM_VISUAL_ASSET_UPLOAD',
  GET_PRESIGNED_UPLOAD_URL: 'GET_PRESIGNED_UPLOAD_URL',
}));

// ── lucide-react mock ──────────────────────────────────────────────────────────
vi.mock('lucide-react', () => ({
  Upload: () => <span data-testid="icon-upload" />,
  CheckCircle: () => <span data-testid="icon-check" />,
  AlertCircle: () => <span data-testid="icon-alert-circle" />,
  Loader2: () => <span data-testid="icon-loader" />,
  ShieldAlert: () => <span data-testid="icon-shield" />,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    'data-testid': testId,
  }: React.HTMLAttributes<HTMLButtonElement> & { onClick?: () => void; 'data-testid'?: string }) => (
    <button onClick={onClick} data-testid={testId}>{children}</button>
  ),
}));

vi.mock('@/lib/utils', () => ({ cn: (...args: string[]) => args.filter(Boolean).join(' ') }));

import AssetUploader from './AssetUploader';

// ── helpers ────────────────────────────────────────────────────────────────────

const CLEAN_ASSET: VisualAsset = {
  id: 'asset-1',
  filename: 'photo.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  storageUrl: 'https://minio/photo.jpg',
  webpUrl: null,
  scanStatus: 'CLEAN',
  metadata: { width: 800, height: 600, altText: null },
  createdAt: '2026-01-01T00:00:00Z',
};

function makeFile(name: string, sizeBytes: number, type = 'image/jpeg') {
  const file = new File(['x'.repeat(Math.min(sizeBytes, 10))], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

function renderUploader(onUploaded = vi.fn()) {
  return { onUploaded, ...render(<AssetUploader courseId="course-1" onUploaded={onUploaded} />) };
}

function dropFile(container: HTMLElement, file: File) {
  const zone = container.querySelector('[data-testid="asset-uploader"] > div');
  if (!zone) throw new Error('Drop zone not found');
  fireEvent.drop(zone, { dataTransfer: { files: [file] } });
}

// ── tests ──────────────────────────────────────────────────────────────────────

describe('AssetUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: PUT succeeds
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  it('shows idle upload zone initially', () => {
    renderUploader();
    expect(screen.getByTestId('asset-uploader')).toBeInTheDocument();
    expect(screen.getByText(/Drop an image here/)).toBeInTheDocument();
    expect(screen.getByTestId('icon-upload')).toBeInTheDocument();
  });

  it('shows client-side error for file > 15 MB without calling mutation', async () => {
    const { container } = renderUploader();
    const bigFile = makeFile('big.jpg', 16 * 1024 * 1024);

    await act(async () => {
      dropFile(container, bigFile);
    });

    await waitFor(() => {
      expect(screen.getByText(/15 MB/)).toBeInTheDocument();
    });

    expect(mockQueryFn).not.toHaveBeenCalled();
    expect(mockConfirmUpload).not.toHaveBeenCalled();
  });

  it('shows uploading spinner during upload', async () => {
    // Make presigned URL call hang so we can inspect intermediate state
    mockQueryFn.mockReturnValue(new Promise(() => {}));

    const { container } = renderUploader();
    const file = makeFile('photo.jpg', 500 * 1024);

    act(() => {
      dropFile(container, file);
    });

    await waitFor(() => {
      expect(screen.getByText('Uploading…')).toBeInTheDocument();
      expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
    });
  });

  it('reaches success state and calls onUploaded after full flow', async () => {
    mockQueryFn.mockResolvedValue({
      data: { getPresignedUploadUrl: { uploadUrl: 'https://minio/upload', fileKey: 'key-abc', expiresAt: '' } },
      error: undefined,
    });
    mockConfirmUpload.mockResolvedValue({
      data: { confirmVisualAssetUpload: CLEAN_ASSET },
      error: undefined,
    });

    const { container, onUploaded } = renderUploader();
    const file = makeFile('photo.jpg', 500 * 1024);

    await act(async () => {
      dropFile(container, file);
    });

    await waitFor(() => {
      expect(screen.getByText(/uploaded and ready/i)).toBeInTheDocument();
      expect(screen.getByTestId('icon-check')).toBeInTheDocument();
    });

    expect(onUploaded).toHaveBeenCalledWith(CLEAN_ASSET);
  });

  it('shows error state when PUT to MinIO fails', async () => {
    mockQueryFn.mockResolvedValue({
      data: { getPresignedUploadUrl: { uploadUrl: 'https://minio/upload', fileKey: 'key-abc', expiresAt: '' } },
      error: undefined,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const { container } = renderUploader();

    await act(async () => {
      dropFile(container, makeFile('photo.jpg', 500 * 1024));
    });

    await waitFor(() => {
      expect(screen.getByText(/Upload failed/)).toBeInTheDocument();
      expect(screen.getByTestId('icon-alert-circle')).toBeInTheDocument();
    });

    expect(mockConfirmUpload).not.toHaveBeenCalled();
  });

  it('shows infected state when scan returns INFECTED', async () => {
    mockQueryFn.mockResolvedValue({
      data: { getPresignedUploadUrl: { uploadUrl: 'https://minio/upload', fileKey: 'key-abc', expiresAt: '' } },
      error: undefined,
    });
    mockConfirmUpload.mockResolvedValue({
      data: { confirmVisualAssetUpload: { ...CLEAN_ASSET, scanStatus: 'INFECTED' } },
      error: undefined,
    });

    const { container } = renderUploader();

    await act(async () => {
      dropFile(container, makeFile('photo.jpg', 500 * 1024));
    });

    await waitFor(() => {
      expect(screen.getByTestId('icon-shield')).toBeInTheDocument();
      expect(screen.getByText(/flagged by security scan/i)).toBeInTheDocument();
    });
  });

  it('returns to idle state when "Try again" is clicked after error', async () => {
    mockQueryFn.mockResolvedValue({
      data: { getPresignedUploadUrl: { uploadUrl: 'https://minio/upload', fileKey: 'key-abc', expiresAt: '' } },
      error: undefined,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const { container } = renderUploader();

    await act(async () => {
      dropFile(container, makeFile('photo.jpg', 500 * 1024));
    });

    await waitFor(() => {
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Try again'));

    expect(screen.getByText(/Drop an image here/)).toBeInTheDocument();
  });

  it('shows error when presigned URL query fails', async () => {
    mockQueryFn.mockResolvedValue({
      data: undefined,
      error: new Error('Network error'),
    });

    const { container } = renderUploader();

    await act(async () => {
      dropFile(container, makeFile('photo.jpg', 500 * 1024));
    });

    await waitFor(() => {
      expect(screen.getByText(/Could not initiate upload/)).toBeInTheDocument();
    });
  });
});
