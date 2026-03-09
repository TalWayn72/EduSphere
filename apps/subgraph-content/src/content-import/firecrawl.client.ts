import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import type { FirecrawlPage } from './content-import.types';

interface CrawlResponse {
  id?: string;
  status?: string;
  data?: Array<{ url?: string; markdown?: string; metadata?: { title?: string } }>;
}

@Injectable()
export class FirecrawlClient {
  private readonly logger = new Logger(FirecrawlClient.name);
  private readonly BASE = 'https://api.firecrawl.dev/v1';
  private readonly MAX_POLLS = 60;
  private readonly POLL_MS = 2000;

  async crawlSite(
    url: string,
    limit: number,
    apiKey: string
  ): Promise<FirecrawlPage[]> {
    const startRes = await fetch(`${this.BASE}/crawl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        limit,
        scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
      }),
    });

    if (!startRes.ok) {
      throw new BadRequestException(`Firecrawl start error: ${startRes.status}`);
    }

    const { id } = (await startRes.json()) as CrawlResponse;
    if (!id) throw new BadRequestException('Firecrawl returned no job id');

    for (let i = 0; i < this.MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, this.POLL_MS));
      const pollRes = await fetch(`${this.BASE}/crawl/${id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const poll = (await pollRes.json()) as CrawlResponse;

      if (poll.status === 'completed') {
        const pages: FirecrawlPage[] = (poll.data ?? [])
          .filter((p) => (p.markdown ?? '').length > 200)
          .map((p) => ({
            url: p.url ?? '',
            markdown: p.markdown ?? '',
            title: p.metadata?.title ?? '',
          }));
        this.logger.log(`Firecrawl job ${id} done — ${pages.length} pages`);
        return pages;
      }
    }

    throw new BadRequestException('Firecrawl job timed out');
  }
}
