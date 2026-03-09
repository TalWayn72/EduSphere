import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';

// Mock global fetch
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { GoogleDriveClient } from './google-drive.client.js';

describe('GoogleDriveClient', () => {
  let client: GoogleDriveClient;

  beforeEach(() => {
    client = new GoogleDriveClient();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('listFolderContents returns files array', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ files: [{ id: 'f1', name: 'video.mp4', mimeType: 'video/mp4', size: '1000' }] }),
    } as Response);
    const files = await client.listFolderContents('folder-123', 'token-abc');
    expect(files).toHaveLength(1);
    expect(files[0]?.name).toBe('video.mp4');
  });

  it('listFolderContents throws BadRequestException on 403', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, text: async () => 'Forbidden' } as Response);
    await expect(client.listFolderContents('folder-123', 'bad-token')).rejects.toThrow(BadRequestException);
  });

  it('listFolderContents returns empty array for empty folder', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ files: [] }),
    } as Response);
    const files = await client.listFolderContents('empty-folder', 'token-abc');
    expect(files).toHaveLength(0);
  });

  it('downloadFile returns Buffer', async () => {
    const mockData = new Uint8Array([1, 2, 3, 4]);
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 200,
      arrayBuffer: async () => mockData.buffer,
    } as unknown as Response);
    const buf = await client.downloadFile('file-123', 'token-abc');
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBe(4);
  });
});
