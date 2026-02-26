import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException as _NotFoundException } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { generateManifest2004, injectScormApiShim } from './scorm-manifest.generator';
import type { CourseData } from './scorm-manifest.generator';
import type { ContentItem } from '@edusphere/db';

// ── S3 mock ──────────────────────────────────────────────────────────────────
const mockS3Send = vi.fn();
class MockS3Client {
  send = mockS3Send;
}
class MockPutObjectCommand {
  constructor(public args: unknown) {}
}
class MockGetObjectCommand {
  constructor(public args: unknown) {}
}
const mockGetSignedUrl = vi.fn().mockResolvedValue('https://minio.example.com/presigned');

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: MockS3Client,
  PutObjectCommand: MockPutObjectCommand,
  GetObjectCommand: MockGetObjectCommand,
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

// ── DB mock ───────────────────────────────────────────────────────────────────
const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
const mockWithTenantContext = vi.fn();

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: {
    courses: { $inferSelect: {} },
    modules: { $inferSelect: {} },
    contentItems: { $inferSelect: {} },
  },
  eq: vi.fn(),
  and: vi.fn(),
  withTenantContext: mockWithTenantContext,
  closeAllPools: mockCloseAllPools,
  sql: new Proxy({}, { get: () => vi.fn() }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeCourse(overrides: Partial<CourseData> = {}): CourseData {
  return { id: 'course-123', title: 'Test Course', description: null, ...overrides };
}

function makeItem(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: 'item-1',
    moduleId: 'mod-1',
    title: 'Lesson 1',
    type: 'MARKDOWN',
    content: null,
    fileId: null,
    duration: null,
    orderIndex: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ContentItem;
}

const TENANT_CTX = { tenantId: 'tenant-1', userId: 'user-1', userRole: 'INSTRUCTOR' as const };

// ── Unit tests for generateManifest2004 (pure function — no service needed) ──

describe('generateManifest2004', () => {
  it('produces valid XML with schema version "2004 4th Edition"', () => {
    const xml = generateManifest2004(makeCourse(), [makeItem()]);
    expect(xml).toContain('<schemaversion>2004 4th Edition</schemaversion>');
    expect(xml).toContain('<schema>ADL SCORM</schema>');
  });

  it('includes all content items as <item> elements', () => {
    const items = [makeItem({ id: 'i1', title: 'Intro' }), makeItem({ id: 'i2', title: 'Quiz' })];
    const xml = generateManifest2004(makeCourse(), items);
    expect(xml).toContain('ITEM-i1');
    expect(xml).toContain('ITEM-i2');
    expect(xml).toContain('<title>Intro</title>');
    expect(xml).toContain('<title>Quiz</title>');
  });

  it('sets correct organization identifier', () => {
    const course = makeCourse({ id: 'abc-xyz' });
    const xml = generateManifest2004(course, [makeItem()]);
    expect(xml).toContain('identifier="ORG-abc-xyz"');
    expect(xml).toContain('default="ORG-abc-xyz"');
  });

  it('escapes special XML characters in course title', () => {
    const course = makeCourse({ title: 'Course & <Fun>' });
    const xml = generateManifest2004(course, []);
    expect(xml).toContain('Course &amp; &lt;Fun&gt;');
  });
});

// ── Unit tests for injectScormApiShim ─────────────────────────────────────────

describe('injectScormApiShim', () => {
  it('adds API_1484_11 to HTML before </head>', () => {
    const html = '<html><head><title>T</title></head><body></body></html>';
    const result = injectScormApiShim(html);
    expect(result).toContain('var API_1484_11');
    expect(result).toContain('Initialize');
    // shim appears before </head>
    const shimIdx = result.indexOf('API_1484_11');
    const headCloseIdx = result.indexOf('</head>');
    expect(shimIdx).toBeLessThan(headCloseIdx);
  });
});

// ── Integration-style tests for ScormExportService ───────────────────────────

describe('ScormExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: S3 PutObject succeeds, GetObject returns empty async iterable
    mockS3Send.mockImplementation((cmd: object) => {
      if (cmd instanceof MockPutObjectCommand) return Promise.resolve({});
      if (cmd instanceof MockGetObjectCommand) {
        return Promise.resolve({
          Body: (async function* () {})(),
        });
      }
      return Promise.resolve({});
    });

    mockGetSignedUrl.mockResolvedValue('https://minio.example.com/presigned');
  });

  it('exportCourse fetches course and content items via withTenantContext', async () => {
    const { ScormExportService } = await import('./scorm-export.service');
    const service = new ScormExportService();

    mockWithTenantContext.mockImplementation(
      (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          select: () => ({
            from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: 'course-123', title: 'Test', description: null, tenant_id: 'tenant-1', deleted_at: null }]) }) }),
          }),
        }),
    );

    // Should call withTenantContext at least once
    try {
      await service.exportCourse('course-123', TENANT_CTX);
    } catch {
      // May throw NotFoundException if mock doesn't return complete chain — that's OK for this test
    }

    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      TENANT_CTX,
      expect.any(Function),
    );
  });

  it('exportCourse uploads ZIP to MinIO with correct key prefix', async () => {
    const { ScormExportService } = await import('./scorm-export.service');
    const service = new ScormExportService();

    mockWithTenantContext.mockResolvedValue({ course: makeCourse(), items: [] });

    await service.exportCourse('course-123', TENANT_CTX);

    expect(mockS3Send).toHaveBeenCalledWith(expect.any(MockPutObjectCommand));
    const putCall = (mockS3Send.mock.calls as Array<[MockPutObjectCommand]>).find(
      (c) => c[0] instanceof MockPutObjectCommand,
    );
    expect(putCall).toBeDefined();
    const putArgs = (putCall![0] as MockPutObjectCommand).args as { Key: string };
    expect(putArgs.Key).toMatch(/^scorm-exports\/tenant-1\/course-123-\d+\.zip$/);
  });

  it('exportCourse returns presigned URL string', async () => {
    const { ScormExportService } = await import('./scorm-export.service');
    const service = new ScormExportService();

    mockWithTenantContext.mockResolvedValue({ course: makeCourse(), items: [] });

    const url = await service.exportCourse('course-123', TENANT_CTX);
    expect(typeof url).toBe('string');
    expect(url).toBe('https://minio.example.com/presigned');
  });

  it('onModuleDestroy calls closeAllPools', async () => {
    const { ScormExportService } = await import('./scorm-export.service');
    const service = new ScormExportService();
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  it('ZIP buffer produced by exportCourse contains imsmanifest.xml', async () => {
    const { ScormExportService } = await import('./scorm-export.service');
    const service = new ScormExportService();

    let capturedBuffer: Buffer | null = null;
    mockS3Send.mockImplementation((cmd: object) => {
      if (cmd instanceof MockPutObjectCommand) {
        capturedBuffer = (cmd as MockPutObjectCommand).args as unknown as Buffer;
        const args = (cmd as MockPutObjectCommand).args as { Body?: Buffer };
        capturedBuffer = args.Body ?? Buffer.alloc(0);
        return Promise.resolve({});
      }
      return Promise.resolve({});
    });

    mockWithTenantContext.mockResolvedValue({
      course: makeCourse(),
      items: [makeItem({ type: 'QUIZ' })],
    });

    await service.exportCourse('course-123', TENANT_CTX);

    expect(capturedBuffer).not.toBeNull();
    const zip = new AdmZip(capturedBuffer!);
    const entry = zip.getEntry('imsmanifest.xml');
    expect(entry).not.toBeNull();
    const content = entry!.getData().toString('utf-8');
    expect(content).toContain('2004 4th Edition');
  });
});
