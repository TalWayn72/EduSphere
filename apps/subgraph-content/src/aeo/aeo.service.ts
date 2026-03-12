/**
 * AeoService — Answer Engine Optimization (AEO) data endpoints.
 *
 * Provides public catalog data for SEO/AEO scrapers:
 *   - Dynamic XML sitemap
 *   - Public course catalog (no RLS — published courses only)
 *   - Platform feature descriptions
 *   - FAQ items
 */
import { Injectable, Logger } from '@nestjs/common';
import { createDatabaseConnection } from '@edusphere/db';
import { sql } from 'drizzle-orm';

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
export class AeoService {
  private readonly logger = new Logger(AeoService.name);
  private readonly db = createDatabaseConnection();

  async getPublicCourses(): Promise<PublicCourse[]> {
    try {
      // Public catalog — no tenant context. RLS is bypassed because we use
      // the service-role connection (no SET LOCAL app.current_tenant).
      // Only published courses are returned.
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

  async getEnhancedSitemap(): Promise<SitemapUrl[]> {
    const staticUrls: SitemapUrl[] = [
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
    let courseUrls: SitemapUrl[] = [];
    try {
      const courses = await this.getPublicCourses();
      courseUrls = courses.map((c) => ({
        loc: `${BASE_URL}/courses/${c.id}`,
        changefreq: 'weekly' as const,
        priority: 0.7,
      }));
    } catch (err) {
      this.logger.warn({ err }, '[AeoService] Enhanced sitemap course fetch failed — using static URLs only');
    }
    return [...staticUrls, ...courseUrls];
  }

  async generateSitemapXml(): Promise<string> {
    const staticUrls: SitemapUrl[] = [
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

    let courseUrls: SitemapUrl[] = [];
    try {
      const courses = await this.getPublicCourses();
      courseUrls = courses.map((c) => ({
        loc: `${BASE_URL}/courses/${c.id}`,
        changefreq: 'weekly' as const,
        priority: 0.7,
      }));
    } catch (err) {
      this.logger.warn({ err }, '[AeoService] Sitemap course fetch failed — using static URLs only');
    }

    const allUrls = [...staticUrls, ...courseUrls];
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
    return [
      {
        id: 'cat-001',
        name: 'Introduction to Artificial Intelligence',
        description: 'Master AI fundamentals including machine learning, neural networks, and practical applications.',
        level: 'beginner',
        duration: '8 weeks',
        category: 'Artificial Intelligence',
        slug: 'intro-to-artificial-intelligence',
      },
      {
        id: 'cat-002',
        name: 'Advanced Knowledge Graphs',
        description: 'Build and query knowledge graphs using Apache AGE and Cypher with real-world datasets.',
        level: 'advanced',
        duration: '10 weeks',
        category: 'Data Engineering',
        slug: 'advanced-knowledge-graphs',
      },
      {
        id: 'cat-003',
        name: 'Full-Stack Development with NestJS',
        description: 'Build production-grade APIs with NestJS, GraphQL Federation, and PostgreSQL.',
        level: 'intermediate',
        duration: '12 weeks',
        category: 'Software Engineering',
        slug: 'full-stack-nestjs',
      },
      {
        id: 'cat-004',
        name: 'Data Science Essentials',
        description: 'Hands-on data analysis, visualization, and predictive modelling with Python.',
        level: 'beginner',
        duration: '6 weeks',
        category: 'Data Science',
        slug: 'data-science-essentials',
      },
      {
        id: 'cat-005',
        name: 'Cybersecurity Fundamentals',
        description: 'Learn threat modelling, penetration testing, and secure-by-design principles.',
        level: 'intermediate',
        duration: '8 weeks',
        category: 'Security',
        slug: 'cybersecurity-fundamentals',
      },
      {
        id: 'cat-006',
        name: 'Cloud Architecture on AWS',
        description: 'Design scalable, resilient cloud architectures using AWS services and Infrastructure as Code.',
        level: 'advanced',
        duration: '10 weeks',
        category: 'Cloud Computing',
        slug: 'cloud-architecture-aws',
      },
    ];
  }

  getInstructors(): InstructorProfile[] {
    return [
      {
        id: 'inst-001',
        name: 'Dr. Sarah Cohen',
        jobTitle: 'Professor of Computer Science',
        university: 'Hebrew University of Jerusalem',
        description: 'Leading researcher in AI-assisted education and adaptive learning systems with 15 years of teaching experience.',
        specialization: 'Artificial Intelligence & Machine Learning',
      },
      {
        id: 'inst-002',
        name: 'Prof. Ariel Ben-David',
        jobTitle: 'Associate Professor',
        university: 'Technion — Israel Institute of Technology',
        description: 'Specializes in distributed systems and cloud-native architectures. Author of three textbooks on microservices.',
        specialization: 'Distributed Systems & Cloud Architecture',
      },
      {
        id: 'inst-003',
        name: 'Dr. Miriam Levi',
        jobTitle: 'Senior Data Scientist',
        university: 'Tel Aviv University',
        description: 'Expert in knowledge graph construction and semantic search. Former research lead at a Fortune 500 company.',
        specialization: 'Knowledge Graphs & Semantic Search',
      },
      {
        id: 'inst-004',
        name: 'Yonatan Shapiro',
        jobTitle: 'Principal Security Engineer',
        university: 'Ben-Gurion University of the Negev',
        description: 'Cybersecurity practitioner and educator with deep expertise in penetration testing and secure software design.',
        specialization: 'Cybersecurity & Secure Software Design',
      },
    ];
  }

  getFeatures(): FeatureItem[] {
    return [
      {
        id: 'ai-tutoring',
        title: 'AI Tutoring (Chavruta)',
        description:
          'Socratic dialogue AI tutor that adapts to your learning pace and builds concept connections in your knowledge graph.',
        category: 'core',
      },
      {
        id: 'knowledge-graph',
        title: 'Knowledge Graph',
        description:
          'Apache AGE-powered visual concept network mapping your learning history with semantic search via pgvector.',
        category: 'core',
      },
      {
        id: 'gamification',
        title: 'Gamification',
        description:
          '5-level mastery system, daily streaks, OpenBadges 3.0-certified badges, and leaderboards.',
        category: 'engagement',
      },
      {
        id: 'enterprise',
        title: 'Enterprise LMS',
        description:
          'Multi-tenant, SSO/SAML/SCIM, GDPR, WCAG 2.2 AA, SCORM, xAPI, LTI 1.3, white-labeling.',
        category: 'enterprise',
      },
      {
        id: 'live-sessions',
        title: 'Live Sessions',
        description:
          'Real-time instructor-led sessions with attendance tracking and session recording.',
        category: 'collaboration',
      },
      {
        id: 'multilingual',
        title: 'Multi-Language',
        description: '50+ languages with full RTL support for Hebrew and Arabic.',
        category: 'accessibility',
      },
    ];
  }

  getFaq(): FaqItem[] {
    return [
      {
        question: 'What is EduSphere?',
        answer:
          'EduSphere is an AI-powered learning management system (LMS) that combines knowledge graph intelligence, AI tutoring, gamification, and enterprise features for 100,000+ concurrent users.',
      },
      {
        question: 'What standards does EduSphere support?',
        answer:
          'EduSphere supports SCORM 1.2, SCORM 2004, xAPI/Tin Can, LTI 1.3, and OpenBadges 3.0. It is GDPR and FERPA compliant.',
      },
      {
        question: 'Is EduSphere accessible?',
        answer:
          'Yes. EduSphere is WCAG 2.2 AA certified with full keyboard navigation, screen reader support, and RTL language support.',
      },
      {
        question: 'What is the Chavruta AI tutor?',
        answer:
          "Chavruta is EduSphere's AI tutor using Socratic dialogue inspired by traditional Jewish study partnerships. It adapts to your level and builds your personal knowledge graph.",
      },
      {
        question: 'What pricing plans are available?',
        answer:
          'EduSphere offers Free ($0), Pro ($29/month), and Enterprise (custom) plans. The free plan includes 100 courses and 10 AI tutor messages per day.',
      },
    ];
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
