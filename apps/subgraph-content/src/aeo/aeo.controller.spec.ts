import { Test } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AeoController } from './aeo.controller';
import { AeoService } from './aeo.service';

const mockAeoService = {
  generateSitemapXml: vi.fn().mockResolvedValue('<?xml version="1.0"?>...'),
  getPublicCourses: vi.fn().mockResolvedValue([
    { id: 'abc-123', title: 'Intro to AI', description: 'Learn AI basics', slug: 'intro-to-ai' },
  ]),
  getFeatures: vi.fn().mockReturnValue([
    { id: 'ai-tutoring', title: 'AI Tutoring (Chavruta)', description: 'test', category: 'core' },
  ]),
  getFaq: vi.fn().mockReturnValue([
    { question: 'What is EduSphere?', answer: 'An AI-powered LMS.' },
  ]),
};

describe('AeoController', () => {
  let controller: AeoController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AeoController],
      providers: [{ provide: AeoService, useValue: mockAeoService }],
    }).compile();

    controller = module.get<AeoController>(AeoController);
    vi.clearAllMocks();
  });

  describe('getFeatures', () => {
    it('returns the feature list', () => {
      mockAeoService.getFeatures.mockReturnValue([
        { id: 'ai-tutoring', title: 'AI Tutoring (Chavruta)', description: 'test', category: 'core' },
      ]);
      const result = controller.getFeatures();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ai-tutoring');
    });
  });

  describe('getFaq', () => {
    it('returns FAQ items', () => {
      mockAeoService.getFaq.mockReturnValue([
        { question: 'What is EduSphere?', answer: 'An AI-powered LMS.' },
      ]);
      const result = controller.getFaq();
      expect(result).toHaveLength(1);
      expect(result[0].question).toBe('What is EduSphere?');
    });
  });

  describe('getCourses', () => {
    it('returns courses from service', async () => {
      mockAeoService.getPublicCourses.mockResolvedValue([
        { id: 'abc-123', title: 'Intro to AI', description: 'Learn AI basics', slug: 'intro-to-ai' },
      ]);
      const courses = await controller.getCourses();
      expect(courses).toHaveLength(1);
      expect(courses[0].id).toBe('abc-123');
      expect(mockAeoService.getPublicCourses).toHaveBeenCalledOnce();
    });

    it('returns empty array when no published courses', async () => {
      mockAeoService.getPublicCourses.mockResolvedValue([]);
      const courses = await controller.getCourses();
      expect(courses).toEqual([]);
    });
  });

  describe('getSitemap', () => {
    it('calls generateSitemapXml and sends XML via res.send', async () => {
      mockAeoService.generateSitemapXml.mockResolvedValue('<?xml version="1.0"?><urlset/>');
      const mockRes = { send: vi.fn() } as unknown as import('express').Response;
      await controller.getSitemap(mockRes);
      expect(mockAeoService.generateSitemapXml).toHaveBeenCalledOnce();
      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('<?xml'));
    });
  });
});
