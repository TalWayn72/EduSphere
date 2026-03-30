/**
 * AeoService — Answer Engine Optimization (AEO) data endpoints.
 * Delegates static content to AeoContentService.
 * Handles: sitemap XML, public courses, enhanced sitemap.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createDatabaseConnection, closeAllPools } from '@edusphere/db';
import { sql } from 'drizzle-orm';
import { AeoContentService } from './aeo-content.service';

const BASE_URL = process.env['AEO_BASE_URL'] ?? 'https://app.edusphere.dev';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  priority?: number;
}

export interface PublicCourse {
  id: string;
  title: string;
  description: string | null;
  slug: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  category: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface CatalogCourse {
  id: string;
  name: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  category: string;
  slug: string;
}

export interface InstructorProfile {
  id: string;
  name: string;
  jobTitle: string;
  university: string;
  description: string;
  specialization: string;
}

@Injectable()
export class AeoService implements OnModuleDestroy {
  private readonly logger = new Logger(AeoService.name);
  private readonly db = createDatabaseConnection();

  constructor(private readonly content: AeoContentService) {}

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getPublicCourses(): Promise<PublicCourse[]> {
    try {
      const rows = await this.db.execute(
        sql`SELECT id::text, title, description, slug
            FROM courses
            WHERE is_published = true
            ORDER BY created_at DESC
            LIMIT 100`
      );
      return rows as unknown as PublicCourse[];
    } catch (err) {
      this.logger.error({ err }, '[AeoService] getPublicCourses failed — returning empty list');
      return [];
    }
  }

  private getStaticUrls(): SitemapUrl[] {
    return [
      { loc: `${BASE_URL}/landing`, changefreq: 'weekly', priority: 1.0 },
      { loc: `${BASE_URL}/features`, changefreq: 'monthly', priority: 0.9 },
      { loc: `${BASE_URL}/faq`, changefreq: 'monthly', priority: 0.8 },
      { loc: `${BASE_URL}/glossary`, changefreq: 'weekly', priority: 0.8 },
      { loc: `${BASE_URL}/catalog`, changefreq: 'weekly', priority: 0.9 },
      { loc: `${BASE_URL}/instructors`, changefreq: 'monthly', priority: 0.8 },
      { loc: `${BASE_URL}/pricing`, changefreq: 'monthly', priority: 0.8 },
      { loc: `${BASE_URL}/pilot`, changefreq: 'monthly', priority: 0.7 },
      { loc: `${BASE_URL}/accessibility`, changefreq: 'monthly', priority: 0.5 },
      { loc: `${BASE_URL}/blog`, changefreq: 'weekly', priority: 0.9 },
      { loc: `${BASE_URL}/blog/knowledge-graphs-in-education`, changefreq: 'monthly', priority: 0.8 },
      { loc: `${BASE_URL}/blog/ai-tutoring-chavruta-method`, changefreq: 'monthly', priority: 0.8 },
      { loc: `${BASE_URL}/blog/scorm-future-xapi-lti`, changefreq: 'monthly', priority: 0.8 },
      { loc: `${BASE_URL}/blog/compliance-learning-automation`, changefreq: 'monthly', priority: 0.8 },
    ];
  }

  private async getCourseUrls(): Promise<SitemapUrl[]> {
    try {
      const courses = await this.getPublicCourses();
      return courses.map((c) => ({
        loc: `${BASE_URL}/courses/${c.id}`,
        changefreq: 'weekly' as const,
        priority: 0.7,
      }));
    } catch (err) {
      this.logger.warn({ err }, '[AeoService] Sitemap course fetch failed — using static URLs only');
      return [];
    }
  }

  async getEnhancedSitemap(): Promise<SitemapUrl[]> {
    const courseUrls = await this.getCourseUrls();
    return [...this.getStaticUrls(), ...courseUrls];
  }

  async generateSitemapXml(): Promise<string> {
    const courseUrls = await this.getCourseUrls();
    const allUrls = [...this.getStaticUrls(), ...courseUrls];
    const today = new Date().toISOString().split('T')[0];

    const urlEntries = allUrls
      .map(
        (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod ?? today}</lastmod>
    <changefreq>${u.changefreq ?? 'monthly'}</changefreq>
    <priority>${(u.priority ?? 0.5).toFixed(1)}</priority>
  </url>`
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlEntries}
</urlset>`;
  }

  getCatalog(): CatalogCourse[] {
    return this.content.getCatalog();
  }

  getInstructors(): InstructorProfile[] {
    return this.content.getInstructors();
  }

  getFeatures(): FeatureItem[] {
    return this.content.getFeatures();
  }

  getFaq(): FaqItem[] {
    return this.content.getFaq();
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
