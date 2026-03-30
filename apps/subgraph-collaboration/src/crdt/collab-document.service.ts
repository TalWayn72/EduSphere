/**
 * CollabDocumentService — On-demand CRDT compaction for a single document.
 * Uses the existing CrdtCompactionService for the merge logic.
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
} from '@edusphere/db';
import type { Database } from '@edusphere/db';
import { CrdtCompactionService } from './crdt-compaction.service';

export interface CollabDocumentResult {
  id: string;
  title: string;
  sizeBytes: number;
  compactedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CollabDocumentService implements OnModuleDestroy {
  private readonly logger = new Logger(CollabDocumentService.name);
  private readonly db: Database;

  constructor(
    private readonly crdtCompactionService: CrdtCompactionService
  ) {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log(
      '[CollabDocumentService] onModuleDestroy: cleaned up'
    );
  }

  /**
   * Compact a single document's CRDT state on demand.
   * 1. Run compaction (merge all updates into snapshot)
   * 2. Return the updated document metadata.
   */
  async compactDocument(
    documentId: string
  ): Promise<CollabDocumentResult> {
    this.logger.log(
      { documentId },
      '[CollabDocumentService] compactDocument'
    );

    // Verify document exists
    const [doc] = await this.db
      .select()
      .from(schema.collab_documents)
      .where(eq(schema.collab_documents.id, documentId))
      .limit(1);

    if (!doc) {
      throw new NotFoundException(
        `Document ${documentId} not found`
      );
    }

    // Use a far-future cutoff to compact ALL pending updates
    const farFutureCutoff = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000
    );

    const compactedCount =
      await this.crdtCompactionService.compactDocument(
        documentId,
        farFutureCutoff
      );

    this.logger.log(
      { documentId, compactedCount },
      '[CollabDocumentService] Compaction complete'
    );

    // Re-fetch the document to get updated snapshot size
    const [updated] = await this.db
      .select()
      .from(schema.collab_documents)
      .where(eq(schema.collab_documents.id, documentId))
      .limit(1);

    const snapshotSize = updated?.ydoc_snapshot?.length ?? 0;

    return {
      id: updated?.id ?? documentId,
      title: (updated as { name?: string })?.name ?? 'Untitled',
      sizeBytes: snapshotSize,
      compactedAt: new Date(),
      createdAt: updated?.createdAt ?? new Date(),
      updatedAt: updated?.updatedAt ?? new Date(),
    };
  }
}
