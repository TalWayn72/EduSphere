/**
 * LiveTranscriptionModule
 *
 * NestJS module that wires together all providers for the live transcription
 * engine:
 *   - VocabLoader          — caches lesson jargon terms + Whisper initialPrompt
 *   - StreamingWhisperClient — buffers audio chunks and calls WhisperClient
 *   - LiveJargonMatcher    — string-matches terms on final segments
 *   - SegmentPublisher     — persists to DB + publishes NATS events
 *   - LiveTranscriptionConsumer — subscribes to NATS stream.* subjects
 *
 * Dependencies resolved from other modules:
 *   - WhisperClient (TranscriptionModule — re-exported)
 *   - NatsService   (NatsModule — @Global, available everywhere)
 */
import { Module } from '@nestjs/common';
import { WhisperClient } from '../transcription/whisper.client';
import { VocabLoader } from './vocab-loader';
import { StreamingWhisperClient } from './streaming-whisper.client';
import { LiveJargonMatcher } from './live-jargon-matcher';
import { SegmentPublisher } from './segment-publisher';
import { LiveTranscriptionConsumer } from './live-transcription.consumer';

@Module({
  providers: [
    // Re-provide WhisperClient locally (TranscriptionModule does not export it)
    WhisperClient,
    VocabLoader,
    StreamingWhisperClient,
    LiveJargonMatcher,
    SegmentPublisher,
    LiveTranscriptionConsumer,
  ],
  exports: [
    // Exported so AppModule (or tests) can reference individual services
    VocabLoader,
    StreamingWhisperClient,
    LiveJargonMatcher,
    SegmentPublisher,
  ],
})
export class LiveTranscriptionModule {}
