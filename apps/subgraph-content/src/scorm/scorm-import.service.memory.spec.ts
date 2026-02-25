/**
 * Memory safety test for ScormImportService.
 * Verifies that onModuleDestroy calls closeAllPools.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const closeAllPoolsMock = vi.fn().mockResolvedValue(undefined);

class MockS3Client {
  send = vi.fn().mockResolvedValue({});
}
class MockPutObjectCommand {
  constructor(public args: unknown) {}
}

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: MockS3Client,
  PutObjectCommand: MockPutObjectCommand,
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn().mockReturnValue({}),
  schema: {
    courses: {},
    modules: {},
    contentItems: {},
    scormPackages: {},
  },
  closeAllPools: closeAllPoolsMock,
}));

describe('ScormImportService memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls closeAllPools on onModuleDestroy', async () => {
    const { ScormImportService } = await import('./scorm-import.service');
    const service = new ScormImportService();
    await service.onModuleDestroy();
    expect(closeAllPoolsMock).toHaveBeenCalledTimes(1);
  });
});
