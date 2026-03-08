import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as urql from 'urql';
import AssetPicker from './AssetPicker';
import type { VisualAsset } from './visual-anchor.types';

vi.mock('urql', async () => {
  const actual = await vi.importActual<typeof urql>('urql');
  return { ...actual, useQuery: vi.fn() };
});

// Mock AssetUploader to avoid its own dependencies
vi.mock('./AssetUploader', () => ({
  default: ({ onUploaded }: { courseId: string; onUploaded: (a: VisualAsset) => void }) => (
    <div data-testid="asset-uploader">
      <button
        onClick={() =>
          onUploaded({
            id: 'uploaded-1',
            filename: 'new.png',
            mimeType: 'image/png',
            storageUrl: 'http://minio/new.png',
            webpUrl: null,
            scanStatus: 'CLEAN',
            sizeBytes: 512,
            metadata: { altText: null },
            createdAt: '2026-01-01T00:00:00Z',
          })
        }
      >
        Simulate Upload
      </button>
    </div>
  ),
}));

const MOCK_ASSETS: VisualAsset[] = [
  {
    id: 'asset-1',
    filename: 'diagram.png',
    mimeType: 'image/png',
    storageUrl: 'http://minio/1.png',
    webpUrl: null,
    scanStatus: 'CLEAN',
    sizeBytes: 1024,
    metadata: { altText: 'A diagram' },
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'asset-2',
    filename: 'chart.jpg',
    mimeType: 'image/jpeg',
    storageUrl: 'http://minio/2.jpg',
    webpUrl: null,
    scanStatus: 'CLEAN',
    sizeBytes: 2048,
    metadata: { altText: null },
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'asset-3',
    filename: 'photo.webp',
    mimeType: 'image/webp',
    storageUrl: 'http://minio/3.webp',
    webpUrl: 'http://minio/3-opt.webp',
    scanStatus: 'CLEAN',
    sizeBytes: 512,
    metadata: { altText: 'A photo' },
    createdAt: '2026-01-03T00:00:00Z',
  },
];

const mockUseQuery = vi.mocked(urql.useQuery);

const DEFAULT_PROPS = {
  courseId: 'course-123',
  selectedAssetId: null,
  onSelect: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AssetPicker', () => {
  it('renders loading state while fetching assets', () => {
    mockUseQuery.mockReturnValue([
      { fetching: true, data: undefined, stale: false },
      vi.fn(),
    ] as never);

    render(<AssetPicker {...DEFAULT_PROPS} />);

    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveTextContent('Loading images…');
    expect(screen.queryByTestId('asset-picker')).not.toBeInTheDocument();
  });

  it('renders asset grid when assets are loaded', () => {
    mockUseQuery.mockReturnValue([
      { fetching: false, data: { getVisualAssets: MOCK_ASSETS }, stale: false },
      vi.fn(),
    ] as never);

    render(<AssetPicker {...DEFAULT_PROPS} />);

    expect(screen.getByTestId('asset-picker')).toBeInTheDocument();
    expect(screen.getByTestId('asset-option-asset-1')).toBeInTheDocument();
    expect(screen.getByTestId('asset-option-asset-2')).toBeInTheDocument();
    expect(screen.getByTestId('asset-option-asset-3')).toBeInTheDocument();

    // Thumbnails rendered as img elements
    const images = screen.getAllByRole('img');
    expect(images.length).toBe(3);
  });

  it('renders empty state when no assets are available', () => {
    mockUseQuery.mockReturnValue([
      { fetching: false, data: { getVisualAssets: [] }, stale: false },
      vi.fn(),
    ] as never);

    render(<AssetPicker {...DEFAULT_PROPS} />);

    expect(screen.getByText('No images uploaded yet.')).toBeInTheDocument();
    expect(screen.getByTestId('upload-first-asset-btn')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('filters assets by search query', () => {
    mockUseQuery.mockReturnValue([
      { fetching: false, data: { getVisualAssets: MOCK_ASSETS }, stale: false },
      vi.fn(),
    ] as never);

    render(<AssetPicker {...DEFAULT_PROPS} />);

    const searchInput = screen.getByTestId('asset-search-input');
    fireEvent.change(searchInput, { target: { value: 'diagram' } });

    // Only diagram.png should be visible
    expect(screen.getByTestId('asset-option-asset-1')).toBeInTheDocument();
    expect(screen.queryByTestId('asset-option-asset-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('asset-option-asset-3')).not.toBeInTheDocument();
  });

  it('shows "No images match your search" when filter yields no results', () => {
    mockUseQuery.mockReturnValue([
      { fetching: false, data: { getVisualAssets: MOCK_ASSETS }, stale: false },
      vi.fn(),
    ] as never);

    render(<AssetPicker {...DEFAULT_PROPS} />);

    fireEvent.change(screen.getByTestId('asset-search-input'), {
      target: { value: 'nonexistent-xyz' },
    });

    expect(screen.getByText('No images match your search.')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('calls onSelect when an asset is clicked', () => {
    const onSelect = vi.fn();
    mockUseQuery.mockReturnValue([
      { fetching: false, data: { getVisualAssets: MOCK_ASSETS }, stale: false },
      vi.fn(),
    ] as never);

    render(<AssetPicker {...DEFAULT_PROPS} onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId('asset-option-asset-1'));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith('asset-1');
  });

  it('calls onSelect with null when clicking an already-selected asset (deselect toggle)', () => {
    const onSelect = vi.fn();
    mockUseQuery.mockReturnValue([
      { fetching: false, data: { getVisualAssets: MOCK_ASSETS }, stale: false },
      vi.fn(),
    ] as never);

    render(<AssetPicker {...DEFAULT_PROPS} selectedAssetId="asset-2" onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId('asset-option-asset-2'));

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('shows asset filename as a visible label', () => {
    mockUseQuery.mockReturnValue([
      { fetching: false, data: { getVisualAssets: MOCK_ASSETS }, stale: false },
      vi.fn(),
    ] as never);

    render(<AssetPicker {...DEFAULT_PROPS} />);

    expect(screen.getByText('diagram.png')).toBeInTheDocument();
    expect(screen.getByText('chart.jpg')).toBeInTheDocument();
    expect(screen.getByText('photo.webp')).toBeInTheDocument();
  });

  it('excludes non-CLEAN assets from the grid', () => {
    const mixedAssets: VisualAsset[] = [
      ...MOCK_ASSETS,
      {
        id: 'asset-infected',
        filename: 'virus.png',
        mimeType: 'image/png',
        storageUrl: 'http://minio/bad.png',
        webpUrl: null,
        scanStatus: 'INFECTED',
        sizeBytes: 999,
        metadata: { altText: null },
        createdAt: '2026-01-04T00:00:00Z',
      },
      {
        id: 'asset-pending',
        filename: 'pending.png',
        mimeType: 'image/png',
        storageUrl: 'http://minio/pending.png',
        webpUrl: null,
        scanStatus: 'PENDING',
        sizeBytes: 888,
        metadata: { altText: null },
        createdAt: '2026-01-05T00:00:00Z',
      },
    ];

    mockUseQuery.mockReturnValue([
      { fetching: false, data: { getVisualAssets: mixedAssets }, stale: false },
      vi.fn(),
    ] as never);

    render(<AssetPicker {...DEFAULT_PROPS} />);

    expect(screen.queryByTestId('asset-option-asset-infected')).not.toBeInTheDocument();
    expect(screen.queryByTestId('asset-option-asset-pending')).not.toBeInTheDocument();
    expect(screen.getByTestId('asset-option-asset-1')).toBeInTheDocument();
  });

  it('toggles the uploader when "Upload new" button is clicked', () => {
    mockUseQuery.mockReturnValue([
      { fetching: false, data: { getVisualAssets: MOCK_ASSETS }, stale: false },
      vi.fn(),
    ] as never);

    render(<AssetPicker {...DEFAULT_PROPS} />);

    expect(screen.queryByTestId('asset-uploader')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('toggle-uploader-btn'));
    expect(screen.getByTestId('asset-uploader')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('toggle-uploader-btn'));
    expect(screen.queryByTestId('asset-uploader')).not.toBeInTheDocument();
  });

  it('calls onSelect with uploaded asset id and hides uploader after upload', () => {
    const onSelect = vi.fn();
    mockUseQuery.mockReturnValue([
      { fetching: false, data: { getVisualAssets: [] }, stale: false },
      vi.fn(),
    ] as never);

    render(<AssetPicker {...DEFAULT_PROPS} onSelect={onSelect} />);

    // Open uploader via the "Upload an image" button in the empty state
    fireEvent.click(screen.getByTestId('upload-first-asset-btn'));
    expect(screen.getByTestId('asset-uploader')).toBeInTheDocument();

    // Simulate upload completion
    fireEvent.click(screen.getByText('Simulate Upload'));

    expect(onSelect).toHaveBeenCalledWith('uploaded-1');
    expect(screen.queryByTestId('asset-uploader')).not.toBeInTheDocument();
  });

  it('uses webpUrl for thumbnail when available, falls back to storageUrl', () => {
    const assetsWithWebp: VisualAsset[] = [
      { ...MOCK_ASSETS[0], webpUrl: null },    // storageUrl only
      { ...MOCK_ASSETS[2], webpUrl: 'http://minio/3-opt.webp' }, // has webpUrl
    ];

    mockUseQuery.mockReturnValue([
      { fetching: false, data: { getVisualAssets: assetsWithWebp }, stale: false },
      vi.fn(),
    ] as never);

    render(<AssetPicker {...DEFAULT_PROPS} />);

    const images = screen.getAllByRole('img');
    const srcs = images.map((img) => (img as HTMLImageElement).src);

    expect(srcs).toContain('http://minio/1.png');           // fallback storageUrl
    expect(srcs).toContain('http://minio/3-opt.webp');     // preferred webpUrl
  });

  it('marks selected asset with aria-selected="true"', () => {
    mockUseQuery.mockReturnValue([
      { fetching: false, data: { getVisualAssets: MOCK_ASSETS }, stale: false },
      vi.fn(),
    ] as never);

    render(<AssetPicker {...DEFAULT_PROPS} selectedAssetId="asset-2" />);

    const selectedOption = screen.getByTestId('asset-option-asset-2');
    expect(selectedOption).toHaveAttribute('aria-selected', 'true');

    const unselectedOption = screen.getByTestId('asset-option-asset-1');
    expect(unselectedOption).toHaveAttribute('aria-selected', 'false');
  });
});
