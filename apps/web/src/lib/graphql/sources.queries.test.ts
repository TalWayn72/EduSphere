import { describe, it, expect } from 'vitest';
import {
  COURSE_KNOWLEDGE_SOURCES,
  KNOWLEDGE_SOURCE_DETAIL,
  ADD_URL_SOURCE,
  ADD_TEXT_SOURCE,
  ADD_YOUTUBE_SOURCE,
  ADD_FILE_SOURCE,
  DELETE_KNOWLEDGE_SOURCE,
} from './sources.queries';

describe('sources.queries', () => {
  it('exports COURSE_KNOWLEDGE_SOURCES as a query DocumentNode', () => {
    expect(COURSE_KNOWLEDGE_SOURCES).toBeDefined();
    expect(COURSE_KNOWLEDGE_SOURCES.kind).toBe('Document');
    expect(COURSE_KNOWLEDGE_SOURCES.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = COURSE_KNOWLEDGE_SOURCES.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('CourseKnowledgeSources');
  });

  it('exports KNOWLEDGE_SOURCE_DETAIL as a query DocumentNode', () => {
    expect(KNOWLEDGE_SOURCE_DETAIL).toBeDefined();
    expect(KNOWLEDGE_SOURCE_DETAIL.kind).toBe('Document');
    expect(KNOWLEDGE_SOURCE_DETAIL.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = KNOWLEDGE_SOURCE_DETAIL.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('KnowledgeSourceDetail');
  });

  it('exports ADD_URL_SOURCE as a mutation DocumentNode', () => {
    expect(ADD_URL_SOURCE).toBeDefined();
    expect(ADD_URL_SOURCE.kind).toBe('Document');
    expect(ADD_URL_SOURCE.definitions.length).toBeGreaterThanOrEqual(1);
    const def = ADD_URL_SOURCE.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('AddUrlSource');
  });

  it('exports ADD_TEXT_SOURCE as a mutation DocumentNode', () => {
    expect(ADD_TEXT_SOURCE).toBeDefined();
    expect(ADD_TEXT_SOURCE.kind).toBe('Document');
    expect(ADD_TEXT_SOURCE.definitions.length).toBeGreaterThanOrEqual(1);
    const def = ADD_TEXT_SOURCE.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('AddTextSource');
  });

  it('exports ADD_YOUTUBE_SOURCE as a mutation DocumentNode', () => {
    expect(ADD_YOUTUBE_SOURCE).toBeDefined();
    expect(ADD_YOUTUBE_SOURCE.kind).toBe('Document');
    expect(ADD_YOUTUBE_SOURCE.definitions.length).toBeGreaterThanOrEqual(1);
    const def = ADD_YOUTUBE_SOURCE.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('AddYoutubeSource');
  });

  it('exports ADD_FILE_SOURCE as a mutation DocumentNode', () => {
    expect(ADD_FILE_SOURCE).toBeDefined();
    expect(ADD_FILE_SOURCE.kind).toBe('Document');
    expect(ADD_FILE_SOURCE.definitions.length).toBeGreaterThanOrEqual(1);
    const def = ADD_FILE_SOURCE.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('AddFileSource');
  });

  it('exports DELETE_KNOWLEDGE_SOURCE as a mutation DocumentNode', () => {
    expect(DELETE_KNOWLEDGE_SOURCE).toBeDefined();
    expect(DELETE_KNOWLEDGE_SOURCE.kind).toBe('Document');
    expect(DELETE_KNOWLEDGE_SOURCE.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = DELETE_KNOWLEDGE_SOURCE.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('DeleteKnowledgeSource');
  });
});
