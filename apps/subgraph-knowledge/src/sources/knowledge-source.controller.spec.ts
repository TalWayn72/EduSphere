/**
 * knowledge-source.controller.spec.ts
 *
 * Unit tests for KnowledgeSourceController (REST upload endpoint).
 * JWTValidator is mocked using a hoisted class so `new JWTValidator()` works.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

const { mockValidate, mockExtractToken, mockCreateAndProcess } = vi.hoisted(() => {
  const mockValidate = vi.fn().mockResolvedValue({
    userId: 'u-1', email: 'test@example.com', username: 'tester',
    roles: ['INSTRUCTOR'], scopes: [], tenantId: 'tenant-abc', isSuperAdmin: false,
  });
  const mockExtractToken = vi.fn((h: string | undefined) =>
    h?.startsWith('Bearer ') ? h.slice(7) : null,
  );
  const mockCreateAndProcess = vi.fn().mockResolvedValue({ id: 'ks-new', status: 'PENDING' });
  return { mockValidate, mockExtractToken, mockCreateAndProcess };
});

vi.mock('@edusphere/auth', () => ({
  JWTValidator: class {
    validate = mockValidate;
    extractToken = mockExtractToken;
  },
}));

import { KnowledgeSourceController } from './knowledge-source.controller.js';

function makeFile(originalname: string, mimetype: string): Express.Multer.File {
  return {
    originalname, mimetype, size: 100,
    buffer: Buffer.from('fake content'),
    fieldname: 'file', encoding: '7bit',
    destination: '', filename: '', path: '', stream: null as never,
  };
}

const VALID_AUTH = 'Bearer valid-jwt-token';
const VALID_BODY = { courseId: 'course-1', title: 'My Doc' };

describe('KnowledgeSourceController', () => {
  let controller: KnowledgeSourceController;

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidate.mockResolvedValue({
      userId: 'u-1', email: 'test@example.com', username: 'tester',
      roles: ['INSTRUCTOR'], scopes: [], tenantId: 'tenant-abc', isSuperAdmin: false,
    });
    mockExtractToken.mockImplementation((h: string | undefined) =>
      h?.startsWith('Bearer ') ? h.slice(7) : null,
    );
    mockCreateAndProcess.mockResolvedValue({ id: 'ks-new', status: 'PENDING' });
    controller = new KnowledgeSourceController({ createAndProcess: mockCreateAndProcess } as never);
  });

  it('throws UnauthorizedException when Authorization header is missing', async () => {
    const file = makeFile('doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    await expect(controller.upload(file, VALID_BODY, undefined)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token has no tenant claim', async () => {
    mockValidate.mockResolvedValueOnce({ userId: 'u-1', email: 'x@x.com', username: 'x', roles: [], scopes: [], tenantId: undefined, isSuperAdmin: false });
    const file = makeFile('doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    await expect(controller.upload(file, VALID_BODY, VALID_AUTH)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token validation fails', async () => {
    mockValidate.mockRejectedValueOnce(new Error('expired'));
    await expect(controller.upload(makeFile('doc.pdf', 'application/pdf'), VALID_BODY, VALID_AUTH)).rejects.toThrow(UnauthorizedException);
  });

  it('throws BadRequestException when no file is uploaded', async () => {
    await expect(controller.upload(undefined as never, VALID_BODY, VALID_AUTH)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when courseId is missing', async () => {
    const file = makeFile('doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    await expect(controller.upload(file, { courseId: undefined as never }, VALID_AUTH)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException for unsupported file type', async () => {
    await expect(controller.upload(makeFile('slides.pptx', 'application/vnd.ms-powerpoint'), VALID_BODY, VALID_AUTH)).rejects.toThrow(BadRequestException);
  });

  it('detects FILE_DOCX from MIME type and calls createAndProcess', async () => {
    const file = makeFile('report.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const result = await controller.upload(file, VALID_BODY, VALID_AUTH);
    expect(mockCreateAndProcess).toHaveBeenCalledWith(expect.objectContaining({ sourceType: 'FILE_DOCX', tenantId: 'tenant-abc', courseId: 'course-1', fileBuffer: file.buffer }));
    expect(result).toEqual({ id: 'ks-new', status: 'PENDING' });
  });

  it('detects FILE_PDF from MIME type', async () => {
    await controller.upload(makeFile('thesis.pdf', 'application/pdf'), VALID_BODY, VALID_AUTH);
    expect(mockCreateAndProcess).toHaveBeenCalledWith(expect.objectContaining({ sourceType: 'FILE_PDF' }));
  });

  it('detects FILE_TXT from MIME type', async () => {
    await controller.upload(makeFile('notes.txt', 'text/plain'), VALID_BODY, VALID_AUTH);
    expect(mockCreateAndProcess).toHaveBeenCalledWith(expect.objectContaining({ sourceType: 'FILE_TXT' }));
  });

  it('falls back to extension detection when MIME is generic', async () => {
    await controller.upload(makeFile('document.docx', 'application/octet-stream'), VALID_BODY, VALID_AUTH);
    expect(mockCreateAndProcess).toHaveBeenCalledWith(expect.objectContaining({ sourceType: 'FILE_DOCX' }));
  });

  it('uses file.originalname as title when body.title is omitted', async () => {
    await controller.upload(makeFile('my-notes.pdf', 'application/pdf'), { courseId: 'c-1' }, VALID_AUTH);
    expect(mockCreateAndProcess).toHaveBeenCalledWith(expect.objectContaining({ title: 'my-notes.pdf' }));
  });
});
