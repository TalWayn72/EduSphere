import { describe, it, expect } from 'vitest';
import { FAQ_ITEMS, GLOSSARY_TERMS } from './aeo-data';
import type { GlossaryTerm } from './aeo-data';

describe('FAQ_ITEMS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(FAQ_ITEMS)).toBe(true);
    expect(FAQ_ITEMS.length).toBeGreaterThan(0);
  });

  it('each item has question and answer strings', () => {
    FAQ_ITEMS.forEach((item) => {
      expect(typeof item.question).toBe('string');
      expect(item.question.length).toBeGreaterThan(0);
      expect(typeof item.answer).toBe('string');
      expect(item.answer.length).toBeGreaterThan(0);
    });
  });

  it('each question ends with a question mark', () => {
    FAQ_ITEMS.forEach((item) => {
      expect(item.question.endsWith('?')).toBe(true);
    });
  });

  it('has no duplicate questions', () => {
    const questions = FAQ_ITEMS.map((item) => item.question);
    const unique = new Set(questions);
    expect(unique.size).toBe(questions.length);
  });

  it('has at least 10 FAQ items for comprehensive SEO coverage', () => {
    expect(FAQ_ITEMS.length).toBeGreaterThanOrEqual(10);
  });
});

describe('GLOSSARY_TERMS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(GLOSSARY_TERMS)).toBe(true);
    expect(GLOSSARY_TERMS.length).toBeGreaterThan(0);
  });

  it('each term has all required fields', () => {
    GLOSSARY_TERMS.forEach((term: GlossaryTerm) => {
      expect(typeof term.term).toBe('string');
      expect(term.term.length).toBeGreaterThan(0);
      expect(typeof term.shortDef).toBe('string');
      expect(term.shortDef.length).toBeGreaterThan(0);
      expect(typeof term.fullDef).toBe('string');
      expect(term.fullDef.length).toBeGreaterThan(0);
      expect(typeof term.category).toBe('string');
      expect(term.category.length).toBeGreaterThan(0);
    });
  });

  it('has no duplicate terms', () => {
    const terms = GLOSSARY_TERMS.map((t) => t.term);
    const unique = new Set(terms);
    expect(unique.size).toBe(terms.length);
  });

  it('fullDef is longer than shortDef for every term', () => {
    GLOSSARY_TERMS.forEach((term) => {
      expect(term.fullDef.length).toBeGreaterThan(term.shortDef.length);
    });
  });

  it('categories are from a valid set', () => {
    const validCategories = ['AI & Technology', 'Pedagogy', 'Standards', 'Technical'];
    GLOSSARY_TERMS.forEach((term) => {
      expect(validCategories).toContain(term.category);
    });
  });

  it('has at least 10 glossary terms', () => {
    expect(GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(10);
  });
});
