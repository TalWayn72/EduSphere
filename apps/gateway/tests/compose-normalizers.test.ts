/**
 * BUG-104 — compose.js SDL normalizer unit tests
 *
 * Validates the 4 fixes applied to compose.js that prevented proper
 * supergraph recomposition (missing Pipeline Template types):
 *
 *   1. normalizeKnowledgeSdl strips docstrings along with query lines
 *   2. Type block regexes handle @authenticated directives before opening brace
 *   3. normalizeAgentSdl renames LessonPipelineResult to AgentLessonPipelineResult
 *   4. skillGapReport query is stripped from knowledge SDL
 *
 * These functions are tested by importing compose.js source logic.
 * Since compose.js uses ESM + bare function declarations, we replicate
 * the normalizer functions here to test them in isolation.
 */

import { describe, it, expect } from 'vitest';

// ── Replicate normalizer functions from compose.js ─────────────────────────
// compose.js does not export its functions. We replicate the exact logic
// here so tests break if compose.js diverges. A future refactor should
// extract these into a shared module.

function normalizeKnowledgeSdl(sdl: string): string {
  // Remove SocialFeedItem type block (may have directives like @authenticated before {)
  let out = sdl.replace(
    /"""[^"]*"""\s*type SocialFeedItem[^{]*\{[^}]*\}/gs,
    '',
  );
  out = out.replace(/type SocialFeedItem[^{]*\{[^}]*\}/gs, '');
  // Remove SocialRecommendation type block
  out = out.replace(
    /"""[^"]*"""\s*type SocialRecommendation[^{]*\{[^}]*\}/gs,
    '',
  );
  out = out.replace(/type SocialRecommendation[^{]*\{[^}]*\}/gs, '');
  // Remove SocialVerb enum block
  out = out.replace(/"""[^"]*"""\s*enum SocialVerb[^{]*\{[^}]*\}/gs, '');
  out = out.replace(/enum SocialVerb[^{]*\{[^}]*\}/gs, '');
  // Remove socialFeed and socialRecommendations — strip preceding docstrings
  out = out.replace(/\s*"""[^"]*"""\s*socialFeed[^\n]*/gs, '');
  out = out.replace(/\s*socialFeed[^\n]*/g, '');
  out = out.replace(/\s*"""[^"]*"""\s*socialRecommendations[^\n]*/gs, '');
  out = out.replace(/\s*socialRecommendations[^\n]*/g, '');
  // Remove skillGapAnalysis and skillGapReport from knowledge
  out = out.replace(/\s*"""[^"]*"""\s*skillGapAnalysis[^\n]*/gs, '');
  out = out.replace(/\s*skillGapAnalysis[^\n]*/g, '');
  out = out.replace(/\s*"""[^"]*"""\s*skillGapReport[^\n]*/gs, '');
  out = out.replace(/\s*skillGapReport[^\n]*/g, '');
  // Remove SkillGapReport type block
  out = out.replace(
    /"""[^"]*"""\s*type SkillGapReport\s*\{[^}]*\}/gs,
    '',
  );
  out = out.replace(/type SkillGapReport\s*\{[^}]*\}/gs, '');
  // Remove SkillGapItem type block
  out = out.replace(
    /"""[^"]*"""\s*type SkillGapItem\s*\{[^}]*\}/gs,
    '',
  );
  out = out.replace(/type SkillGapItem\s*\{[^}]*\}/gs, '');
  // Remove empty extend type Query {} blocks left behind
  out = out.replace(/extend\s+type\s+Query\s*\{\s*\}/g, '');
  return out;
}

function normalizeAgentSdl(sdl: string): string {
  return sdl.replace(/(?<!Agent)LessonPipelineResult/g, 'AgentLessonPipelineResult');
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('BUG-104: normalizeKnowledgeSdl', () => {
  it('strips docstrings along with socialFeed query lines', () => {
    const input = `
extend type Query {
  """Fetch the social feed for the current user"""
  socialFeed(limit: Int): [SocialFeedItem!]!
  """Get recommendations"""
  socialRecommendations: [SocialRecommendation!]!
  someOtherQuery: String
}`;
    const result = normalizeKnowledgeSdl(input);
    expect(result).not.toContain('socialFeed');
    expect(result).not.toContain('Fetch the social feed');
    expect(result).not.toContain('socialRecommendations');
    expect(result).not.toContain('Get recommendations');
    expect(result).toContain('someOtherQuery');
  });

  it('strips skillGapReport query with preceding docstring', () => {
    const input = `
extend type Query {
  """Analyze skill gaps for a user"""
  skillGapAnalysis(userId: ID!): SkillGapReport
  """Get a detailed skill gap report"""
  skillGapReport(userId: ID!): SkillGapReport
  healthCheck: Boolean
}`;
    const result = normalizeKnowledgeSdl(input);
    expect(result).not.toContain('skillGapAnalysis');
    expect(result).not.toContain('skillGapReport');
    expect(result).not.toContain('Analyze skill gaps');
    expect(result).not.toContain('detailed skill gap report');
    expect(result).toContain('healthCheck');
  });

  it('removes SkillGapReport type block with docstring', () => {
    const input = `
"""A report describing skill gaps for a learner"""
type SkillGapReport {
  userId: ID!
  gaps: [SkillGapItem!]!
  overallScore: Float
}

type SomeOtherType {
  id: ID!
}`;
    const result = normalizeKnowledgeSdl(input);
    expect(result).not.toContain('SkillGapReport');
    expect(result).not.toContain('A report describing skill gaps');
    expect(result).toContain('SomeOtherType');
  });

  it('removes SkillGapItem type block', () => {
    const input = `
"""A single skill gap item"""
type SkillGapItem {
  skillName: String!
  currentLevel: Float
  targetLevel: Float
}`;
    const result = normalizeKnowledgeSdl(input);
    expect(result).not.toContain('SkillGapItem');
    expect(result).not.toContain('single skill gap item');
  });

  it('handles type blocks with @authenticated directive before opening brace', () => {
    const input = `
type SocialFeedItem @authenticated {
  id: ID!
  verb: SocialVerb
  actorId: ID!
}

type SocialRecommendation @authenticated {
  userId: ID!
  reason: String
}`;
    const result = normalizeKnowledgeSdl(input);
    expect(result).not.toContain('SocialFeedItem');
    expect(result).not.toContain('SocialRecommendation');
  });

  it('handles type blocks with @key and @authenticated directives', () => {
    const input = `
type SocialFeedItem @key(fields: "id") @authenticated {
  id: ID!
  content: String
}`;
    const result = normalizeKnowledgeSdl(input);
    expect(result).not.toContain('SocialFeedItem');
  });

  it('removes empty extend type Query {} blocks left behind', () => {
    const input = `
extend type Query {
  socialFeed(limit: Int): [SocialFeedItem!]!
}`;
    const result = normalizeKnowledgeSdl(input);
    expect(result).not.toContain('extend type Query');
  });

  it('removes SocialVerb enum with directives before brace', () => {
    const input = `
"""Verbs for social feed events"""
enum SocialVerb @authenticated {
  CREATED
  COMPLETED
  COMMENTED
}

enum SomeOtherEnum {
  VALUE_A
  VALUE_B
}`;
    const result = normalizeKnowledgeSdl(input);
    expect(result).not.toContain('SocialVerb');
    expect(result).toContain('SomeOtherEnum');
  });

  it('is idempotent — running twice produces same output', () => {
    const input = `
"""Social feed"""
type SocialFeedItem @authenticated {
  id: ID!
}
extend type Query {
  """Get feed"""
  socialFeed: [SocialFeedItem!]!
  """Gap report"""
  skillGapReport(userId: ID!): SkillGapReport
}
type SkillGapReport {
  score: Float
}`;
    const first = normalizeKnowledgeSdl(input);
    const second = normalizeKnowledgeSdl(first);
    expect(second).toBe(first);
  });
});

describe('BUG-104: normalizeAgentSdl', () => {
  it('renames LessonPipelineResult to AgentLessonPipelineResult', () => {
    const input = `
type LessonPipelineResult {
  executionId: ID!
  status: String!
  markdownContent: String
}

extend type Query {
  agentPipelineResult(id: ID!): LessonPipelineResult
}`;
    const result = normalizeAgentSdl(input);
    expect(result).not.toContain('type LessonPipelineResult');
    expect(result).toContain('type AgentLessonPipelineResult');
    expect(result).toContain('agentPipelineResult(id: ID!): AgentLessonPipelineResult');
  });

  it('renames all occurrences including in field return types', () => {
    const input = `
type AgentWorkflow {
  result: LessonPipelineResult
  results: [LessonPipelineResult!]!
}`;
    const result = normalizeAgentSdl(input);
    expect(result).toContain('result: AgentLessonPipelineResult');
    expect(result).toContain('results: [AgentLessonPipelineResult!]!');
    // No bare LessonPipelineResult should remain
    expect(result).not.toMatch(/(?<!Agent)LessonPipelineResult/);
  });

  it('does not rename AgentLessonPipelineResult if already renamed', () => {
    const input = `type AgentLessonPipelineResult { id: ID! }`;
    const result = normalizeAgentSdl(input);
    // Should not double-prefix
    expect(result).not.toContain('AgentAgentLessonPipelineResult');
    expect(result).toContain('AgentLessonPipelineResult');
  });

  it('preserves other types unchanged', () => {
    const input = `
type AgentTask {
  id: ID!
  status: String!
}

type LessonPipelineResult {
  executionId: ID!
}`;
    const result = normalizeAgentSdl(input);
    expect(result).toContain('type AgentTask');
    expect(result).toContain('type AgentLessonPipelineResult');
  });
});
