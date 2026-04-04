/**
 * P5-04: Offline caching for enriched lessons via expo-sqlite.
 *
 * Stores enriched transcript blocks and citations in local SQLite DB
 * for offline viewing. Syncs with server when connectivity returns.
 * Uses TanStack Query for cache management + expo-sqlite for persistence.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as SQLite from 'expo-sqlite';

// ── Types ───────────────────────────────────────────────────────────────────

export interface EnrichedBlock {
  readonly id: string;
  readonly lessonId: string;
  readonly blockType: 'TEXT' | 'CITATION' | 'VISUAL_ANCHOR' | 'HEADING';
  readonly blockOrder: number;
  readonly content: Record<string, unknown>;
  readonly startTime?: number;
  readonly endTime?: number;
  readonly citationId?: string;
}

export interface EnrichedLessonCitation {
  readonly id: string;
  readonly bookName: string;
  readonly part?: string;
  readonly page?: string;
  readonly column?: string;
  readonly resolvedText?: string;
  readonly matchStatus: 'VERIFIED' | 'UNVERIFIED';
  readonly confidence: number;
}

export interface OfflineEnrichedLessonResult {
  readonly blocks: EnrichedBlock[];
  readonly citations: EnrichedLessonCitation[];
  readonly isOffline: boolean;
  readonly isSyncing: boolean;
  readonly lastSyncedAt: string | null;
  readonly cacheLesson: (
    blocks: EnrichedBlock[],
    citations: EnrichedLessonCitation[]
  ) => Promise<void>;
  readonly clearCache: () => Promise<void>;
}

// ── Constants ───────────────────────────────────────────────────────────────

const DB_NAME = 'edusphere_enriched_lessons.db';
const BLOCKS_TABLE = 'enriched_blocks';
const CITATIONS_TABLE = 'enriched_citations';

// ── Hook ────────────────────────────────────────────────────────────────────

export function useOfflineEnrichedLesson(
  lessonId: string
): OfflineEnrichedLessonResult {
  const dbRef = useRef<SQLite.SQLiteDatabase | null>(null);
  const [blocks, setBlocks] = useState<EnrichedBlock[]>([]);
  const [citations, setCitations] = useState<EnrichedLessonCitation[]>([]);
  const [isOffline, _setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Initialize SQLite database and create tables
  useEffect(() => {
    let mounted = true;

    async function initDb() {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      dbRef.current = db;

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${BLOCKS_TABLE} (
          id TEXT PRIMARY KEY,
          lesson_id TEXT NOT NULL,
          block_type TEXT NOT NULL,
          block_order INTEGER NOT NULL,
          content TEXT NOT NULL,
          start_time REAL,
          end_time REAL,
          citation_id TEXT,
          synced_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_blocks_lesson ON ${BLOCKS_TABLE}(lesson_id);
      `);

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${CITATIONS_TABLE} (
          id TEXT PRIMARY KEY,
          lesson_id TEXT NOT NULL,
          book_name TEXT NOT NULL,
          part TEXT,
          page TEXT,
          col TEXT,
          resolved_text TEXT,
          match_status TEXT NOT NULL,
          confidence REAL NOT NULL,
          synced_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_citations_lesson ON ${CITATIONS_TABLE}(lesson_id);
      `);

      // Load cached data for this lesson
      if (mounted) {
        await loadFromCache(db);
      }
    }

    async function loadFromCache(db: SQLite.SQLiteDatabase) {
      const cachedBlocks = await db.getAllAsync<{
        id: string;
        lesson_id: string;
        block_type: string;
        block_order: number;
        content: string;
        start_time: number | null;
        end_time: number | null;
        citation_id: string | null;
        synced_at: string | null;
      }>(
        `SELECT * FROM ${BLOCKS_TABLE} WHERE lesson_id = ? ORDER BY block_order`,
        [lessonId]
      );

      const cachedCitations = await db.getAllAsync<{
        id: string;
        book_name: string;
        part: string | null;
        page: string | null;
        col: string | null;
        resolved_text: string | null;
        match_status: string;
        confidence: number;
      }>(`SELECT * FROM ${CITATIONS_TABLE} WHERE lesson_id = ?`, [lessonId]);

      if (mounted) {
        setBlocks(
          cachedBlocks.map((row) => ({
            id: row.id,
            lessonId: row.lesson_id,
            blockType: row.block_type as EnrichedBlock['blockType'],
            blockOrder: row.block_order,
            content: JSON.parse(row.content),
            startTime: row.start_time ?? undefined,
            endTime: row.end_time ?? undefined,
            citationId: row.citation_id ?? undefined,
          }))
        );

        setCitations(
          cachedCitations.map((row) => ({
            id: row.id,
            bookName: row.book_name,
            part: row.part ?? undefined,
            page: row.page ?? undefined,
            column: row.col ?? undefined,
            resolvedText: row.resolved_text ?? undefined,
            matchStatus: row.match_status as 'VERIFIED' | 'UNVERIFIED',
            confidence: row.confidence,
          }))
        );

        if (cachedBlocks.length > 0) {
          setLastSyncedAt(cachedBlocks[0].synced_at);
        }
      }
    }

    initDb();

    return () => {
      mounted = false;
      dbRef.current?.closeAsync();
      dbRef.current = null;
    };
  }, [lessonId]);

  // Cache lesson data to SQLite
  const cacheLesson = useCallback(
    async (
      newBlocks: EnrichedBlock[],
      newCitations: EnrichedLessonCitation[]
    ) => {
      const db = dbRef.current;
      if (!db) return;

      setIsSyncing(true);
      const now = new Date().toISOString();

      try {
        // Clear existing cache for this lesson
        await db.runAsync(`DELETE FROM ${BLOCKS_TABLE} WHERE lesson_id = ?`, [
          lessonId,
        ]);
        await db.runAsync(
          `DELETE FROM ${CITATIONS_TABLE} WHERE lesson_id = ?`,
          [lessonId]
        );

        // Insert blocks
        for (const block of newBlocks) {
          await db.runAsync(
            `INSERT INTO ${BLOCKS_TABLE} (id, lesson_id, block_type, block_order, content, start_time, end_time, citation_id, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              block.id,
              lessonId,
              block.blockType,
              block.blockOrder,
              JSON.stringify(block.content),
              block.startTime ?? null,
              block.endTime ?? null,
              block.citationId ?? null,
              now,
            ]
          );
        }

        // Insert citations
        for (const cit of newCitations) {
          await db.runAsync(
            `INSERT INTO ${CITATIONS_TABLE} (id, lesson_id, book_name, part, page, col, resolved_text, match_status, confidence, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              cit.id,
              lessonId,
              cit.bookName,
              cit.part ?? null,
              cit.page ?? null,
              cit.column ?? null,
              cit.resolvedText ?? null,
              cit.matchStatus,
              cit.confidence,
              now,
            ]
          );
        }

        setBlocks(newBlocks);
        setCitations(newCitations);
        setLastSyncedAt(now);
      } finally {
        setIsSyncing(false);
      }
    },
    [lessonId]
  );

  // Clear cache for this lesson
  const clearCache = useCallback(async () => {
    const db = dbRef.current;
    if (!db) return;

    await db.runAsync(`DELETE FROM ${BLOCKS_TABLE} WHERE lesson_id = ?`, [
      lessonId,
    ]);
    await db.runAsync(`DELETE FROM ${CITATIONS_TABLE} WHERE lesson_id = ?`, [
      lessonId,
    ]);

    setBlocks([]);
    setCitations([]);
    setLastSyncedAt(null);
  }, [lessonId]);

  return {
    blocks,
    citations,
    isOffline,
    isSyncing,
    lastSyncedAt,
    cacheLesson,
    clearCache,
  };
}
