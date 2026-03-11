import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  BadRequestException,
} from '@nestjs/common';

// node-clamscan is an optional peer dependency — guard against missing install.
 
type NodeClamConstructor = new () => { init(opts: unknown): Promise<NodeClamInstance> };
interface NodeClamInstance {
  scanBuffer(buf: Buffer): Promise<{ isInfected: boolean | null; viruses: string[] | null }>;
}

let NodeClam: NodeClamConstructor | null = null;
try {
  // Dynamic require so the service starts even if the package is absent in dev
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  NodeClam = require('clamscan') as NodeClamConstructor;
} catch {
  // Will surface as hasError=true in scan results — non-fatal
}

export interface ScanResult {
  isInfected: boolean;
  viruses: string[];
  hasError: boolean;
}

const MAX_SCAN_BYTES = 100 * 1024 * 1024; // 100 MB

@Injectable()
export class ClamavService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClamavService.name);
  private scanner: NodeClamInstance | null = null;

  async onModuleInit(): Promise<void> {
    if (!NodeClam) {
      this.logger.warn('[ClamavService] node-clamscan package not installed. Scans will return hasError=true.');
      return;
    }

    const host = process.env['CLAMAV_HOST'] ?? 'localhost';
    const port = parseInt(process.env['CLAMAV_PORT'] ?? '3310', 10);

    try {
      this.scanner = await new NodeClam().init({
        clamdscan: {
          host,
          port,
          timeout: 10000,
          localFallback: false,
          active: true,
        },
        preference: 'clamdscan',
      });
      this.logger.log(`[ClamavService] Connected to clamd at ${host}:${port}`);
    } catch (err) {
      this.logger.warn(`[ClamavService] ClamAV unavailable (${String(err)}). Scans will return hasError=true.`);
      this.scanner = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.scanner = null;
  }

  async scanBuffer(buffer: Buffer, filename: string): Promise<ScanResult> {
    if (buffer.length > MAX_SCAN_BYTES) {
      throw new BadRequestException(
        `File too large for scanning. Maximum ${MAX_SCAN_BYTES / 1024 / 1024}MB.`
      );
    }

    if (!this.scanner) {
      this.logger.warn(`[ClamavService] Scanner unavailable, skipping scan for ${filename}`);
      return { isInfected: false, viruses: [], hasError: true };
    }

    try {
      const { isInfected, viruses } = await this.scanner.scanBuffer(buffer);
      const infected = isInfected ?? false;
      const virusList = viruses ?? [];

      if (infected) {
        this.logger.error(
          `[ClamavService] INFECTED file detected: ${filename} | viruses: ${virusList.join(', ')}`
        );
      } else {
        this.logger.debug(`[ClamavService] Clean scan: ${filename}`);
      }

      return { isInfected: infected, viruses: virusList, hasError: false };
    } catch (err) {
      this.logger.error(`[ClamavService] Scan error for ${filename}: ${String(err)}`);
      return { isInfected: false, viruses: [], hasError: true };
    }
  }
}
