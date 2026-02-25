import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import AdmZip from 'adm-zip';

const mockS3Send = vi.fn().mockResolvedValue({});

// Both S3Client and PutObjectCommand must be classes (used with `new`)
class MockS3Client {
  send = mockS3Send;
}
class MockPutObjectCommand {
  constructor(public args: unknown) {}
}

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: MockS3Client,
  PutObjectCommand: MockPutObjectCommand,
}));

const mockReturning = vi.fn();
const mockValues = vi.fn();
const mockInsert = vi.fn();

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    insert: mockInsert,
  })),
  schema: {
    courses: { $inferInsert: {} },
    modules: { $inferInsert: {} },
    contentItems: { $inferInsert: {} },
    scormPackages: { $inferInsert: {} },
  },
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

function createMockZip(hasManifest: boolean): Buffer {
  const zip = new AdmZip();
  if (hasManifest) {
    const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="test-course" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="org1">
    <organization identifier="org1">
      <title>Test Course</title>
      <item identifier="item1" identifierref="res1" isvisible="true">
        <title>Lesson 1</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res1" type="webcontent" href="index.html"></resource>
  </resources>
</manifest>`;
    zip.addFile('imsmanifest.xml', Buffer.from(manifest, 'utf-8'));
    zip.addFile('index.html', Buffer.from('<html><body>Test</body></html>', 'utf-8'));
    zip.addFile('style.css', Buffer.from('body { margin: 0; }', 'utf-8'));
  }
  return zip.toBuffer();
}

describe('ScormImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([{ id: 'mock-id', course_id: 'mock-course' }]);
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });
  });

  it('throws BadRequestException when imsmanifest.xml is missing', async () => {
    const { ScormImportService } = await import('./scorm-import.service');
    const service = new ScormImportService();
    const zip = createMockZip(false);
    await expect(service.importScormPackage(zip, 'tenant-1', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for invalid ZIP buffer', async () => {
    const { ScormImportService } = await import('./scorm-import.service');
    const service = new ScormImportService();
    const badBuffer = Buffer.from('not a zip file');
    await expect(service.importScormPackage(badBuffer, 'tenant-1', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('parses manifest and returns courseId and itemCount', async () => {
    const { ScormImportService } = await import('./scorm-import.service');
    const service = new ScormImportService();
    const zip = createMockZip(true);
    const result = await service.importScormPackage(zip, 'tenant-1', 'user-1');
    expect(result).toHaveProperty('courseId');
    expect(result).toHaveProperty('itemCount');
    expect((result as { itemCount: number }).itemCount).toBeGreaterThanOrEqual(1);
  });

  it('calls MinIO PutObject for each file in the ZIP', async () => {
    const { ScormImportService } = await import('./scorm-import.service');
    const service = new ScormImportService();
    const zip = createMockZip(true);
    await service.importScormPackage(zip, 'tenant-1', 'user-1');
    // ZIP has index.html + style.css + imsmanifest.xml = 3 files
    expect(mockS3Send).toHaveBeenCalledTimes(3);
  });

  it('calls onModuleDestroy without error', async () => {
    const { ScormImportService } = await import('./scorm-import.service');
    const service = new ScormImportService();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});
