import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  webContentLink?: string;
}

const DRIVE_API = 'https://www.googleapis.com/drive/v3';

@Injectable()
export class GoogleDriveClient {
  private readonly logger = new Logger(GoogleDriveClient.name);

  /** List non-folder files in a Drive folder */
  async listFolderContents(folderId: string, accessToken: string): Promise<DriveFile[]> {
    const query = encodeURIComponent(`'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`);
    const fields = encodeURIComponent('files(id,name,mimeType,size,webContentLink)');
    const url = `${DRIVE_API}/files?q=${query}&fields=${fields}&pageSize=100`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 403) {
      throw new BadRequestException('Insufficient Google Drive permissions. Please reconnect your account.');
    }
    if (!res.ok) {
      const body = await res.text();
      this.logger.error({ status: res.status, body }, 'Google Drive API error');
      throw new BadRequestException(`Google Drive API error: ${res.status}`);
    }

    const data = (await res.json()) as { files?: DriveFile[] };
    return data.files ?? [];
  }

  /** Download a file buffer for ingestion */
  async downloadFile(fileId: string, accessToken: string): Promise<Buffer> {
    const url = `${DRIVE_API}/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new BadRequestException(`Failed to download file ${fileId}: ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /** Build the Google OAuth2 authorization URL for the consent screen */
  buildAuthUrl(): string {
    const clientId = process.env['GOOGLE_CLIENT_ID'] ?? '';
    const redirectUri = encodeURIComponent(process.env['GOOGLE_REDIRECT_URI'] ?? 'http://localhost:5173/oauth/google/callback');
    const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.readonly');
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline`;
  }

  /** Exchange authorization code for access token */
  async exchangeCode(code: string): Promise<string> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env['GOOGLE_CLIENT_ID'] ?? '',
        client_secret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
        redirect_uri: process.env['GOOGLE_REDIRECT_URI'] ?? 'http://localhost:5173/oauth/google/callback',
        grant_type: 'authorization_code',
      }).toString(),
    });
    if (!res.ok) throw new BadRequestException('Failed to exchange Google OAuth code');
    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) throw new BadRequestException('No access_token in Google OAuth response');
    return data.access_token;
  }
}
