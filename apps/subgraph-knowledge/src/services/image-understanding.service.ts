import { Injectable, Logger } from '@nestjs/common';

/**
 * ImageUnderstandingService — AI caption generation and handwriting detection
 * via Moondream 2 model running on Ollama (already installed).
 *
 * OLLAMA_URL env var points to the running Ollama instance.
 */

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

@Injectable()
export class ImageUnderstandingService {
  private readonly logger = new Logger(ImageUnderstandingService.name);
  private readonly ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434';

  /**
   * Generate a natural language description of an image.
   * Used for accessibility alt-text and semantic search indexing.
   */
  async generateCaption(imageBase64: string): Promise<string> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'moondream',
          prompt: 'Describe this image in 1-2 sentences for accessibility purposes.',
          images: [imageBase64],
          stream: false,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        this.logger.warn(`Moondream caption failed: HTTP ${response.status}`);
        return '';
      }

      const data = (await response.json()) as OllamaGenerateResponse;
      return data.response?.trim() ?? '';
    } catch (err) {
      this.logger.warn(`Moondream caption error: ${String(err)}`);
      return '';
    }
  }

  /**
   * Detect whether an image contains handwritten text.
   * Returns true → route to TrOCR (Tier 3) for recognition.
   */
  async detectHandwriting(imageBase64: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'moondream',
          prompt: 'Does this image contain handwritten text? Answer with only "yes" or "no".',
          images: [imageBase64],
          stream: false,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) return false;

      const data = (await response.json()) as OllamaGenerateResponse;
      return data.response?.toLowerCase().includes('yes') ?? false;
    } catch {
      return false;
    }
  }
}
