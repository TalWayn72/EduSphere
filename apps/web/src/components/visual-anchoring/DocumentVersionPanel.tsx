import React from 'react';
import { useMutation, useQuery, gql } from 'urql';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const GET_DOCUMENT_VERSIONS = gql`
  query GetDocumentVersions($mediaAssetId: ID!) {
    getDocumentVersions(mediaAssetId: $mediaAssetId) {
      id
      versionNumber
      anchorCount
      brokenAnchorCount
      diffSummary
      createdAt
    }
  }
`;

const CREATE_DOCUMENT_VERSION = gql`
  mutation CreateDocumentVersion($mediaAssetId: ID!, $summary: String) {
    createDocumentVersion(mediaAssetId: $mediaAssetId, summary: $summary) {
      id
      versionNumber
      createdAt
    }
  }
`;

const ROLLBACK_TO_VERSION = gql`
  mutation RollbackToVersion($versionId: ID!) {
    rollbackToVersion(versionId: $versionId)
  }
`;

interface DocumentVersion {
  id: string;
  versionNumber: number;
  anchorCount: number;
  brokenAnchorCount: number;
  diffSummary: string | null;
  createdAt: string;
}

interface DocumentVersionPanelProps {
  mediaAssetId: string;
}

export default function DocumentVersionPanel({
  mediaAssetId,
}: DocumentVersionPanelProps) {
  const [{ data, fetching }] = useQuery({
    query: GET_DOCUMENT_VERSIONS,
    variables: { mediaAssetId },
  });

  const [, createVersion] = useMutation(CREATE_DOCUMENT_VERSION);
  const [, rollback] = useMutation(ROLLBACK_TO_VERSION);

  const versions = (data?.getDocumentVersions as DocumentVersion[]) ?? [];

  const handleCreateSnapshot = async () => {
    await createVersion({ mediaAssetId, summary: 'Manual snapshot' });
  };

  const handleRollback = async (versionId: string) => {
    if (
      !confirm('Roll back to this version? Current anchors will be replaced.')
    )
      return;
    await rollback({ versionId });
  };

  return (
    <div className="p-4 space-y-3" data-testid="document-version-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Version History</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void handleCreateSnapshot()}
        >
          Snapshot Now
        </Button>
      </div>

      {fetching ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No versions yet</p>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => (
            <VersionRow
              key={v.id}
              version={v}
              onRollback={() => void handleRollback(v.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VersionRow({
  version,
  onRollback,
}: {
  version: DocumentVersion;
  onRollback: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 p-2 rounded border bg-muted/30"
      data-testid={`version-row-${version.id}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">v{version.versionNumber}</p>
        <p className="text-xs text-muted-foreground truncate">
          {version.anchorCount} anchors
          {version.brokenAnchorCount > 0 && (
            <Badge variant="destructive" className="ml-1 text-xs">
              {version.brokenAnchorCount} broken
            </Badge>
          )}
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="text-xs shrink-0"
        onClick={onRollback}
        data-testid={`restore-btn-${version.id}`}
      >
        Restore
      </Button>
    </div>
  );
}
