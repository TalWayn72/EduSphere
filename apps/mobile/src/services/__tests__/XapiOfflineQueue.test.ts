import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mock functions are available when the factory runs
const { execSyncMock, runSyncMock, getAllSyncMock, getFirstSyncMock } = vi.hoisted(() => ({
  execSyncMock: vi.fn(),
  runSyncMock: vi.fn(),
  getAllSyncMock: vi.fn(),
  getFirstSyncMock: vi.fn(),
}));

vi.mock('expo-sqlite', () => ({
  openDatabaseSync: () => ({
    execSync: execSyncMock,
    runSync: runSyncMock,
    getAllSync: getAllSyncMock,
    getFirstSync: getFirstSyncMock,
  }),
}));

import {
  initXapiQueue,
  enqueueStatement,
  getPendingStatements,
  deleteStatements,
  getQueueSize,
} from '../XapiOfflineQueue';

describe('XapiOfflineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initXapiQueue calls execSync with CREATE TABLE', () => {
    initXapiQueue();
    expect(execSyncMock).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS xapi_queue'),
    );
  });

  it('enqueueStatement calls runSync with INSERT and also calls evictOldStatements', () => {
    enqueueStatement('tenant-1', { verb: 'test' });
    // INSERT call
    expect(runSyncMock).toHaveBeenCalledWith(
      'INSERT INTO xapi_queue VALUES (?, ?, ?, ?)',
      expect.arrayContaining(['tenant-1']),
    );
    // evictOldStatements also calls runSync (DELETE)
    expect(runSyncMock).toHaveBeenCalledTimes(2);
  });

  it('getPendingStatements calls getAllSync with ASC order and limit', () => {
    getAllSyncMock.mockReturnValueOnce([]);
    const result = getPendingStatements(25);
    expect(getAllSyncMock).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY created_at ASC LIMIT ?'),
      [25],
    );
    expect(result).toEqual([]);
  });

  it('deleteStatements does nothing when ids array is empty', () => {
    deleteStatements([]);
    expect(runSyncMock).not.toHaveBeenCalled();
  });

  it('getQueueSize returns count from DB', () => {
    getFirstSyncMock.mockReturnValueOnce({ count: 42 });
    expect(getQueueSize()).toBe(42);
  });
});
