import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ClamavService } from './clamav.service';

// ── Mock scanner object injected directly into the service ────────────────────
// This bypasses CJS module interop entirely and tests the service logic cleanly.
const mockScanBuffer = vi.fn();
const mockScanner = { scanBuffer: mockScanBuffer };

// Helper to inject a mock scanner
function injectScanner(svc: ClamavService, scanner: unknown | null): void {
  (svc as never as Record<string, unknown>)['scanner'] = scanner;
}

function makeBuffer(bytes: number): Buffer {
  return Buffer.alloc(bytes, 0x00);
}

describe('ClamavService', () => {
  let service: ClamavService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockScanBuffer.mockReset();
    service = new ClamavService();
    // Inject mock scanner so tests don't require a live ClamAV daemon
    injectScanner(service, mockScanner);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  // ── onModuleInit ─────────────────────────────────────────────────────────────

  it('sets scanner to null when clamd unavailable', async () => {
    const s = new ClamavService();
    // onModuleInit with no daemon: catches connection error → scanner stays null
    await s.onModuleInit();
    // Scanner should be null → scan returns hasError=true
    const result = await s.scanBuffer(Buffer.from('test'), 'test.jpg');
    expect(result.hasError).toBe(true);
    await s.onModuleDestroy();
  });

  // ── scanBuffer — clean ────────────────────────────────────────────────────────

  it('returns isInfected=false and hasError=false for a clean file', async () => {
    mockScanBuffer.mockResolvedValueOnce({ isInfected: false, viruses: [] });
    const result = await service.scanBuffer(Buffer.from('clean content'), 'clean.jpg');
    expect(result).toEqual({ isInfected: false, viruses: [], hasError: false });
  });

  // ── scanBuffer — infected ─────────────────────────────────────────────────────

  it('returns isInfected=true with virus names for infected file', async () => {
    mockScanBuffer.mockResolvedValueOnce({
      isInfected: true,
      viruses: ['EICAR-Test-Signature'],
    });
    const result = await service.scanBuffer(Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR'), 'eicar.com');
    expect(result.isInfected).toBe(true);
    expect(result.viruses).toContain('EICAR-Test-Signature');
    expect(result.hasError).toBe(false);
  });

  // ── scanBuffer — oversized ────────────────────────────────────────────────────

  it('throws BadRequestException for buffer > 100MB', async () => {
    const bigBuffer = makeBuffer(101 * 1024 * 1024);
    await expect(service.scanBuffer(bigBuffer, 'huge.iso')).rejects.toThrow(
      BadRequestException
    );
  });

  // ── scanBuffer — scanner null ─────────────────────────────────────────────────

  it('returns hasError=true when scanner is null (no clamd)', async () => {
    injectScanner(service, null);
    const result = await service.scanBuffer(Buffer.from('data'), 'file.png');
    expect(result).toEqual({ isInfected: false, viruses: [], hasError: true });
  });

  // ── scanBuffer — scan error ───────────────────────────────────────────────────

  it('returns hasError=true when scanBuffer throws', async () => {
    mockScanBuffer.mockRejectedValueOnce(new Error('scan daemon crashed'));
    const result = await service.scanBuffer(Buffer.from('data'), 'file.png');
    expect(result).toEqual({ isInfected: false, viruses: [], hasError: true });
  });

  // ── onModuleDestroy ───────────────────────────────────────────────────────────

  it('nullifies scanner on destroy', async () => {
    await service.onModuleDestroy();
    const result = await service.scanBuffer(Buffer.from('data'), 'file.png');
    expect(result.hasError).toBe(true);
  });
});
