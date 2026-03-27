import { describe, it, expect } from 'vitest';
import type {
  ApiConcept,
  ApiRelatedConcept,
  ApiConceptNode,
  ApiLearningPath,
  ViewMode,
  KnowledgeGraphProps,
} from './types';

describe('knowledge-graph/types', () => {
  it('ApiConcept shape is valid', () => {
    const concept: ApiConcept = {
      id: '1',
      name: 'Test',
      definition: 'A test concept',
      sourceIds: ['s-1'],
    };
    expect(concept.sourceIds).toHaveLength(1);
  });

  it('ApiRelatedConcept shape is valid', () => {
    const related: ApiRelatedConcept = {
      concept: { id: '1', name: 'Test', definition: 'def' },
      strength: 0.8,
    };
    expect(related.strength).toBe(0.8);
  });

  it('ApiConceptNode shape is valid', () => {
    const node: ApiConceptNode = { id: '1', name: 'Node' };
    expect(node.type).toBeUndefined();
  });

  it('ApiLearningPath shape is valid', () => {
    const path: ApiLearningPath = { concepts: [], steps: 0 };
    expect(path.steps).toBe(0);
  });

  it('ViewMode accepts valid values', () => {
    const modes: ViewMode[] = ['global', 'personal'];
    expect(modes).toHaveLength(2);
  });

  it('KnowledgeGraphProps accepts optional courseId', () => {
    const props: KnowledgeGraphProps = {};
    expect(props.courseId).toBeUndefined();

    const propsWithId: KnowledgeGraphProps = { courseId: 'c-1' };
    expect(propsWithId.courseId).toBe('c-1');
  });
});
