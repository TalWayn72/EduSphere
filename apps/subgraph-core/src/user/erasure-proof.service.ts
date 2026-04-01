import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import { createDatabaseConnection, schema, closeAllPools } from '@edusphere/db';
import type { Database } from '@edusphere/db';
import { eq } from 'drizzle-orm';

const SIGNING_KEY =
  process.env['GDPR_SIGNING_KEY'] ?? 'edusphere-gdpr-default-key';

/** Manifest entry: table name + row count (NO user data). */
export interface ManifestEntry {
  table: string;
  rowsDeleted: number;
}

/** Full erasure manifest before hashing. */
export interface ErasureManifest {
  userId: string;
  tenantId: string;
  requestedBy: string;
  requestedAt: string;
  completedAt: string;
  entries: ManifestEntry[];
  totalRowsDeleted: number;
}

/** Signed erasure proof returned to callers. */
export interface ErasureProof {
  manifestHash: string;
  signature: string;
  verificationToken: string;
  manifest: ErasureManifest;
}

/** Result of verifyErasure query. */
export interface ErasureVerification {
  userIdHash: string;
  tenantId: string;
  requestedAt: string;
  completedAt: string | null;
  tablesAffected: string[];
  rowsDeletedCount: number;
  erasureHash: string;
  verificationToken: string;
  isValid: boolean;
  status: string;
}

@Injectable()
export class ErasureProofService implements OnModuleDestroy {
  private readonly logger = new Logger(ErasureProofService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /** Hash a userId with SHA-256 so the log stores no PII. */
  hashUserId(userId: string): string {
    return createHash('sha256').update(userId).digest('hex');
  }

  /** Build an erasure manifest from deletion results. */
  buildManifest(
    userId: string,
    tenantId: string,
    requestedBy: string,
    entries: ManifestEntry[]
  ): ErasureManifest {
    const now = new Date().toISOString();
    const totalRowsDeleted = entries.reduce((sum, e) => sum + e.rowsDeleted, 0);
    return {
      userId: this.hashUserId(userId),
      tenantId,
      requestedBy,
      requestedAt: now,
      completedAt: now,
      entries,
      totalRowsDeleted,
    };
  }

  /** Compute SHA-256 hash of the canonical manifest JSON. */
  hashManifest(manifest: ErasureManifest): string {
    const canonical = JSON.stringify(manifest, Object.keys(manifest).sort());
    return createHash('sha256').update(canonical).digest('hex');
  }

  /** Sign a manifest hash with HMAC-SHA256 using the server signing key. */
  signHash(manifestHash: string): string {
    return createHmac('sha256', SIGNING_KEY).update(manifestHash).digest('hex');
  }

  /** Build a self-contained verification token (base64-encoded signed payload). */
  createVerificationToken(manifest: ErasureManifest, hash: string): string {
    const payload = {
      type: 'gdpr-erasure-proof',
      hash,
      userId: manifest.userId,
      tenantId: manifest.tenantId,
      completedAt: manifest.completedAt,
      totalRows: manifest.totalRowsDeleted,
      tables: manifest.entries.map((e) => e.table),
    };
    const payloadStr = JSON.stringify(payload);
    const sig = this.signHash(payloadStr);
    const token = Buffer.from(`${payloadStr}.${sig}`).toString('base64');
    return token;
  }

  /** Generate a complete erasure proof and persist to gdpr_erasure_log. */
  async generateAndStore(
    userId: string,
    tenantId: string,
    requestedBy: string,
    entries: ManifestEntry[]
  ): Promise<ErasureProof> {
    const manifest = this.buildManifest(userId, tenantId, requestedBy, entries);
    const manifestHash = this.hashManifest(manifest);
    const signature = this.signHash(manifestHash);
    const verificationToken = this.createVerificationToken(
      manifest,
      manifestHash
    );

    await this.db.insert(schema.gdprErasureLog).values({
      userIdHash: this.hashUserId(userId),
      tenantId,
      requestedAt: new Date(manifest.requestedAt),
      completedAt: new Date(manifest.completedAt),
      tablesAffected: entries.map((e) => e.table),
      rowsDeletedCount: manifest.totalRowsDeleted,
      erasureHash: manifestHash,
      verificationToken,
      requestedBy,
      status: 'COMPLETED',
    });

    this.logger.log(
      { tenantId, userIdHash: manifest.userId, manifestHash },
      'GDPR erasure proof generated and stored'
    );

    return { manifestHash, signature, verificationToken, manifest };
  }

  /** Verify an erasure occurred by looking up the userId hash. */
  async verifyErasure(userId: string): Promise<ErasureVerification | null> {
    const userIdHash = this.hashUserId(userId);
    const rows = await this.db
      .select()
      .from(schema.gdprErasureLog)
      .where(eq(schema.gdprErasureLog.userIdHash, userIdHash))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    // Verify the token signature is valid
    const isValid = this.verifyToken(row.verificationToken);

    return {
      userIdHash: row.userIdHash,
      tenantId: row.tenantId,
      requestedAt: row.requestedAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      tablesAffected: row.tablesAffected,
      rowsDeletedCount: row.rowsDeletedCount,
      erasureHash: row.erasureHash,
      verificationToken: row.verificationToken,
      isValid,
      status: row.status,
    };
  }

  /** Verify a verification token's HMAC signature. */
  verifyToken(token: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const lastDot = decoded.lastIndexOf('.');
      if (lastDot === -1) return false;
      const payloadStr = decoded.slice(0, lastDot);
      const sig = decoded.slice(lastDot + 1);
      const expectedSig = this.signHash(payloadStr);
      return sig === expectedSig;
    } catch {
      return false;
    }
  }
}
