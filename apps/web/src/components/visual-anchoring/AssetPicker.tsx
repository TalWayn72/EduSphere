/**
 * AssetPicker — grid of existing course visual assets with search and selection.
 * Only shows CLEAN assets. Empty state offers upload via AssetUploader.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from 'urql';
import { Search, ImageOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GET_VISUAL_ASSETS } from './visual-anchor.graphql';
import type { VisualAsset } from './visual-anchor.types';
import AssetUploader from './AssetUploader';

interface AssetPickerProps {
  courseId: string;
  selectedAssetId: string | null;
  onSelect: (assetId: string | null) => void;
}

export default function AssetPicker({ courseId, selectedAssetId, onSelect }: AssetPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploader, setShowUploader] = useState(false);

  const [{ data, fetching }] = useQuery({
    query: GET_VISUAL_ASSETS,
    variables: { courseId },
  });

  const allAssets: VisualAsset[] = useMemo(
    () =>
      ((data?.getVisualAssets ?? []) as VisualAsset[]).filter(
        (a) => a.scanStatus === 'CLEAN',
      ),
    [data],
  );

  const filteredAssets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allAssets;
    return allAssets.filter((a) => a.filename.toLowerCase().includes(q));
  }, [allAssets, searchQuery]);

  const handleSelect = useCallback(
    (assetId: string) => {
      onSelect(selectedAssetId === assetId ? null : assetId);
    },
    [onSelect, selectedAssetId],
  );

  const handleUploaded = useCallback(
    (asset: VisualAsset) => {
      setShowUploader(false);
      onSelect(asset.id);
    },
    [onSelect],
  );

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        Loading images…
      </div>
    );
  }

  return (
    <div data-testid="asset-picker" className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search images…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-sm"
            data-testid="asset-search-input"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUploader((v) => !v)}
          data-testid="toggle-uploader-btn"
        >
          Upload new
        </Button>
      </div>

      {showUploader && (
        <AssetUploader courseId={courseId} onUploaded={handleUploaded} />
      )}

      {!showUploader && filteredAssets.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-8 text-center">
          <ImageOff className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {allAssets.length === 0
              ? 'No images uploaded yet.'
              : 'No images match your search.'}
          </p>
          {allAssets.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUploader(true)}
              data-testid="upload-first-asset-btn"
            >
              Upload an image
            </Button>
          )}
        </div>
      )}

      {!showUploader && filteredAssets.length > 0 && (
        <div
          className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto rounded-md"
          role="listbox"
          aria-label="Available images"
        >
          {filteredAssets.map((asset) => {
            const isSelected = selectedAssetId === asset.id;
            const thumb = asset.webpUrl ?? asset.storageUrl;
            return (
              <button
                key={asset.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(asset.id)}
                data-testid={`asset-option-${asset.id}`}
                className={cn(
                  'group relative flex flex-col overflow-hidden rounded-md border text-left',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'transition-all hover:border-primary/60',
                  isSelected && 'ring-2 ring-primary border-primary',
                )}
              >
                <div className="aspect-video w-full overflow-hidden bg-muted">
                  <img
                    src={thumb}
                    alt={asset.metadata.altText ?? asset.filename}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <p className="truncate px-1.5 py-1 text-xs text-muted-foreground">
                  {asset.filename}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
