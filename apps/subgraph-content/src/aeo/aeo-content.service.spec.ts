/**
 * AeoContentService unit tests — static catalog, instructor, feature, FAQ data.
 * 12 tests covering all 4 getter methods and data integrity.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { AeoContentService } from './aeo-content.service.js';

describe('AeoContentService', () => {
  let svc: AeoContentService;

  beforeEach(() => {
    svc = new AeoContentService();
  });

  it('constructs without errors', () => {
    expect(svc).toBeInstanceOf(AeoContentService);
  });

  // ── getCatalog ──────────────────────────────────────────────────────────────

  it('getCatalog returns 6 courses', () => {
    const catalog = svc.getCatalog();
    expect(catalog).toHaveLength(6);
  });

  it('getCatalog entries have required fields', () => {
    const catalog = svc.getCatalog();
    for (const course of catalog) {
      expect(course.id).toBeTruthy();
      expect(course.name).toBeTruthy();
      expect(course.description).toBeTruthy();
      expect(['beginner', 'intermediate', 'advanced']).toContain(course.level);
      expect(course.duration).toBeTruthy();
      expect(course.category).toBeTruthy();
      expect(course.slug).toBeTruthy();
    }
  });

  it('getCatalog has unique IDs', () => {
    const ids = svc.getCatalog().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // ── getInstructors ──────────────────────────────────────────────────────────

  it('getInstructors returns 4 instructor profiles', () => {
    const instructors = svc.getInstructors();
    expect(instructors).toHaveLength(4);
  });

  it('getInstructors entries have required fields', () => {
    const instructors = svc.getInstructors();
    for (const inst of instructors) {
      expect(inst.id).toBeTruthy();
      expect(inst.name).toBeTruthy();
      expect(inst.jobTitle).toBeTruthy();
      expect(inst.university).toBeTruthy();
      expect(inst.description).toBeTruthy();
      expect(inst.specialization).toBeTruthy();
    }
  });

  // ── getFeatures ─────────────────────────────────────────────────────────────

  it('getFeatures returns 6 feature items', () => {
    const features = svc.getFeatures();
    expect(features).toHaveLength(6);
  });

  it('getFeatures entries have valid categories', () => {
    const features = svc.getFeatures();
    const validCategories = [
      'core',
      'engagement',
      'enterprise',
      'collaboration',
      'accessibility',
    ];
    for (const feat of features) {
      expect(validCategories).toContain(feat.category);
    }
  });

  it('getFeatures includes AI Tutoring feature', () => {
    const features = svc.getFeatures();
    const aiTutoring = features.find((f) => f.id === 'ai-tutoring');
    expect(aiTutoring).toBeDefined();
    expect(aiTutoring!.title).toContain('Chavruta');
  });

  // ── getFaq ──────────────────────────────────────────────────────────────────

  it('getFaq returns 5 FAQ items', () => {
    const faq = svc.getFaq();
    expect(faq).toHaveLength(5);
  });

  it('getFaq entries have question and answer', () => {
    const faq = svc.getFaq();
    for (const item of faq) {
      expect(item.question).toBeTruthy();
      expect(item.answer).toBeTruthy();
      expect(item.question.endsWith('?')).toBe(true);
    }
  });

  it('getFaq includes pricing question', () => {
    const faq = svc.getFaq();
    const pricing = faq.find((f) =>
      f.question.toLowerCase().includes('pricing')
    );
    expect(pricing).toBeDefined();
    expect(pricing!.answer).toContain('Free');
  });
});
