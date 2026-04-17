/**
 * Unit tests for polishing prompt builders
 *
 * Pure function tests — no mocks needed.
 */

import { describe, it, expect } from 'vitest';
import {
  buildVoiceExtractionPrompt,
  buildPolishingPrompt,
  buildStitchingPrompt,
  buildCoverageRepairPrompt,
} from './polishing-prompts';
import { ChangeType } from './transcript-polishing-types';
import type { JargonEntry } from './transcript-polishing-types';

const GLOSSARY: JargonEntry[] = [
  { canonical: 'האר"י', altForms: ['הארי', 'הרב לוריא'] },
  { canonical: 'מהרח"ו', altForms: ['מהרחו'] },
];

// ---------------------------------------------------------------------------
// buildVoiceExtractionPrompt
// ---------------------------------------------------------------------------

describe('buildVoiceExtractionPrompt', () => {
  it('includes the chunk text in the prompt', () => {
    const prompt = buildVoiceExtractionPrompt('שלום לכולם');
    expect(prompt).toContain('שלום לכולם');
  });

  it('requests JSON output with all required keys', () => {
    const prompt = buildVoiceExtractionPrompt('test');
    expect(prompt).toContain('avgSentenceLength');
    expect(prompt).toContain('formality');
    expect(prompt).toContain('transitionPhrases');
    expect(prompt).toContain('rhythmMarkers');
  });

  it('instructs returning JSON only', () => {
    const prompt = buildVoiceExtractionPrompt('x');
    expect(prompt).toContain('JSON');
  });
});

// ---------------------------------------------------------------------------
// buildPolishingPrompt
// ---------------------------------------------------------------------------

describe('buildPolishingPrompt', () => {
  it('includes all 6 rules', () => {
    const prompt = buildPolishingPrompt({
      chunkText: 'test',
      voiceProfile: '{}',
      jargonGlossary: GLOSSARY,
      overlapContext: '',
      chunkIndex: 0,
      totalChunks: 3,
    });
    expect(prompt).toContain('COMPLETENESS');
    expect(prompt).toContain('STYLE');
    expect(prompt).toContain('CLEANUP');
    expect(prompt).toContain('SPEECH→WRITING');
    expect(prompt).toContain('CITATIONS');
    expect(prompt).toContain('TERMINOLOGY');
  });

  it('includes glossary canonical forms', () => {
    const prompt = buildPolishingPrompt({
      chunkText: 'test',
      voiceProfile: '{}',
      jargonGlossary: GLOSSARY,
      overlapContext: '',
      chunkIndex: 0,
      totalChunks: 1,
    });
    expect(prompt).toContain('האר"י');
    expect(prompt).toContain('מהרח"ו');
  });

  it('shows chunk position correctly', () => {
    const prompt = buildPolishingPrompt({
      chunkText: 'x',
      voiceProfile: '{}',
      jargonGlossary: [],
      overlapContext: '',
      chunkIndex: 0,
      totalChunks: 3,
    });
    expect(prompt).toContain('קטע 1 מתוך 3');
  });

  it('includes overlap context when provided', () => {
    const prompt = buildPolishingPrompt({
      chunkText: 'main text',
      voiceProfile: '{}',
      jargonGlossary: [],
      overlapContext: 'previous ending sentence',
      chunkIndex: 1,
      totalChunks: 2,
    });
    expect(prompt).toContain('previous ending sentence');
  });

  it('includes all 9 ChangeType values in output format', () => {
    const prompt = buildPolishingPrompt({
      chunkText: 'x',
      voiceProfile: '{}',
      jargonGlossary: [],
      overlapContext: '',
      chunkIndex: 0,
      totalChunks: 1,
    });
    Object.values(ChangeType).forEach((ct) => {
      expect(prompt).toContain(ct);
    });
  });

  it('falls back to no-glossary message when glossary is empty', () => {
    const prompt = buildPolishingPrompt({
      chunkText: 'x',
      voiceProfile: '{}',
      jargonGlossary: [],
      overlapContext: '',
      chunkIndex: 0,
      totalChunks: 1,
    });
    expect(prompt).toContain('אין מונחים מיוחדים');
  });
});

// ---------------------------------------------------------------------------
// buildStitchingPrompt
// ---------------------------------------------------------------------------

describe('buildStitchingPrompt', () => {
  it('contains both chunk ends', () => {
    const prompt = buildStitchingPrompt('prev end', 'next start');
    expect(prompt).toContain('prev end');
    expect(prompt).toContain('next start');
  });

  it('returns JSON with stitchedTransition key', () => {
    const prompt = buildStitchingPrompt('a', 'b');
    expect(prompt).toContain('stitchedTransition');
  });
});

// ---------------------------------------------------------------------------
// buildCoverageRepairPrompt
// ---------------------------------------------------------------------------

describe('buildCoverageRepairPrompt', () => {
  it('lists all missed segments with numbering', () => {
    const prompt = buildCoverageRepairPrompt(
      ['segment A', 'segment B'],
      'surrounding context',
      '{}'
    );
    expect(prompt).toContain('[1]');
    expect(prompt).toContain('[2]');
    expect(prompt).toContain('segment A');
    expect(prompt).toContain('segment B');
  });

  it('includes surrounding context', () => {
    const prompt = buildCoverageRepairPrompt(['x'], 'my context', '{}');
    expect(prompt).toContain('my context');
  });
});

// ---------------------------------------------------------------------------
// ChangeType enum
// ---------------------------------------------------------------------------

describe('ChangeType enum', () => {
  it('has exactly 9 values', () => {
    expect(Object.keys(ChangeType)).toHaveLength(9);
  });

  it('contains all expected string values', () => {
    expect(ChangeType.FILLER_REMOVED).toBe('FILLER_REMOVED');
    expect(ChangeType.STUTTER_REMOVED).toBe('STUTTER_REMOVED');
    expect(ChangeType.AUDIENCE_ADDRESS_REMOVED).toBe('AUDIENCE_ADDRESS_REMOVED');
    expect(ChangeType.TECHNICAL_INSTRUCTION_REMOVED).toBe('TECHNICAL_INSTRUCTION_REMOVED');
    expect(ChangeType.IMPERATIVE_TO_DESCRIPTION).toBe('IMPERATIVE_TO_DESCRIPTION');
    expect(ChangeType.RHETORICAL_Q_ANSWERED).toBe('RHETORICAL_Q_ANSWERED');
    expect(ChangeType.PRONOUN_PLURALIZED).toBe('PRONOUN_PLURALIZED');
    expect(ChangeType.CITATION_FORMATTED).toBe('CITATION_FORMATTED');
    expect(ChangeType.TERMINOLOGY_NORMALIZED).toBe('TERMINOLOGY_NORMALIZED');
  });
});
