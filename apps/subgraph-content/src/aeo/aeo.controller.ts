/**
 * AeoController — Answer Engine Optimization (AEO) HTTP endpoints.
 *
 * GET /aeo/sitemap.xml — Dynamic XML sitemap (public, cached 1h)
 * GET /aeo/courses     — Public course catalog JSON (cached 5m)
 * GET /aeo/features    — Platform features list JSON (cached 24h)
 * GET /aeo/faq         — FAQ items JSON (cached 1h)
 *
 * All endpoints are unauthenticated and publicly accessible.
 */
import { Controller, Get, Header, Logger, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AeoService } from './aeo.service';
import type { PublicCourse, FeatureItem, FaqItem, CatalogCourse, InstructorProfile } from './aeo.service';
import { OgImageService } from './og-image.service';

// Rate limiting is enforced at the gateway level (Hive Gateway / nginx).
@Controller('aeo')
export class AeoController {
  private readonly logger = new Logger(AeoController.name);

  constructor(
    private readonly aeoService: AeoService,
    private readonly ogImageService: OgImageService,
  ) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async getSitemap(@Res() res: Response): Promise<void> {
    this.logger.debug('[AeoController] sitemap.xml requested');
    const xml = await this.aeoService.generateSitemapXml();
    res.send(xml);
  }

  @Get('courses')
  @Header('Content-Type', 'application/json')
  @Header('Cache-Control', 'public, max-age=300')
  @Header('Access-Control-Allow-Origin', '*')
  async getCourses(): Promise<PublicCourse[]> {
    this.logger.debug('[AeoController] public course catalog requested');
    return this.aeoService.getPublicCourses();
  }

  @Get('features')
  @Header('Content-Type', 'application/json')
  @Header('Cache-Control', 'public, max-age=86400')
  @Header('Access-Control-Allow-Origin', '*')
  getFeatures(): FeatureItem[] {
    return this.aeoService.getFeatures();
  }

  @Get('faq')
  @Header('Content-Type', 'application/json')
  @Header('Cache-Control', 'public, max-age=3600')
  @Header('Access-Control-Allow-Origin', '*')
  getFaq(): FaqItem[] {
    return this.aeoService.getFaq();
  }

  @Get('catalog')
  @Header('Content-Type', 'application/json')
  @Header('Cache-Control', 'public, max-age=3600')
  @Header('Access-Control-Allow-Origin', '*')
  getCatalog(): CatalogCourse[] {
    this.logger.debug('[AeoController] public catalog requested');
    return this.aeoService.getCatalog();
  }

  @Get('instructors')
  @Header('Content-Type', 'application/json')
  @Header('Cache-Control', 'public, max-age=3600')
  @Header('Access-Control-Allow-Origin', '*')
  getInstructors(): InstructorProfile[] {
    this.logger.debug('[AeoController] instructor directory requested');
    return this.aeoService.getInstructors();
  }

  @Get('og')
  async getOgImage(
    @Query('title') rawTitle: string = 'EduSphere',
    @Query('description') rawDesc: string = '',
    @Query('type') rawType: string = 'default',
    @Res() res: Response,
  ): Promise<void> {
    const title = (rawTitle ?? 'EduSphere').slice(0, 80);
    const description = (rawDesc ?? '').slice(0, 160);
    const type: 'course' | 'blog' | 'default' = (
      ['course', 'blog', 'default'] as const
    ).includes(rawType as 'course' | 'blog' | 'default')
      ? (rawType as 'course' | 'blog' | 'default')
      : 'default';

    const maxAge = type === 'course' ? 3600 : 86400;
    this.logger.debug(
      `[AeoController] og image requested — title="${title}" type="${type}"`,
    );
    const buffer = await this.ogImageService.generateOgImage(
      title,
      description,
      type,
    );

    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 24}`,
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(buffer);
  }
}
