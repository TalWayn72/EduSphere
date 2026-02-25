/** Minimal Jest manual mock for expo-file-system. */

export const documentDirectory = '/mock/docs/';

export const getTotalDiskCapacityAsync = jest.fn().mockResolvedValue(100 * 1024 * 1024 * 1024);
export const getFreeDiskStorageAsync = jest.fn().mockResolvedValue(60 * 1024 * 1024 * 1024);
export const getInfoAsync = jest.fn().mockResolvedValue({ exists: false });
export const readDirectoryAsync = jest.fn().mockResolvedValue([]);
export const makeDirectoryAsync = jest.fn().mockResolvedValue(undefined);
export const deleteAsync = jest.fn().mockResolvedValue(undefined);
export const writeAsStringAsync = jest.fn().mockResolvedValue(undefined);
export const readAsStringAsync = jest.fn().mockResolvedValue('');

export const createDownloadResumable = jest.fn().mockReturnValue({
  downloadAsync: jest.fn().mockResolvedValue({ uri: '/mock/file.mp4' }),
  pauseAsync: jest.fn(),
  resumeAsync: jest.fn(),
  cancelAsync: jest.fn(),
});
