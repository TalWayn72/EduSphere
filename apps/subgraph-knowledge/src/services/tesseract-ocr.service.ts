import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createScheduler, createWorker } from 'tesseract.js';
import type Tesseract from 'tesseract.js';

@Injectable()
export class TesseractOcrService implements OnModuleDestroy {
  private readonly logger = new Logger(TesseractOcrService.name);
  private readonly scheduler: Tesseract.Scheduler = createScheduler();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    for (let i = 0; i < 2; i++) {
      const worker = await createWorker('eng');
      this.scheduler.addWorker(worker);
    }
    this.initialized = true;
    this.logger.log('TesseractOcrService initialized with 2 workers');
  }

  async extractText(imageBuffer: Buffer): Promise<{ text: string; confidence: number }> {
    if (!this.initialized) await this.initialize();
    const { data } = await this.scheduler.addJob('recognize', imageBuffer);
    return { text: data.text.trim(), confidence: data.confidence / 100 };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.initialized) {
      await this.scheduler.terminate();
      this.logger.log('Tesseract scheduler terminated');
    }
  }
}
