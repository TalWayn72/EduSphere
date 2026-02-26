import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { createReadStream } from 'fs';
import OpenAI from 'openai';
import type { WhisperResponse, WhisperSegment } from './transcription.types';

/**
 * Thin client that wraps both OpenAI Whisper and a local faster-whisper HTTP server.
 *
 * Selection logic (env-driven):
 *   WHISPER_URL set  → local faster-whisper REST endpoint
 *   OPENAI_API_KEY   → OpenAI cloud Whisper
 *   neither          → throws at startup
 */
@Injectable()
export class WhisperClient {
  private readonly logger = new Logger(WhisperClient.name);
  private readonly useLocal: boolean;
  private readonly whisperUrl: string;
  private readonly openai: OpenAI | null = null;

  constructor() {
    this.whisperUrl = process.env.WHISPER_URL ?? '';
    this.useLocal = Boolean(this.whisperUrl);

    if (!this.useLocal) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'Neither WHISPER_URL nor OPENAI_API_KEY is set — cannot initialise WhisperClient'
        );
      }
      this.openai = new OpenAI({ apiKey });
    }

    this.logger.log(
      this.useLocal
        ? `WhisperClient: local faster-whisper at ${this.whisperUrl}`
        : 'WhisperClient: OpenAI cloud Whisper'
    );
  }

  async transcribe(
    filePath: string,
    language = 'en'
  ): Promise<WhisperResponse> {
    if (this.useLocal) {
      return this.transcribeLocal(filePath, language);
    }
    return this.transcribeOpenAI(filePath, language);
  }

  // ─── OpenAI Whisper ────────────────────────────────────────────────────────

  private async transcribeOpenAI(
    filePath: string,
    language: string
  ): Promise<WhisperResponse> {
    if (!this.openai) {
      throw new InternalServerErrorException('OpenAI client not initialised');
    }
    try {
      this.logger.debug(`Sending ${filePath} to OpenAI Whisper`);
      const response = await this.openai.audio.transcriptions.create({
        file: createReadStream(filePath),
        model: 'whisper-1',
        language,
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      });

      const segments: WhisperSegment[] = (response.segments ?? []).map(
        (s, idx) => ({
          id: idx,
          start: s.start,
          end: s.end,
          text: s.text.trim(),
        })
      );

      return {
        text: response.text,
        language: response.language ?? language,
        segments,
      };
    } catch (err) {
      this.logger.error('OpenAI Whisper transcription failed', err);
      throw new InternalServerErrorException('Whisper transcription failed');
    }
  }

  // ─── Local faster-whisper ──────────────────────────────────────────────────

  private async transcribeLocal(
    filePath: string,
    language: string
  ): Promise<WhisperResponse> {
    try {
      this.logger.debug(
        `Sending ${filePath} to local Whisper at ${this.whisperUrl}`
      );

      const formData = new FormData();
      const blob = new Blob([createReadStream(filePath) as any]);
      formData.append('audio_file', blob, 'audio');
      formData.append('language', language);
      formData.append('output', 'json');

      const res = await fetch(`${this.whisperUrl}/asr`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`faster-whisper returned HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        text: string;
        language?: string;
        segments?: Array<{ start: number; end: number; text: string }>;
      };

      const segments: WhisperSegment[] = (data.segments ?? []).map(
        (s, idx) => ({
          id: idx,
          start: s.start,
          end: s.end,
          text: s.text.trim(),
        })
      );

      return { text: data.text, language: data.language ?? language, segments };
    } catch (err) {
      this.logger.error('Local Whisper transcription failed', err);
      throw new InternalServerErrorException(
        'Local Whisper transcription failed'
      );
    }
  }
}
