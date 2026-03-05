/**
 * lesson-pipeline.resolver.spec.ts
 * Unit tests for LessonPipelineFieldResolver and LessonPipelineRunFieldResolver.
 * Direct class instantiation — no NestJS TestingModule.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./lesson-pipeline.service.js', () => ({
  LessonPipelineService: class {},
}));

import {
  LessonPipelineFieldResolver,
  LessonPipelineRunFieldResolver,
} from './lesson-pipeline.resolver.js';

const MOCK_RUN = { id: 'run-1', status: 'RUNNING', pipelineId: 'pipe-1' };
const MOCK_RESULTS = [{ id: 'res-1', moduleName: 'INGESTION' }];

function makePipelineService(overrides: Partial<{
  findCurrentRunByPipeline: () => Promise<unknown>;
  findResultsByRunId: () => Promise<unknown[]>;
}> = {}) {
  return {
    findCurrentRunByPipeline: vi.fn().mockResolvedValue(MOCK_RUN),
    findResultsByRunId: vi.fn().mockResolvedValue(MOCK_RESULTS),
    ...overrides,
  };
}

describe('LessonPipelineFieldResolver', () => {
  let resolver: LessonPipelineFieldResolver;
  let svc: ReturnType<typeof makePipelineService>;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = makePipelineService();
    resolver = new LessonPipelineFieldResolver(svc as never);
  });

  it('getCurrentRun delegates to service.findCurrentRunByPipeline', async () => {
    await resolver.getCurrentRun({ id: 'pipe-1' });
    expect(svc.findCurrentRunByPipeline).toHaveBeenCalledWith('pipe-1');
  });

  it('getCurrentRun returns the run from service', async () => {
    const result = await resolver.getCurrentRun({ id: 'pipe-1' });
    expect(result).toBe(MOCK_RUN);
  });

  it('getCurrentRun returns null when service throws', async () => {
    svc.findCurrentRunByPipeline.mockRejectedValue(new Error('DB error'));
    const result = await resolver.getCurrentRun({ id: 'pipe-1' });
    expect(result).toBeNull();
  });
});

describe('LessonPipelineRunFieldResolver', () => {
  let resolver: LessonPipelineRunFieldResolver;
  let svc: ReturnType<typeof makePipelineService>;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = makePipelineService();
    resolver = new LessonPipelineRunFieldResolver(svc as never);
  });

  it('getResults delegates to service.findResultsByRunId', async () => {
    await resolver.getResults({ id: 'run-1' });
    expect(svc.findResultsByRunId).toHaveBeenCalledWith('run-1');
  });

  it('getResults returns results array from service', async () => {
    const result = await resolver.getResults({ id: 'run-1' });
    expect(result).toBe(MOCK_RESULTS);
  });

  it('getResults returns empty array when service throws', async () => {
    svc.findResultsByRunId.mockRejectedValue(new Error('timeout'));
    const result = await resolver.getResults({ id: 'run-99' });
    expect(result).toEqual([]);
  });

  it('getResults passes string-coerced id to service', async () => {
    await resolver.getResults({ id: 42 as unknown as string });
    expect(svc.findResultsByRunId).toHaveBeenCalledWith('42');
  });
});
