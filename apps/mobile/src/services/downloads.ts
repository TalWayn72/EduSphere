import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from './database';
import { storageManager } from './StorageManager';
import { isWifiConnected } from './networkUtils';

export interface DownloadProgress {
  courseId: string;
  totalBytes: number;
  bytesDownloaded: number;
  percentage: number;
}

export interface OfflineCourse {
  id: string;
  title: string;
  description: string;
  downloadedAt: number;
  size: number;
  lessonsCount: number;
}

export class DownloadService {
  private downloads = new Map<string, FileSystem.DownloadResumable>();
  private progressCallbacks = new Map<
    string,
    (progress: DownloadProgress) => void
  >();

  async downloadCourse(
    courseId: string,
    courseData: any,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    if (this.downloads.has(courseId)) {
      throw new Error('Course is already being downloaded');
    }

    // Quota guard — estimate total size before committing (sum of lesson video sizes if known)
    const estimatedBytes: number = (courseData.lessons ?? []).reduce(
      (sum: number, l: { estimatedSizeBytes?: number }) =>
        sum + (l.estimatedSizeBytes ?? 0),
      0
    );
    if (estimatedBytes > 0) {
      const ok = await storageManager.isStorageAvailable(estimatedBytes);
      if (!ok) {
        const stats = await storageManager.getStats();
        throw new Error(
          `STORAGE_QUOTA_EXCEEDED:${stats.eduSphereUsedBytes}:${stats.eduSphereQuotaBytes}`
        );
      }
    }

    // WiFi-only guard
    const wifiOnlyRaw = await AsyncStorage.getItem('edusphere_wifi_only_download').catch(() => null);
    if (wifiOnlyRaw === 'true') {
      const onWifi = await isWifiConnected();
      if (!onWifi) {
        throw new Error('WIFI_REQUIRED');
      }
    }

    if (onProgress) {
      this.progressCallbacks.set(courseId, onProgress);
    }

    const courseDir = `${FileSystem.documentDirectory}courses/${courseId}/`;
    await FileSystem.makeDirectoryAsync(courseDir, { intermediates: true });

    // Download course metadata
    await FileSystem.writeAsStringAsync(
      `${courseDir}metadata.json`,
      JSON.stringify(courseData)
    );

    // Download lessons
    let totalSize = 0;
    for (const lesson of courseData.lessons) {
      if (lesson.videoUrl) {
        const downloadResumable = FileSystem.createDownloadResumable(
          lesson.videoUrl,
          `${courseDir}${lesson.id}.mp4`,
          {},
          (downloadProgress) => {
            const percentage =
              (downloadProgress.totalBytesWritten /
                downloadProgress.totalBytesExpectedToWrite) *
              100;
            onProgress?.({
              courseId,
              totalBytes: downloadProgress.totalBytesExpectedToWrite,
              bytesDownloaded: downloadProgress.totalBytesWritten,
              percentage,
            });
          }
        );

        this.downloads.set(`${courseId}-${lesson.id}`, downloadResumable);

        try {
          const result = await downloadResumable.downloadAsync();
          if (result) {
            const fileInfo = await FileSystem.getInfoAsync(result.uri);
            if (fileInfo.exists && 'size' in fileInfo) {
              totalSize += fileInfo.size;
            }
          }
        } finally {
          this.downloads.delete(`${courseId}-${lesson.id}`);
        }
      }
    }

    // Save to database
    await database.init();
    await this.saveOfflineCourse({
      id: courseId,
      title: courseData.title,
      description: courseData.description,
      downloadedAt: Date.now(),
      size: totalSize,
      lessonsCount: courseData.lessons.length,
    });

    this.progressCallbacks.delete(courseId);
  }

  async pauseDownload(courseId: string, lessonId?: string): Promise<void> {
    const key = lessonId ? `${courseId}-${lessonId}` : courseId;
    const download = this.downloads.get(key);

    if (download) {
      await download.pauseAsync();
    }
  }

  async resumeDownload(courseId: string, lessonId?: string): Promise<void> {
    const key = lessonId ? `${courseId}-${lessonId}` : courseId;
    const download = this.downloads.get(key);

    if (download) {
      await download.resumeAsync();
    }
  }

  async cancelDownload(courseId: string, lessonId?: string): Promise<void> {
    const key = lessonId ? `${courseId}-${lessonId}` : courseId;
    const download = this.downloads.get(key);

    if (download) {
      await download.cancelAsync();
      this.downloads.delete(key);
    }
  }

  async deleteCourse(courseId: string): Promise<void> {
    const courseDir = `${FileSystem.documentDirectory}courses/${courseId}/`;
    const dirInfo = await FileSystem.getInfoAsync(courseDir);

    if (dirInfo.exists) {
      await FileSystem.deleteAsync(courseDir, { idempotent: true });
    }

    await this.deleteOfflineCourse(courseId);
  }

  async getOfflineCourses(): Promise<OfflineCourse[]> {
    await database.init();

    const result = await database.pool?.getAllAsync<any>(
      'SELECT * FROM offline_courses ORDER BY downloaded_at DESC'
    );

    return (result || []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      downloadedAt: row.downloaded_at,
      size: row.size,
      lessonsCount: row.lessons_count,
    }));
  }

  async getCourseSize(courseId: string): Promise<number> {
    const courseDir = `${FileSystem.documentDirectory}courses/${courseId}/`;
    const dirInfo = await FileSystem.getInfoAsync(courseDir);

    if (!dirInfo.exists) {
      return 0;
    }

    const files = await FileSystem.readDirectoryAsync(courseDir);
    let totalSize = 0;

    for (const file of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${courseDir}${file}`);
      if (fileInfo.exists && 'size' in fileInfo) {
        totalSize += fileInfo.size;
      }
    }

    return totalSize;
  }

  async getTotalDownloadSize(): Promise<number> {
    const courses = await this.getOfflineCourses();
    return courses.reduce((sum, course) => sum + course.size, 0);
  }

  private async saveOfflineCourse(course: OfflineCourse): Promise<void> {
    await database.pool?.runAsync(
      `INSERT OR REPLACE INTO offline_courses
       (id, title, description, downloaded_at, size, lessons_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        course.id,
        course.title,
        course.description,
        course.downloadedAt,
        course.size,
        course.lessonsCount,
      ]
    );
  }

  private async deleteOfflineCourse(courseId: string): Promise<void> {
    await database.pool?.runAsync('DELETE FROM offline_courses WHERE id = ?', [
      courseId,
    ]);
  }
}

export const downloadService = new DownloadService();
