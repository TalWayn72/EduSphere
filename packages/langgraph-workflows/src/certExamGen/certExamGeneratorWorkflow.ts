/**
 * Certification Exam Generator Workflow — 7-node LangGraph StateGraph.
 *
 * Pipeline: retrieveContent → generateItems → validateBloom → detectIWF
 *           → enhanceDistractors → verifyAnswers → (retry or END)
 *
 * Conditional retry: if finalItems < 80% of targetCount and retryCount < 2,
 * loops back to generateItems.
 */
import { StateGraph, END, START } from '@langchain/langgraph';
import type { LanguageModel } from 'ai';
import { CertExamGenAnnotation, type CertExamGenState } from './state';
import type { CitationSearchFn } from './types';
import {
  retrieveContentNode,
  generateItemsNode,
  validateBloomNode,
  detectIWFNode,
  enhanceDistractorsNode,
  verifyAnswersNode,
} from './nodes';

const MAX_RETRIES = 2;
const MIN_YIELD_RATIO = 0.8;

function shouldRetry(state: CertExamGenState): 'retry' | 'done' {
  const minRequired = Math.ceil(state.targetCount * MIN_YIELD_RATIO);
  if (state.finalItems.length >= minRequired) return 'done';
  if (state.retryCount >= MAX_RETRIES) return 'done';
  return 'retry';
}

function incrementRetry(state: CertExamGenState): Partial<CertExamGenState> {
  return { retryCount: state.retryCount + 1 };
}

export function createCertExamGeneratorWorkflow(
  model: LanguageModel,
  searchFn?: CitationSearchFn
) {
  const graph = new StateGraph(CertExamGenAnnotation)
    .addNode('retrieveContent', retrieveContentNode(searchFn))
    .addNode('generateItems', generateItemsNode(model))
    .addNode('validateBloom', validateBloomNode(model))
    .addNode('detectIWF', detectIWFNode)
    .addNode('enhanceDistractors', enhanceDistractorsNode(model))
    .addNode('verifyAnswers', verifyAnswersNode(model))
    .addNode('incrementRetry', incrementRetry)
    .addEdge(START, 'retrieveContent')
    .addEdge('retrieveContent', 'generateItems')
    .addEdge('generateItems', 'validateBloom')
    .addEdge('validateBloom', 'detectIWF')
    .addEdge('detectIWF', 'enhanceDistractors')
    .addEdge('enhanceDistractors', 'verifyAnswers')
    .addConditionalEdges('verifyAnswers', shouldRetry, {
      retry: 'incrementRetry',
      done: END,
    })
    .addEdge('incrementRetry', 'generateItems');

  return graph.compile();
}
