/**
 * Barrel re-export tests for seo/index.ts
 */
import { describe, it, expect } from 'vitest';
import * as barrel from './index';

describe('seo/index barrel', () => {
  it('exports PageMeta', () => {
    expect(barrel.PageMeta).toBeDefined();
    expect(typeof barrel.PageMeta).toBe('function');
  });

  it('exports OrganizationSchema', () => {
    expect(barrel.OrganizationSchema).toBeDefined();
    expect(typeof barrel.OrganizationSchema).toBe('function');
  });

  it('exports WebSiteSchema', () => {
    expect(barrel.WebSiteSchema).toBeDefined();
    expect(typeof barrel.WebSiteSchema).toBe('function');
  });

  it('exports FAQSchema', () => {
    expect(barrel.FAQSchema).toBeDefined();
    expect(typeof barrel.FAQSchema).toBe('function');
  });

  it('exports BreadcrumbSchema', () => {
    expect(barrel.BreadcrumbSchema).toBeDefined();
    expect(typeof barrel.BreadcrumbSchema).toBe('function');
  });

  it('exports SoftwareApplicationSchema', () => {
    expect(barrel.SoftwareApplicationSchema).toBeDefined();
    expect(typeof barrel.SoftwareApplicationSchema).toBe('function');
  });

  it('exports CourseSchema', () => {
    expect(barrel.CourseSchema).toBeDefined();
    expect(typeof barrel.CourseSchema).toBe('function');
  });

  it('exports PersonSchema', () => {
    expect(barrel.PersonSchema).toBeDefined();
    expect(typeof barrel.PersonSchema).toBe('function');
  });

  it('exports HowToSchema', () => {
    expect(barrel.HowToSchema).toBeDefined();
    expect(typeof barrel.HowToSchema).toBe('function');
  });

  it('exports ArticleSchema', () => {
    expect(barrel.ArticleSchema).toBeDefined();
    expect(typeof barrel.ArticleSchema).toBe('function');
  });
});
