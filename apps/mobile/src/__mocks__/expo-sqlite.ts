/** Minimal Jest manual mock for expo-sqlite. */

const mockDb = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  runAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  execSync: jest.fn(),
  runSync: jest.fn(),
  getAllSync: jest.fn().mockReturnValue([]),
  getFirstSync: jest.fn().mockReturnValue(null),
  closeSync: jest.fn(),
};

export const openDatabaseAsync = jest.fn().mockResolvedValue(mockDb);
export const openDatabaseSync = jest.fn().mockReturnValue(mockDb);
