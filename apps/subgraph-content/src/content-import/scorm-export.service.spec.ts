import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScormExportService } from './scorm-export.service';

describe('ScormExportService', () => {
  let service: ScormExportService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ScormExportService();
  });

  it('exportCourseAsScorm2004 returns a downloadUrl string', async () => {
    const result = await service.exportCourseAsScorm2004(
      'course-abc',
      'tenant-1',
      'Test Course'
    );
    expect(typeof result.downloadUrl).toBe('string');
    expect(result.downloadUrl.length).toBeGreaterThan(0);
  });

  it('exportCourseAsScorm2004 returns expiresAt as ISO string 15+ minutes in future', async () => {
    const before = Date.now();
    const result = await service.exportCourseAsScorm2004(
      'course-abc',
      'tenant-1'
    );
    const expiresMs = new Date(result.expiresAt).getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    // Must be at least 14 minutes in the future (tolerance for execution time)
    expect(expiresMs).toBeGreaterThan(before + fifteenMinutes - 5000);
    // Must be a valid ISO string
    expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('exportCourseAsScorm2004 returns fileSizeBytes > 0', async () => {
    const result = await service.exportCourseAsScorm2004(
      'course-abc',
      'tenant-1',
      'My Course'
    );
    expect(result.fileSizeBytes).toBeGreaterThan(0);
  });

  it('buildManifest contains "ADL SCORM" and "2004 3rd Edition"', () => {
    const xml = service.buildManifest('course-xyz', 'My Course');
    expect(xml).toContain('ADL SCORM');
    expect(xml).toContain('2004 3rd Edition');
  });

  it('buildManifest escapes XML special chars in courseTitle (title with &)', () => {
    const xml = service.buildManifest('course-1', 'Science & Math <Fun>');
    expect(xml).toContain('Science &amp; Math &lt;Fun&gt;');
    expect(xml).not.toContain('Science & Math');
  });

  it('onModuleDestroy does not throw', () => {
    expect(() => service.onModuleDestroy()).not.toThrow();
  });
});
