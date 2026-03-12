import { vi, describe, it, expect } from 'vitest';
import { Logger } from '@nestjs/common';
import { AeoController } from './aeo.controller';
import { AeoService } from './aeo.service';

// Mock @edusphere/db so AeoService can be instantiated without a real DB
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue([]),
  })),
  closeAllPools: vi.fn(),
}));

// Suppress NestJS logger noise in test output
vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);

const MOCK_CATALOG = Array.from({ length: 6 }, (_, i) => ({
  id: `cat-00${i + 1}`,
  name: `Course ${i + 1}`,
  description: `Description ${i + 1}`,
  level: 'beginner' as const,
  duration: '8 weeks',
  category: 'AI',
  slug: `course-${i + 1}`,
}));

const MOCK_INSTRUCTORS = Array.from({ length: 4 }, (_, i) => ({
  id: `inst-00${i + 1}`,
  name: `Instructor ${i + 1}`,
  jobTitle: 'Professor',
  university: 'EduSphere University',
  description: `Bio ${i + 1}`,
  specialization: 'Computer Science',
}));

function buildController() {
  const svc = new AeoService();
  const ctrl = new AeoController(svc);
  return { ctrl, svc };
}

describe('AeoController', () => {
  describe('getFeatures', () => {
    it('returns the feature list', () => {
      const { ctrl } = buildController();
      const result = ctrl.getFeatures();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('category');
    });
  });

  describe('getFaq', () => {
    it('returns FAQ items', () => {
      const { ctrl } = buildController();
      const result = ctrl.getFaq();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('question');
      expect(result[0]).toHaveProperty('answer');
    });
  });

  describe('getCourses', () => {
    it('returns courses from service', async () => {
      const svc = new AeoService();
      vi.spyOn(svc, 'getPublicCourses').mockResolvedValue([
        { id: 'abc-123', title: 'Intro to AI', description: 'Learn AI basics', slug: 'intro-to-ai' },
      ]);
      const ctrl = new AeoController(svc);
      const courses = await ctrl.getCourses();
      expect(courses).toHaveLength(1);
      expect(courses[0].id).toBe('abc-123');
    });

    it('returns empty array when no published courses', async () => {
      const svc = new AeoService();
      vi.spyOn(svc, 'getPublicCourses').mockResolvedValue([]);
      const ctrl = new AeoController(svc);
      const courses = await ctrl.getCourses();
      expect(courses).toEqual([]);
    });
  });

  describe('getSitemap', () => {
    it('calls generateSitemapXml and sends XML via res.send', async () => {
      const svc = new AeoService();
      vi.spyOn(svc, 'generateSitemapXml').mockResolvedValue('<?xml version="1.0"?><urlset/>');
      const ctrl = new AeoController(svc);
      const mockRes = { send: vi.fn() } as unknown as import('express').Response;
      await ctrl.getSitemap(mockRes);
      expect(svc.generateSitemapXml).toHaveBeenCalledOnce();
      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('<?xml'));
    });
  });

  describe('getCatalog', () => {
    it('returns 200 with array of 6 catalog items', () => {
      const svc = new AeoService();
      vi.spyOn(svc, 'getCatalog').mockReturnValue(MOCK_CATALOG);
      const ctrl = new AeoController(svc);
      const result = ctrl.getCatalog();
      expect(result).toHaveLength(6);
      expect(svc.getCatalog).toHaveBeenCalledOnce();
    });

    it('each catalog item has required fields: id, name, description, level, duration, category, slug', () => {
      const svc = new AeoService();
      vi.spyOn(svc, 'getCatalog').mockReturnValue(MOCK_CATALOG);
      const ctrl = new AeoController(svc);
      const result = ctrl.getCatalog();
      for (const item of result) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('description');
        expect(item).toHaveProperty('level');
        expect(item).toHaveProperty('duration');
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('slug');
      }
    });

    it('real getCatalog returns exactly 6 items with valid shapes', () => {
      const { ctrl } = buildController();
      const result = ctrl.getCatalog();
      expect(result).toHaveLength(6);
      for (const item of result) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('description');
        expect(['beginner', 'intermediate', 'advanced']).toContain(item.level);
        expect(item.duration).toBeTruthy();
        expect(item.category).toBeTruthy();
        expect(item.slug).toBeTruthy();
      }
    });
  });

  describe('getInstructors', () => {
    it('returns 200 with array of 4 instructor profiles', () => {
      const svc = new AeoService();
      vi.spyOn(svc, 'getInstructors').mockReturnValue(MOCK_INSTRUCTORS);
      const ctrl = new AeoController(svc);
      const result = ctrl.getInstructors();
      expect(result).toHaveLength(4);
      expect(svc.getInstructors).toHaveBeenCalledOnce();
    });

    it('each instructor has required fields: id, name, jobTitle, university, description, specialization', () => {
      const svc = new AeoService();
      vi.spyOn(svc, 'getInstructors').mockReturnValue(MOCK_INSTRUCTORS);
      const ctrl = new AeoController(svc);
      const result = ctrl.getInstructors();
      for (const inst of result) {
        expect(inst).toHaveProperty('id');
        expect(inst).toHaveProperty('name');
        expect(inst).toHaveProperty('jobTitle');
        expect(inst).toHaveProperty('university');
        expect(inst).toHaveProperty('description');
        expect(inst).toHaveProperty('specialization');
      }
    });

    it('real getInstructors returns exactly 4 items with valid shapes', () => {
      const { ctrl } = buildController();
      const result = ctrl.getInstructors();
      expect(result).toHaveLength(4);
      for (const inst of result) {
        expect(inst.id).toBeTruthy();
        expect(inst.name).toBeTruthy();
        expect(inst.jobTitle).toBeTruthy();
        expect(inst.university).toBeTruthy();
        expect(inst.specialization).toBeTruthy();
      }
    });
  });
});
