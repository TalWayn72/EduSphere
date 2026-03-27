import { describe, it, expect } from 'vitest';
import { SKILLS_QUERY, SKILL_PATHS_QUERY, MY_SKILL_PROGRESS_QUERY, SKILL_GAP_ANALYSIS_QUERY, UPDATE_SKILL_PROGRESS_MUTATION } from './skills.queries';

describe('skills.queries', () => {
  it('exports SKILLS_QUERY as a query DocumentNode', () => {
    expect(SKILLS_QUERY).toBeDefined();
    expect(SKILLS_QUERY.kind).toBe('Document');
    expect(SKILLS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SKILLS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('Skills');
  });

  it('exports SKILL_PATHS_QUERY as a query DocumentNode', () => {
    expect(SKILL_PATHS_QUERY).toBeDefined();
    expect(SKILL_PATHS_QUERY.kind).toBe('Document');
    expect(SKILL_PATHS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SKILL_PATHS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('SkillPaths');
  });

  it('exports MY_SKILL_PROGRESS_QUERY as a query DocumentNode', () => {
    expect(MY_SKILL_PROGRESS_QUERY).toBeDefined();
    expect(MY_SKILL_PROGRESS_QUERY.kind).toBe('Document');
    expect(MY_SKILL_PROGRESS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_SKILL_PROGRESS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MySkillProgress');
  });

  it('exports SKILL_GAP_ANALYSIS_QUERY as a query DocumentNode', () => {
    expect(SKILL_GAP_ANALYSIS_QUERY).toBeDefined();
    expect(SKILL_GAP_ANALYSIS_QUERY.kind).toBe('Document');
    expect(SKILL_GAP_ANALYSIS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SKILL_GAP_ANALYSIS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('SkillGapAnalysis');
  });

  it('exports UPDATE_SKILL_PROGRESS_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_SKILL_PROGRESS_MUTATION).toBeDefined();
    expect(UPDATE_SKILL_PROGRESS_MUTATION.kind).toBe('Document');
    expect(UPDATE_SKILL_PROGRESS_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UPDATE_SKILL_PROGRESS_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateMySkillProgress');
  });

});
