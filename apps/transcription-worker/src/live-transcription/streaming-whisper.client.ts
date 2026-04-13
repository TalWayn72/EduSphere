/**
 * StreamingWhisperClient
 *
 * Receives raw audio buffers from the live consumer, accumulates them into
 * 5-10 s windows, then calls WhisperClient.transcribe() to produce text.
 *
 * Behaviour:
 *  - Every 2 s of incoming audio a *partial* (isFinal=false) segment is emitted
 *    via the onSegment callback so the UI shows rolling captions.
 *  - After WINDOW_FLUSH_MS (8 s) the window is flushed, producing a *final*
 *    (isFinal=true) segment.  The buffer is then reset for the next window.
 *  - The lesson jargon vocab is passed as `initialPrompt` to bias Whisper
 *    towards domain-specific terminology.
 *  - finalize() flushes any remaining audio when stream.ended is received.
 */
import { Injectable, Logger } from '@nestjs/common';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { WhisperClient } from '../transcription/whisper.client';
import type { LiveSegment } from './live-transcription.types';

const PARTIAL_INTERVAL_MS = 2_000; // emit partial every 2 s
const WINDOW_FLUSH_MS = 8_000; // flush window every 8 s

export type SegmentCallback = (segment: LiveSegment) => Promise<void>;

interface SessionState {
  buffer: Buffer[];
  segmentIndex: number;
  windowStartMs: number;
  lastPartialMs: number;
  partialTimer: ReturnType<typeof setInterval> | null;
  streamStartedAt: number;
}

@Injectable()
export class StreamingWhisperClient {
  private readonly logger = new Logger(StreamingWhisperClient.name);
  private readonly sessions = new Map<string, SessionState>();

  constructor(private readonly whisper: WhisperClient) {}

  /**
   * Initialises state for a new live session.
   */
  startSession(sessionId: string): void {
    const now = Date.now();
    this.sessions.set(sessionId, {
      buffer: [],
      segmentIndex: 0,
      windowStartMs: now,
      lastPartialMs: now,
      partialTimer: null,
      streamStartedAt: now,
    });
    this.logger.log({ sessionId }, 'StreamingWhisperClient: session started');
  }

  /**
   * Appends an audio chunk (base64-decoded bytes) to the session buffer.
   * If the window threshold is reached, flushes and emits a final segment.
   * Emits partial segments on the 2 s cadence.
   */
  async pushChunk(
    sessionId: string,
    tenantId: string,
    audioBytes: Buffer,
    onSegment: SegmentCallback,
    vocabPrompt: string,
    language: string
  ): Promise<void> {
    const state = this.sessions.get(sessionId);
    if (!state) {
      this.logger.warn(
        { sessionId },
        'pushChunk called for unknown session — ignored'
      );
      return;
    }

    state.buffer.push(audioBytes);
    const now = Date.now();
    const windowAge = now - state.windowStartMs;

    // Flush window if >= WINDOW_FLUSH_MS
    if (windowAge >= WINDOW_FLUSH_MS) {
      await this.flushWindow(
        sessionId,
        tenantId,
        state,
        true,
        onSegment,
        vocabPrompt,
        language
      );
      return;
    }

    // Emit partial on 2 s cadence
    if (now - state.lastPartialMs >= PARTIAL_INTERVAL_MS) {
      state.lastPartialMs = now;
      await this.flushWindow(
        sessionId,
        tenantId,
        state,
        false,
        onSegment,
        vocabPrompt,
        language
      );
    }
  }

  /**
   * Flushes remaining audio at stream end, emitting a final segment.
   */
  async finalize(
    sessionId: string,
    tenantId: string,
    onSegment: SegmentCallback,
    vocabPrompt: string,
    language: string
  ): Promise<void> {
    const state = this.sessions.get(sessionId);
    if (!state || state.buffer.length === 0) {
      this.sessions.delete(sessionId);
      return;
    }

    await this.flushWindow(
      sessionId,
      tenantId,
      state,
      true,
      onSegment,
      vocabPrompt,
      language
    );
    this.sessions.delete(sessionId);
    this.logger.log({ sessionId }, 'StreamingWhisperClient: session finalized');
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async flushWindow(
    sessionId: string,
    tenantId: string,
    state: SessionState,
    isFinal: boolean,
    onSegment: SegmentCallback,
    vocabPrompt: string,
    language: string
  ): Promise<void> {
    if (state.buffer.length === 0) return;

    const audioData = Buffer.concat(state.buffer);
    const tmpPath = join(tmpdir(), `live-${randomUUID()}.wav`);
    const startTime = (state.windowStartMs - state.streamStartedAt) / 1_000;

    try {
      writeFileSync(tmpPath, audioData);
      const result = await this.whisper.transcribe(
        tmpPath,
        language,
        vocabPrompt || undefined
      );

      const endTime = (Date.now() - state.streamStartedAt) / 1_000;

      const segment: LiveSegment = {
        sessionId,
        tenantId,
        segmentIndex: state.segmentIndex,
        text: result.text.trim(),
        startTime,
        endTime,
        isFinal,
      };

      await onSegment(segment);

      if (isFinal) {
        state.segmentIndex += 1;
        state.buffer = [];
        state.windowStartMs = Date.now();
      }
    } catch (err) {
      this.logger.error(
        { err, sessionId },
        'Failed to transcribe live audio window'
      );
    } finally {
      try {
        unlinkSync(tmpPath);
      } catch {
        // best-effort cleanup
      }
    }
  }
}
