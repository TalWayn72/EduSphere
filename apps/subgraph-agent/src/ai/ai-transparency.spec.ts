import { describe, it, expect } from 'vitest';
import {
  requiresHumanReview,
  formatTransparencyLabel,
  DEFAULT_AI_PREFERENCES,
  type AITransparencyMetadata,
  type AgentType,
} from './ai-transparency.js';

describe('requiresHumanReview()', () => {
  it('returns true when impactsGrade is true', () => {
    expect(
      requiresHumanReview({ agentType: 'TUTOR', impactsGrade: true })
    ).toBe(true);
  });

  it('returns true when isAssessment is true', () => {
    expect(
      requiresHumanReview({ agentType: 'SUMMARIZER', isAssessment: true })
    ).toBe(true);
  });

  it('returns false for TUTOR with no grade impact', () => {
    expect(
      requiresHumanReview({ agentType: 'TUTOR', impactsGrade: false, isAssessment: false })
    ).toBe(false);
  });

  it('returns false for CHAVRUTA with no flags', () => {
    expect(requiresHumanReview({ agentType: 'CHAVRUTA' })).toBe(false);
  });

  it('returns false for DEBATE with no flags', () => {
    expect(requiresHumanReview({ agentType: 'DEBATE' })).toBe(false);
  });

  it('returns true when both impactsGrade and isAssessment are true', () => {
    expect(
      requiresHumanReview({
        agentType: 'QUIZ_MASTER',
        impactsGrade: true,
        isAssessment: true,
      })
    ).toBe(true);
  });
});

describe('formatTransparencyLabel()', () => {
  it('includes model name extracted from slash-separated path', () => {
    const meta: AITransparencyMetadata = {
      isAIGenerated: true,
      modelUsed: 'ollama/llama3.2',
      humanReviewRequired: false,
    };
    const label = formatTransparencyLabel(meta);
    expect(label).toContain('llama3.2');
  });

  it('falls back to AI when no slash in modelUsed', () => {
    const meta: AITransparencyMetadata = {
      isAIGenerated: true,
      modelUsed: 'unknown-model',
      humanReviewRequired: false,
    };
    const label = formatTransparencyLabel(meta);
    expect(label).toContain('unknown-model');
  });

  it('includes disclaimer about verification', () => {
    const meta: AITransparencyMetadata = {
      isAIGenerated: true,
      modelUsed: 'openai/gpt-4o',
      humanReviewRequired: true,
    };
    const label = formatTransparencyLabel(meta);
    expect(label.toLowerCase()).toContain('verify');
  });

  it('uses part after last slash for nested paths', () => {
    const meta: AITransparencyMetadata = {
      isAIGenerated: true,
      modelUsed: 'provider/vendor/model-name',
      humanReviewRequired: false,
    };
    const label = formatTransparencyLabel(meta);
    expect(label).toContain('model-name');
  });
});

describe('DEFAULT_AI_PREFERENCES', () => {
  it('aiAssistantEnabled is true by default', () => {
    expect(DEFAULT_AI_PREFERENCES.aiAssistantEnabled).toBe(true);
  });

  it('externalLLMEnabled is false by default (opt-in required)', () => {
    expect(DEFAULT_AI_PREFERENCES.externalLLMEnabled).toBe(false);
  });

  it('behaviorProfilingEnabled is false by default', () => {
    expect(DEFAULT_AI_PREFERENCES.behaviorProfilingEnabled).toBe(false);
  });

  it('all agent types are enabled by default', () => {
    const agentTypes: AgentType[] = ['CHAVRUTA', 'QUIZ_MASTER', 'SUMMARIZER', 'DEBATE', 'TUTOR'];
    for (const type of agentTypes) {
      expect(DEFAULT_AI_PREFERENCES.agentTypes[type]).toBe(true);
    }
  });

  it('has exactly 5 agent types', () => {
    expect(Object.keys(DEFAULT_AI_PREFERENCES.agentTypes)).toHaveLength(5);
  });
});
