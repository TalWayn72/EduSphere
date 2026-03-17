/**
 * crdt-compaction.service.ts — Daily cron that compacts old CRDT updates.
 * Cron: 3 AM daily (0 3 * * *)
 *
 * For each collab_document with crdt_updates older than the threshold (default 7 days),
 * merges all old update rows into a single Yjs snapshot stored on collab_documents.ydoc_snapshot,
 * then deletes the compacted rows.
 *
 * Task #80 from master work plan.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  createDatabaseConnection,
  schema,
  eq,
  lte,
  sql,
  closeAllPools,
  type Database,
} from '@edusphere/db';
import * as Y from 'yjs';

/** Default: compact rows older than 7 days */
const DEFAULT_THRESHOLD_DAYS = 7;

@Injectable()
export class CrdtCompactionService implements OnModuleDestroy {
  private readonly logger = new Logger(CrdtCompactionService.name);
  private readonly db: Database;
  private readonly thresholdDays: number;

  constructor() {
    this.db = createDatabaseConnection();
    this.thresholdDays = parseInt(
      process.env.CRDT_COMPACTION_THRESHOLD_DAYS ?? String(DEFAULT_THRESHOLD_DAYS),
      10,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[CrdtCompaction] onModuleDestroy: DB pools closed');
  }

  @Cron('0 3 * * *')
  async runCompaction(): Promise<void> {
    this.logger.log('[CrdtCompaction] Starting daily CRDT compaction');
    try {
      const cutoff = new Date(
        Date.now() - this.thresholdDays * 24 * 60 * 60 * 1000,
      );
      const documentsWithOldUpdates = await this.findDocumentsWithOldUpdates(cutoff);

      let totalCompacted = 0;
      for (const doc of documentsWithOldUpdates) {
        const compacted = await this.compactDocument(doc.documentId, cutoff);
        totalCompacted += compacted;
      }

      this.logger.log(
        `[CrdtCompaction] Compaction complete: ${documentsWithOldUpdates.length} document(s), ${totalCompacted} update(s) compacted`,
      );
    } catch (err) {
      this.logger.error(
        `[CrdtCompaction] Compaction failed: ${String(err)}`,
      );
    }
  }

  /**
   * Find distinct document IDs that have crdt_updates older than cutoff.
   */
  private async findDocumentsWithOldUpdates(
    cutoff: Date,
  ): Promise<Array<{ documentId: string }>> {
    const rows = await this.db
      .selectDistinct({ documentId: schema.crdt_updates.document_id })
      .from(schema.crdt_updates)
      .where(lte(schema.crdt_updates.created_at, cutoff));
    return rows;
  }

  /**
   * For a single document:
   * 1. Load current ydoc_snapshot from collab_documents
   * 2. Fetch all crdt_updates older than cutoff
   * 3. Merge them into a single Yjs doc
   * 4. Write merged snapshot back to collab_documents.ydoc_snapshot
   * 5. Delete the compacted crdt_updates rows
   *
   * Returns the number of rows deleted.
   */
  async compactDocument(documentId: string, cutoff: Date): Promise<number> {
    // 1. Load existing snapshot
    const [docRow] = await this.db
      .select({
        id: schema.collab_documents.id,
        ydocSnapshot: schema.collab_documents.ydoc_snapshot,
      })
      .from(schema.collab_documents)
      .where(eq(schema.collab_documents.id, documentId))
      .limit(1);

    if (!docRow) {
      this.logger.warn(
        `[CrdtCompaction] Document ${documentId} not found — skipping`,
      );
      return 0;
    }

    // 2. Fetch old updates
    const oldUpdates = await this.db
      .select({
        id: schema.crdt_updates.id,
        updateData: schema.crdt_updates.update_data,
      })
      .from(schema.crdt_updates)
      .where(
        sql`${schema.crdt_updates.document_id} = ${documentId} AND ${schema.crdt_updates.created_at} <= ${cutoff}`,
      );

    if (oldUpdates.length === 0) {
      return 0;
    }

    // 3. Merge into a single Yjs doc
    const mergedDoc = new Y.Doc();

    // Apply existing snapshot first
    if (docRow.ydocSnapshot) {
      Y.applyUpdate(mergedDoc, docRow.ydocSnapshot);
    }

    // Apply each old update
    for (const update of oldUpdates) {
      Y.applyUpdate(mergedDoc, update.updateData);
    }

    // 4. Encode merged state and write back
    const mergedSnapshot = Buffer.from(Y.encodeStateAsUpdate(mergedDoc));
    mergedDoc.destroy();

    await this.db
      .update(schema.collab_documents)
      .set({ ydoc_snapshot: mergedSnapshot })
      .where(eq(schema.collab_documents.id, documentId));

    // 5. Delete compacted rows
    const deleteResult = await this.db
      .delete(schema.crdt_updates)
      .where(
        sql`${schema.crdt_updates.document_id} = ${documentId} AND ${schema.crdt_updates.created_at} <= ${cutoff}`,
      );

    const deletedCount = oldUpdates.length;
    this.logger.debug(
      `[CrdtCompaction] Document ${documentId}: merged ${deletedCount} update(s) into snapshot (${mergedSnapshot.length} bytes)`,
    );

    return deletedCount;
  }
}
