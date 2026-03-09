import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DriveImportCardProps {
  courseId: string;
  moduleId: string;
  onImport: (folderId: string, accessToken: string) => void;
  isImporting: boolean;
}

export function DriveImportCard({ courseId: _courseId, moduleId: _moduleId, onImport, isImporting }: DriveImportCardProps) {
  const [connected, setConnected] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [folderId, setFolderId] = useState('');

  function handleConnectDrive() {
    // In production: open OAuth popup and receive code via postMessage
    // For now: simulate connection (real OAuth requires GOOGLE_CLIENT_ID env var)
    const mockToken = 'mock-access-token';
    setAccessToken(mockToken);
    setConnected(true);
  }

  function extractFolderId(input: string): string {
    // Handle full Drive URLs: https://drive.google.com/drive/folders/FOLDER_ID
    const match = /\/folders\/([a-zA-Z0-9_-]+)/.exec(input);
    return match?.[1] ?? input;
  }

  function handleImport() {
    const id = extractFolderId(folderId);
    if (!id || !accessToken) return;
    onImport(id, accessToken);
  }

  return (
    <div className="space-y-4" data-testid="drive-import-card">
      {!connected ? (
        <Button
          onClick={handleConnectDrive}
          variant="outline"
          data-testid="connect-drive-btn"
          className="w-full"
        >
          Connect Google Drive
        </Button>
      ) : (
        <p className="text-sm text-green-600" data-testid="drive-connected-msg">
          Google Drive connected ✓
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="drive-folder-id">Google Drive Folder URL or ID</Label>
        <Input
          id="drive-folder-id"
          data-testid="drive-folder-input"
          placeholder="https://drive.google.com/drive/folders/..."
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          disabled={!connected}
        />
      </div>

      <Button
        onClick={handleImport}
        disabled={!connected || !folderId.trim() || isImporting}
        data-testid="drive-import-btn"
        className="w-full"
      >
        {isImporting ? 'Importing...' : 'Import from Drive'}
      </Button>
    </div>
  );
}
