/**
 * Transcript Polishing Workflow
 *
 * LangGraph state machine for Smart Transcript Polishing.
 * Flow: prepare → chunk → loadVoice → polishChunks → stitch →
 *       verifyCoverage ⇄ repairGaps → generateDiffs → formatOutput → autoPublish
 */

import { StateGraph, END, START } from '@langchain/langgraph';
import type { LanguageModel } from 'ai';
import { PolishingAnnotation, PolishingAnnotationType, MAX_REPAIR_ATTEMPTS } from './transcript-polishing-state';
import { buildNodes } from './transcript-polishing-nodes';

// ---------------------------------------------------------------------------
// Conditional routing
// ---------------------------------------------------------------------------

function afterPrepare(state: PolishingAnnotationType): 'chunk' | 'errorExit' {
  return state.status === 'ERROR' ? 'errorExit' : 'chunk';
}

function shouldRepair(state: PolishingAnnotationType): 'repairGaps' | 'generateDiffs' {
  if (state.coverageGaps.length > 0 && state.repairAttempts < MAX_REPAIR_ATTEMPTS) {
    return 'repairGaps';
  }
  return 'generateDiffs';
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface TranscriptPolishingConfig {
  model: LanguageModel;
}

/**
 * Creates and compiles the TranscriptPolishing StateGraph.
 *
 * @example
 * ```ts
 * import { createTranscriptPolishingWorkflow } from './transcript-polishing-workflow';
 * import { openai } from '@ai-sdk/openai';
 *
 * const workflow = createTranscriptPolishingWorkflow({ model: openai('gpt-4o') });
 * const result = await workflow.invoke({ lessonId: '...', rawSegments: [...], ... });
 * ```
 */
export function createTranscriptPolishingWorkflow(config: TranscriptPolishingConfig) {
  const nodes = buildNodes(config.model);

  const graph = new StateGraph(PolishingAnnotation)
    .addNode('prepare', nodes.prepare)
    .addNode('errorExit', async (_state: PolishingAnnotationType) => ({ progress: 100 }))
    .addNode('chunk', nodes.chunk)
    .addNode('loadVoice', nodes.loadVoice)
    .addNode('polishChunks', nodes.polishChunks)
    .addNode('stitch', nodes.stitch)
    .addNode('verifyCoverage', nodes.verifyCoverage)
    .addNode('repairGaps', nodes.repairGaps)
    .addNode('generateDiffs', nodes.generateDiffs)
    .addNode('formatOutput', nodes.formatOutput)
    .addNode('autoPublish', nodes.autoPublish);

  graph.addEdge(START, 'prepare');
  graph.addConditionalEdges('prepare', afterPrepare, {
    chunk: 'chunk',
    errorExit: 'errorExit',
  });
  graph.addEdge('errorExit', END);
  graph.addEdge('chunk', 'loadVoice');
  graph.addEdge('loadVoice', 'polishChunks');
  graph.addEdge('polishChunks', 'stitch');
  graph.addEdge('stitch', 'verifyCoverage');
  graph.addConditionalEdges('verifyCoverage', shouldRepair, {
    repairGaps: 'repairGaps',
    generateDiffs: 'generateDiffs',
  });
  graph.addEdge('repairGaps', 'stitch');
  graph.addEdge('generateDiffs', 'formatOutput');
  graph.addEdge('formatOutput', 'autoPublish');
  graph.addEdge('autoPublish', END);

  return graph.compile();
}

export type { PolishingAnnotationType as TranscriptPolishingState };
