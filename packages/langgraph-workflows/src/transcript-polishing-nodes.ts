/**
 * Transcript Polishing Workflow — Node Implementations
 *
 * Each LangGraph node is a pure async function receiving PolishingAnnotationType
 * and returning Partial<PolishingAnnotationType>.
 */

import type { LanguageModel } from 'ai';
import {
  buildVoiceExtractionPrompt,
  buildPolishingPrompt,
  buildStitchingPrompt,
  buildCoverageRepairPrompt,
} from './polishing-prompts';
import type { PolishedChunkResult, FormattedBlock, ChangeRecord, BlockType } from './transcript-polishing-types';
import {
  PolishingAnnotationType,
  CHUNK_GAP_THRESHOLD_MS,
  CHUNK_MAX_DURATION_MS,
  OVERLAP_SENTENCES,
  COVERAGE_THRESHOLD,
  lastNSentences,
  jaccardSimilarity,
  safeParse,
  callLLM,
} from './transcript-polishing-state';
import type { PolishingChunk } from './transcript-polishing-types';

// ---------------------------------------------------------------------------
// Node factory — closes over model so nodes stay pure functions
// ---------------------------------------------------------------------------

export function buildNodes(model: LanguageModel) {
  async function prepare(
    state: PolishingAnnotationType
  ): Promise<Partial<PolishingAnnotationType>> {
    if (!state.rawSegments || state.rawSegments.length === 0) {
      return { status: 'ERROR', error: 'No raw segments provided', progress: 0 };
    }
    return { status: 'PROCESSING', progress: 5 };
  }

  async function chunk(
    state: PolishingAnnotationType
  ): Promise<Partial<PolishingAnnotationType>> {
    const segments = [...state.rawSegments].sort((a, b) => a.startTime - b.startTime);
    const chunks: PolishingChunk[] = [];
    let current: typeof segments = [];
    let chunkStart = segments[0]?.startTime ?? 0;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!;
      const next = segments[i + 1];
      current.push(seg);

      const duration = seg.endTime - chunkStart;
      const gap = next ? next.startTime - seg.endTime : Infinity;
      const isNaturalPause = gap >= CHUNK_GAP_THRESHOLD_MS;
      const isMaxDuration = duration >= CHUNK_MAX_DURATION_MS;

      if ((isNaturalPause || isMaxDuration) && current.length > 0) {
        const rawText = current.map((s) => s.text).join(' ');
        const prevChunk = chunks[chunks.length - 1];
        const overlapPrefix = prevChunk ? lastNSentences(prevChunk.rawText, OVERLAP_SENTENCES) : '';

        chunks.push({
          chunkIndex: chunks.length,
          segmentIds: current.map((s) => s.id),
          rawText,
          overlapPrefix,
          startTime: chunkStart,
          endTime: seg.endTime,
        });
        current = [];
        chunkStart = next?.startTime ?? seg.endTime;
      }
    }

    if (current.length > 0) {
      const rawText = current.map((s) => s.text).join(' ');
      const prevChunk = chunks[chunks.length - 1];
      const lastSeg = current[current.length - 1]!;
      chunks.push({
        chunkIndex: chunks.length,
        segmentIds: current.map((s) => s.id),
        rawText,
        overlapPrefix: prevChunk ? lastNSentences(prevChunk.rawText, OVERLAP_SENTENCES) : '',
        startTime: chunkStart,
        endTime: lastSeg.endTime,
      });
    }

    return { chunks, progress: 15 };
  }

  async function loadVoice(
    state: PolishingAnnotationType
  ): Promise<Partial<PolishingAnnotationType>> {
    const firstChunk = state.chunks[0];
    if (!firstChunk) return { voiceProfile: '{}', progress: 20 };

    const freshRaw = await callLLM(model, buildVoiceExtractionPrompt(firstChunk.rawText.slice(0, 4000)));
    const freshProfile = safeParse<Record<string, unknown>>(freshRaw, {});

    let merged: Record<string, unknown>;
    if (state.existingVoiceProfile) {
      const existing = safeParse<Record<string, unknown>>(state.existingVoiceProfile, {});
      merged = { ...freshProfile, ...existing }; // existing wins (70% weight simulation)
    } else {
      merged = freshProfile;
    }

    const polishRaw = await callLLM(
      model,
      buildPolishingPrompt({
        chunkText: firstChunk.rawText,
        voiceProfile: JSON.stringify(merged),
        jargonGlossary: state.jargonGlossary,
        overlapContext: firstChunk.overlapPrefix,
        chunkIndex: 0,
        totalChunks: state.chunks.length,
      })
    );
    const parsed = safeParse<{ polishedText?: string; changes?: ChangeRecord[] }>(polishRaw, {});

    const chunk0Result: PolishedChunkResult = {
      chunkIndex: 0,
      polishedText: parsed.polishedText ?? firstChunk.rawText,
      changes: parsed.changes ?? [],
    };

    return { voiceProfile: JSON.stringify(merged), polishedChunks: [chunk0Result], progress: 30 };
  }

  async function polishChunks(
    state: PolishingAnnotationType
  ): Promise<Partial<PolishingAnnotationType>> {
    const remaining = state.chunks.slice(1);
    if (remaining.length === 0) return { progress: 60 };

    const results = await Promise.allSettled(
      remaining.map((c) =>
        callLLM(
          model,
          buildPolishingPrompt({
            chunkText: c.rawText,
            voiceProfile: state.voiceProfile,
            jargonGlossary: state.jargonGlossary,
            overlapContext: c.overlapPrefix,
            chunkIndex: c.chunkIndex,
            totalChunks: state.chunks.length,
          })
        ).then((raw) => {
          const p = safeParse<{ polishedText?: string; changes?: ChangeRecord[] }>(raw, {});
          return {
            chunkIndex: c.chunkIndex,
            polishedText: p.polishedText ?? c.rawText,
            changes: p.changes ?? [],
          } satisfies PolishedChunkResult;
        })
      )
    );

    const newChunks: PolishedChunkResult[] = results.map((r, i) => {
      const fallback = remaining[i]!;
      return r.status === 'fulfilled'
        ? r.value
        : ({ chunkIndex: fallback.chunkIndex, polishedText: fallback.rawText, changes: [] } satisfies PolishedChunkResult);
    });

    return { polishedChunks: newChunks, progress: 60 };
  }

  async function stitch(
    state: PolishingAnnotationType
  ): Promise<Partial<PolishingAnnotationType>> {
    const sorted = [...state.polishedChunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
    if (sorted.length === 0) return { stitchedText: '', progress: 65 };

    let combined = sorted[0]!.polishedText;
    for (let i = 1; i < sorted.length; i++) {
      const prevChunkSorted = sorted[i - 1]!;
      const currChunkSorted = sorted[i]!;
      const prevEnd = lastNSentences(prevChunkSorted.polishedText, 2);
      const nextStart = currChunkSorted.polishedText.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
      const transitionRaw = await callLLM(model, buildStitchingPrompt(prevEnd, nextStart));
      const transition = safeParse<{ stitchedTransition?: string }>(transitionRaw, {});
      const overlapChars = (state.chunks[i - 1]?.overlapPrefix.length ?? 0);
      combined +=
        '\n\n' +
        (transition.stitchedTransition ?? '') +
        '\n\n' +
        currChunkSorted.polishedText.slice(overlapChars > 0 ? overlapChars : 0);
    }

    return { stitchedText: combined.trim(), progress: 70 };
  }

  async function verifyCoverage(
    state: PolishingAnnotationType
  ): Promise<Partial<PolishingAnnotationType>> {
    const { rawSegments, stitchedText } = state;
    if (!stitchedText || rawSegments.length === 0) {
      return { coverageScore: 0, coverageGaps: [], progress: 75 };
    }
    const gaps: string[] = [];
    let matched = 0;
    for (const seg of rawSegments) {
      if (jaccardSimilarity(seg.text, stitchedText) >= COVERAGE_THRESHOLD) {
        matched++;
      } else {
        gaps.push(seg.id);
      }
    }
    return { coverageScore: matched / rawSegments.length, coverageGaps: gaps, progress: 75 };
  }

  async function repairGaps(
    state: PolishingAnnotationType
  ): Promise<Partial<PolishingAnnotationType>> {
    const gapTexts = state.rawSegments
      .filter((s) => state.coverageGaps.includes(s.id))
      .map((s) => s.text);

    if (gapTexts.length === 0) return { repairAttempts: state.repairAttempts + 1, progress: 78 };

    const contextSegs = state.rawSegments
      .filter((s) => !state.coverageGaps.includes(s.id))
      .slice(0, 5)
      .map((s) => s.text)
      .join(' ');

    const repairRaw = await callLLM(model, buildCoverageRepairPrompt(gapTexts, contextSegs, state.voiceProfile));
    const parsed = safeParse<{ repairedText?: string }>(repairRaw, {});

    return {
      stitchedText: state.stitchedText + '\n\n' + (parsed.repairedText ?? gapTexts.join('\n')),
      repairAttempts: state.repairAttempts + 1,
      progress: 78,
    };
  }

  async function generateDiffs(
    _state: PolishingAnnotationType
  ): Promise<Partial<PolishingAnnotationType>> {
    return { progress: 85 };
  }

  async function formatOutput(
    state: PolishingAnnotationType
  ): Promise<Partial<PolishingAnnotationType>> {
    const text = state.stitchedText;
    if (!text) return { formattedBlocks: [], progress: 95 };

    const paragraphs = text.split(/\n{2,}/);
    const blocks: FormattedBlock[] = [];
    let blockOrder = 0;

    for (const para of paragraphs) {
      if (!para.trim()) continue;

      let blockType: BlockType = 'POLISHED_TEXT';
      if (para.startsWith('    ') || /^[א-ת"]{2,}\s+[א-ת]/.test(para.trim())) {
        blockType = 'POLISHED_CITATION';
      }
      if (para.trim().length < 60 && !/[.,:;]$/.test(para.trim())) {
        blockType = 'POLISHED_HEADING';
      }

      const sourceIds = state.rawSegments
        .filter((s) => jaccardSimilarity(s.text, para) > 0.05)
        .map((s) => s.id);
      const sourceTimes = state.rawSegments.filter((s) => sourceIds.includes(s.id));
      const changes: ChangeRecord[] = state.polishedChunks.flatMap((c) =>
        c.changes.filter((ch) => para.includes(ch.replacement ?? ch.original))
      );

      blocks.push({
        blockOrder: blockOrder++,
        blockType,
        content: para.trim(),
        originalText: para.trim(),
        startTime: sourceTimes[0]?.startTime ?? 0,
        endTime: sourceTimes[sourceTimes.length - 1]?.endTime ?? 0,
        sourceSegmentIds: sourceIds,
        changes,
      });
    }

    return { formattedBlocks: blocks, progress: 95 };
  }

  async function autoPublish(
    state: PolishingAnnotationType
  ): Promise<Partial<PolishingAnnotationType>> {
    return { status: state.coverageScore >= 0.95 ? 'DRAFT' : 'PROCESSING', progress: 100 };
  }

  return { prepare, chunk, loadVoice, polishChunks, stitch, verifyCoverage, repairGaps, generateDiffs, formatOutput, autoPublish };
}
