import { describe, it, expect, vi, beforeEach } from 'vitest';
import { XapiExportService } from './xapi-export.service.js';

describe('XapiExportService', () => {
  let service: XapiExportService;
  let statementService: { queryStatements: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    statementService = { queryStatements: vi.fn() };
    service = new XapiExportService(statementService as never);
  });

  it('returns count of statements', async () => {
    statementService.queryStatements.mockResolvedValue([{}, {}, {}]);
    const count = await service.getStatementCount('tenant-1');
    expect(count).toBe(3);
  });

  it('passes since param to queryStatements', async () => {
    statementService.queryStatements.mockResolvedValue([]);
    await service.getStatementCount('tenant-1', '2026-01-01');
    expect(statementService.queryStatements).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ since: '2026-01-01' })
    );
  });

  it('returns 0 when no statements', async () => {
    statementService.queryStatements.mockResolvedValue([]);
    const count = await service.getStatementCount('tenant-1');
    expect(count).toBe(0);
  });
});
