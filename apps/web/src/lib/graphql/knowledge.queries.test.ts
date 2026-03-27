import { describe, it, expect } from 'vitest';
import { CONCEPT_QUERY, GET_CONCEPTS_QUERY, GET_RELATED_CONCEPTS_QUERY, CREATE_CONCEPT_MUTATION, LINK_CONCEPTS_MUTATION, SEARCH_SEMANTIC_QUERY, LEARNING_PATH_QUERY, RELATED_CONCEPTS_BY_NAME_QUERY, PREREQUISITE_CHAIN_QUERY, GET_SKILL_TREE_QUERY, UPDATE_MASTERY_LEVEL_MUTATION } from './knowledge.queries';

describe('knowledge.queries', () => {
  it('exports CONCEPT_QUERY as a query DocumentNode', () => {
    expect(CONCEPT_QUERY).toBeDefined();
    expect(CONCEPT_QUERY.kind).toBe('Document');
    expect(CONCEPT_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CONCEPT_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('Concept');
  });

  it('exports GET_CONCEPTS_QUERY as a query DocumentNode', () => {
    expect(GET_CONCEPTS_QUERY).toBeDefined();
    expect(GET_CONCEPTS_QUERY.kind).toBe('Document');
    expect(GET_CONCEPTS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = GET_CONCEPTS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('GetConcepts');
  });

  it('exports GET_RELATED_CONCEPTS_QUERY as a query DocumentNode', () => {
    expect(GET_RELATED_CONCEPTS_QUERY).toBeDefined();
    expect(GET_RELATED_CONCEPTS_QUERY.kind).toBe('Document');
    expect(GET_RELATED_CONCEPTS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = GET_RELATED_CONCEPTS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('GetRelatedConcepts');
  });

  it('exports CREATE_CONCEPT_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_CONCEPT_MUTATION).toBeDefined();
    expect(CREATE_CONCEPT_MUTATION.kind).toBe('Document');
    expect(CREATE_CONCEPT_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_CONCEPT_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateConcept');
  });

  it('exports LINK_CONCEPTS_MUTATION as a mutation DocumentNode', () => {
    expect(LINK_CONCEPTS_MUTATION).toBeDefined();
    expect(LINK_CONCEPTS_MUTATION.kind).toBe('Document');
    expect(LINK_CONCEPTS_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = LINK_CONCEPTS_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('LinkConcepts');
  });

  it('exports SEARCH_SEMANTIC_QUERY as a query DocumentNode', () => {
    expect(SEARCH_SEMANTIC_QUERY).toBeDefined();
    expect(SEARCH_SEMANTIC_QUERY.kind).toBe('Document');
    expect(SEARCH_SEMANTIC_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SEARCH_SEMANTIC_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('SearchSemantic');
  });

  it('exports LEARNING_PATH_QUERY as a query DocumentNode', () => {
    expect(LEARNING_PATH_QUERY).toBeDefined();
    expect(LEARNING_PATH_QUERY.kind).toBe('Document');
    expect(LEARNING_PATH_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = LEARNING_PATH_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('LearningPath');
  });

  it('exports RELATED_CONCEPTS_BY_NAME_QUERY as a query DocumentNode', () => {
    expect(RELATED_CONCEPTS_BY_NAME_QUERY).toBeDefined();
    expect(RELATED_CONCEPTS_BY_NAME_QUERY.kind).toBe('Document');
    expect(RELATED_CONCEPTS_BY_NAME_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = RELATED_CONCEPTS_BY_NAME_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('RelatedConceptsByName');
  });

  it('exports PREREQUISITE_CHAIN_QUERY as a query DocumentNode', () => {
    expect(PREREQUISITE_CHAIN_QUERY).toBeDefined();
    expect(PREREQUISITE_CHAIN_QUERY.kind).toBe('Document');
    expect(PREREQUISITE_CHAIN_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = PREREQUISITE_CHAIN_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('PrerequisiteChain');
  });

  it('exports GET_SKILL_TREE_QUERY as a query DocumentNode', () => {
    expect(GET_SKILL_TREE_QUERY).toBeDefined();
    expect(GET_SKILL_TREE_QUERY.kind).toBe('Document');
    expect(GET_SKILL_TREE_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = GET_SKILL_TREE_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('GetSkillTree');
  });

  it('exports UPDATE_MASTERY_LEVEL_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_MASTERY_LEVEL_MUTATION).toBeDefined();
    expect(UPDATE_MASTERY_LEVEL_MUTATION.kind).toBe('Document');
    expect(UPDATE_MASTERY_LEVEL_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UPDATE_MASTERY_LEVEL_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateMasteryLevel');
  });

});
