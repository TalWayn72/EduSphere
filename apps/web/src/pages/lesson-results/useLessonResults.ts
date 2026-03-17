import type { PipelineResult } from './types';
import { getResult, getString, getArray } from './types';

/** Extracts all module outputs from pipeline results into a flat object. */
export function extractResults(results: PipelineResult[], assets: { sourceUrl?: string | null; fileUrl?: string | null }[]) {
  const ingestion  = getResult(results, 'INGESTION');
  const asr        = getResult(results, 'ASR');
  const nerLinking = getResult(results, 'NER_SOURCE_LINKING');
  const cleaning   = getResult(results, 'CONTENT_CLEANING');
  const summarize  = getResult(results, 'SUMMARIZATION');
  const structured = getResult(results, 'STRUCTURED_NOTES');
  const diagram    = getResult(results, 'DIAGRAM_GENERATOR');
  const citations  = getResult(results, 'CITATION_VERIFIER');
  const qa         = getResult(results, 'QA_GATE');
  const publish    = getResult(results, 'PUBLISH_SHARE');

  // Transcript (ASR)
  const transcript = getString(asr?.outputData, 'transcript') ??
                     getString(asr?.outputData, 'text') ??
                     getString(asr?.outputData, 'transcription');
  const asrLanguage = getString(asr?.outputData, 'language');
  const asrDuration = asr?.outputData?.['duration'];

  // Ingestion
  const ingestedUrl = getString(ingestion?.outputData, 'sourceUrl') ??
                      getString(ingestion?.outputData, 'fileUrl') ??
                      assets?.[0]?.sourceUrl ??
                      assets?.[0]?.fileUrl;

  // NER / Source linking
  const entities = getArray<{ text: string; type: string }>(nerLinking?.outputData, 'entities');
  const linkedSources = getArray<{ title: string; url?: string }>(nerLinking?.outputData, 'linkedSources');

  // Content cleaning
  const cleanedText = getString(cleaning?.outputData, 'cleanedText');

  // Summarization
  const shortSummary = getString(summarize?.outputData, 'shortSummary');
  const keyPoints = getArray<string>(summarize?.outputData, 'keyPoints');

  // Structured notes
  const notesMarkdown = getString(structured?.outputData, 'outputMarkdown');

  // Diagram
  const mermaidSrc = getString(diagram?.outputData, 'mermaidSrc');

  // Citation verifier
  const verifiedCount = (citations?.outputData?.['verifiedCitations'] as unknown[] | undefined)?.length ?? 0;
  const failedCount   = (citations?.outputData?.['failedCitations'] as unknown[] | undefined)?.length ?? 0;
  const matchReport   = getString(citations?.outputData, 'matchReport');

  // QA Gate
  const qaScore = qa?.outputData?.['overallScore'] ?? qa?.outputData?.['qaScore'];
  const fixList = getArray<{ description: string; severity: string }>(qa?.outputData, 'fixList');

  // Publish
  const publishedUrl = getString(publish?.outputData, 'publishedUrl');
  const publishReady = publish?.outputData?.['publishReady'];

  return {
    ingestion, asr, nerLinking, cleaning, summarize, structured, diagram, citations, qa, publish,
    transcript, asrLanguage, asrDuration, ingestedUrl,
    entities, linkedSources, cleanedText,
    shortSummary, keyPoints, notesMarkdown, mermaidSrc,
    verifiedCount, failedCount, matchReport,
    qaScore, fixList, publishedUrl, publishReady,
  };
}
