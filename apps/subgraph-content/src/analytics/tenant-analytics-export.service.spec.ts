import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mock helpers ───────────────────────────────────────────────────────

const mockSend = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockGetSignedUrl = vi.hoisted(() =>
  vi.fn().mockResolvedValue('https://minio.local/presigned-url?x=1')
);

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {},
  withTenantContext: vi.fn(),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  count: vi.fn(),
  avg: vi.fn(),
  and: vi.fn(),
}));

vi.mock('@edusphere/config', () => ({
  minioConfig: {
    endpoint: 'localhost',
    port: 9000,
    region: 'us-east-1',
    accessKey: 'minioadmin',
    secretKey: 'minioadmin',
    bucket: 'edusphere',
  },
}));

vi.mock('@aws-sdk/client-s3', () => {
  // Use regular functions so they work as constructors with `new`
  function S3Client() {
    return { send: mockSend };
  }
  function PutObjectCommand(
    this: { _type: string; params: unknown },
    params: unknown
  ) {
    this._type = 'PutObjectCommand';
    this.params = params;
  }
  function GetObjectCommand(
    this: { _type: string; params: unknown },
    params: unknown
  ) {
    this._type = 'GetObjectCommand';
    this.params = params;
  }
  return { S3Client, PutObjectCommand, GetObjectCommand };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

import * as db from '@edusphere/db';
import { TenantAnalyticsExportService } from './tenant-analytics-export.service.js';
import type { TenantAnalyticsService } from './tenant-analytics.service.js';
import type { TenantAnalyticsDto } from './tenant-analytics.types.js';

const TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER_ID = 'bbbbbbbb-0000-0000-0000-000000000001';

const MOCK_ANALYTICS: TenantAnalyticsDto = {
  tenantId: TENANT_ID,
  period: 'SEVEN_DAYS',
  totalEnrollments: 42,
  avgLearningVelocity: 3.5,
  activeLearnersTrend: [
    { date: '2025-03-01', value: 10 },
    { date: '2025-03-02', value: 15 },
  ],
  completionRateTrend: [
    { date: '2025-03-01', value: 55.0 },
    { date: '2025-03-02', value: 60.0 },
  ],
  topCourses: [
    {
      courseId: 'cccccccc-0000-0000-0000-000000000001',
      title: 'Course A',
      enrollmentCount: 20,
      completionRate: 50,
    },
  ],
};

function makeMockAnalyticsService(): TenantAnalyticsService {
  return {
    getTenantAnalytics: vi.fn().mockResolvedValue(MOCK_ANALYTICS),
    getLearnerVelocity: vi.fn().mockResolvedValue([]),
    getCohortRetention: vi.fn().mockResolvedValue([]),
    onModuleDestroy: vi.fn().mockResolvedValue(undefined),
  } as unknown as TenantAnalyticsService;
}

describe('TenantAnalyticsExportService', () => {
  let service: TenantAnalyticsExportService;
  let mockAnalyticsService: TenantAnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({});
    mockGetSignedUrl.mockResolvedValue('https://minio.local/presigned-url?x=1');
    mockAnalyticsService = makeMockAnalyticsService();
    service = new TenantAnalyticsExportService(mockAnalyticsService);
  });

  // ── Memory safety ──────────────────────────────────────────────────────────

  it('onModuleDestroy calls closeAllPools', async () => {
    await service.onModuleDestroy();
    expect(db.closeAllPools).toHaveBeenCalledOnce();
  });

  // ── exportToCSV ────────────────────────────────────────────────────────────

  it('returns a string URL from exportToCSV', async () => {
    const result = await service.exportToCSV(TENANT_ID, USER_ID, 'SEVEN_DAYS');

    expect(typeof result).toBe('string');
    expect(result).toContain('presigned-url');
  });

  it('CSV upload body contains the header row Date,ActiveLearners,Completions', async () => {
    // Capture the CSV body from the PutObjectCommand params via mockSend
    let capturedParams: { Body?: string } = {};
    mockSend.mockImplementation((cmd: { params: { Body?: string } }) => {
      // PutObjectCommand stores params on .params
      if (cmd?.params?.Body !== undefined) {
        capturedParams = cmd.params;
      }
      return Promise.resolve({});
    });

    await service.exportToCSV(TENANT_ID, USER_ID, 'SEVEN_DAYS');

    expect(capturedParams.Body).toContain('Date,ActiveLearners,Completions');
    expect(capturedParams.Body).toContain('2025-03-01');
    expect(capturedParams.Body).toContain('2025-03-02');
  });

  it('CSV content does NOT contain raw user_id UUIDs (GDPR check)', async () => {
    let capturedBody = '';
    mockSend.mockImplementation((cmd: { params: { Body?: string } }) => {
      if (cmd?.params?.Body !== undefined) {
        capturedBody = cmd.params.Body ?? '';
      }
      return Promise.resolve({});
    });

    await service.exportToCSV(TENANT_ID, USER_ID, 'SEVEN_DAYS');

    // Aggregate-only CSV — no individual user_id UUIDs (GDPR requirement)
    expect(capturedBody).not.toContain(USER_ID);
  });

  it('uploads to MinIO via S3Client.send', async () => {
    await service.exportToCSV(TENANT_ID, USER_ID, 'SEVEN_DAYS');

    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('calls getTenantAnalytics on the analytics service', async () => {
    await service.exportToCSV(TENANT_ID, USER_ID, 'SEVEN_DAYS');

    expect(mockAnalyticsService.getTenantAnalytics).toHaveBeenCalledWith(
      TENANT_ID,
      USER_ID,
      'SEVEN_DAYS'
    );
  });

  it('generates a pre-signed URL with 15-minute (900s) expiry', async () => {
    await service.exportToCSV(TENANT_ID, USER_ID, 'SEVEN_DAYS');

    expect(mockGetSignedUrl).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(mockGetSignedUrl).mock.calls[0] as [
      unknown,
      unknown,
      { expiresIn: number },
    ];
    expect(callArgs[2]?.expiresIn).toBe(900);
  });
});
