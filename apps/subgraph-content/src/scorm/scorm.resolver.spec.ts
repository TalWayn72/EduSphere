import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSend = vi.fn().mockResolvedValue({});

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function () {
    return { send: mockSend };
  }),
  GetObjectCommand: vi.fn((args: unknown) => args),
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
}));

import { ScormResolver } from './scorm.resolver.js';

// ── Mock services ─────────────────────────────────────────────────────────────

const mockSessionService = {
  findSession: vi.fn(),
  initSession: vi.fn(),
  updateSession: vi.fn(),
  finishSession: vi.fn(),
};

const mockImportService = {
  importScormPackage: vi.fn(),
};

const mockExportService = {
  exportCourse: vi.fn(),
};

// ── Context helpers ───────────────────────────────────────────────────────────

const makeCtx = (
  opts: { userId?: string; tenantId?: string; roles?: string[] } = {}
) => ({
  authContext: opts.userId
    ? {
        userId: opts.userId,
        tenantId: opts.tenantId ?? '',
        roles: opts.roles ?? [],
      }
    : null,
});

const AUTH_CTX = makeCtx({
  userId: 'user-1',
  tenantId: 'tenant-abc',
  roles: ['INSTRUCTOR'],
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScormResolver', () => {
  let resolver: ScormResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({});
    resolver = new ScormResolver(
      mockSessionService as never,
      mockImportService as never,
      mockExportService as never
    );
  });

  // Test 1: requireAuth throws UnauthorizedException when authContext is null
  it('myScormSession — throws UnauthorizedException when not authenticated', async () => {
    const ctx = makeCtx();

    await expect(resolver.myScormSession('ci-1', ctx as never)).rejects.toThrow(
      UnauthorizedException
    );

    expect(mockSessionService.findSession).not.toHaveBeenCalled();
  });

  // Test 2: requireAuth throws UnauthorizedException when userId is missing
  it('myScormSession — throws UnauthorizedException when userId is empty', async () => {
    const ctx = makeCtx({ userId: '', tenantId: 'tenant-1' });

    await expect(resolver.myScormSession('ci-1', ctx as never)).rejects.toThrow(
      UnauthorizedException
    );
  });

  // Test 3: myScormSession delegates to sessionService.findSession
  it('myScormSession — delegates to sessionService.findSession with userId and contentItemId', async () => {
    const session = { id: 'sess-1', status: 'incomplete' };
    mockSessionService.findSession.mockResolvedValue(session);

    const result = await resolver.myScormSession('ci-1', AUTH_CTX as never);

    expect(mockSessionService.findSession).toHaveBeenCalledWith(
      'user-1',
      'ci-1'
    );
    expect(result).toEqual(session);
  });

  // Test 4: initScormSession delegates to sessionService.initSession
  it('initScormSession — delegates to sessionService.initSession with userId, contentItemId, tenantId', async () => {
    const session = { id: 'sess-new', status: 'not_attempted' };
    mockSessionService.initSession.mockResolvedValue(session);

    const result = await resolver.initScormSession('ci-5', AUTH_CTX as never);

    expect(mockSessionService.initSession).toHaveBeenCalledWith(
      'user-1',
      'ci-5',
      'tenant-abc'
    );
    expect(result).toEqual(session);
  });

  // Test 5: updateScormSession parses JSON data and delegates to sessionService.updateSession
  it('updateScormSession — parses JSON and calls sessionService.updateSession, returns true', async () => {
    mockSessionService.updateSession.mockResolvedValue(undefined);

    const result = await resolver.updateScormSession(
      'sess-1',
      JSON.stringify({ 'cmi.score.raw': '85' }),
      AUTH_CTX as never
    );

    expect(mockSessionService.updateSession).toHaveBeenCalledWith(
      'sess-1',
      'user-1',
      { 'cmi.score.raw': '85' }
    );
    expect(result).toBe(true);
  });

  // Test 6: updateScormSession throws BadRequestException on invalid JSON
  it('updateScormSession — throws BadRequestException when data is not valid JSON', async () => {
    const { BadRequestException } = await import('@nestjs/common');

    await expect(
      resolver.updateScormSession('sess-1', 'not-json', AUTH_CTX as never)
    ).rejects.toThrow(BadRequestException);

    expect(mockSessionService.updateSession).not.toHaveBeenCalled();
  });

  // Test 7: exportCourseAsScorm delegates to exportService.exportCourse and returns URL
  it('exportCourseAsScorm — delegates to exportService.exportCourse with courseId and tenantCtx', async () => {
    const downloadUrl =
      'https://minio/scorm-exports/tenant-abc/course-1-123.zip?X-Amz-Signature=abc';
    mockExportService.exportCourse.mockResolvedValue(downloadUrl);

    const result = await resolver.exportCourseAsScorm(
      'course-1',
      AUTH_CTX as never
    );

    expect(mockExportService.exportCourse).toHaveBeenCalledWith(
      'course-1',
      expect.objectContaining({ tenantId: 'tenant-abc', userId: 'user-1' })
    );
    expect(result).toBe(downloadUrl);
  });

  // Test 8: finishScormSession parses JSON and returns true
  it('finishScormSession — parses JSON and calls sessionService.finishSession, returns true', async () => {
    mockSessionService.finishSession.mockResolvedValue(undefined);

    const result = await resolver.finishScormSession(
      'sess-1',
      JSON.stringify({ 'cmi.completion_status': 'completed' }),
      AUTH_CTX as never
    );

    expect(mockSessionService.finishSession).toHaveBeenCalledWith(
      'sess-1',
      'user-1',
      { 'cmi.completion_status': 'completed' }
    );
    expect(result).toBe(true);
  });

  // Test 9: resolver instantiates without error
  it('resolver instantiates without error', () => {
    expect(
      () =>
        new ScormResolver(
          mockSessionService as never,
          mockImportService as never,
          mockExportService as never
        )
    ).not.toThrow();
  });
});
