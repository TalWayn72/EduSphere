import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PipelineNatsService } from './pipeline-nats.service';

const mockPublish = vi.fn();
const mockDrain = vi.fn().mockResolvedValue(undefined);
const mockNc = { publish: mockPublish, drain: mockDrain };

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue(mockNc),
  StringCodec: vi.fn(() => ({ encode: vi.fn((s) => s) })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({ servers: 'nats://test:4222' })),
  NatsSubjects: {
    LESSON_PIPELINE_MODULE_COMPLETED: 'EDUSPHERE.lesson.pipeline.module.completed',
    LESSON_PIPELINE_COMPLETED: 'EDUSPHERE.lesson.pipeline.completed',
  },
}));

describe('PipelineNatsService', () => {
  let service: PipelineNatsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PipelineNatsService();
  });

  describe('onModuleDestroy()', () => {
    it('drains NATS connection when connected', async () => {
      await service.getNats();
      await service.onModuleDestroy();
      expect(mockDrain).toHaveBeenCalled();
    });

    it('does nothing when no connection exists', async () => {
      await service.onModuleDestroy();
      expect(mockDrain).not.toHaveBeenCalled();
    });

    it('handles drain errors gracefully', async () => {
      mockDrain.mockRejectedValueOnce(new Error('drain fail'));
      await service.getNats();
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  describe('getNats()', () => {
    it('returns a NATS connection', async () => {
      const nc = await service.getNats();
      expect(nc).toBe(mockNc);
    });

    it('reuses existing connection on second call', async () => {
      const nc1 = await service.getNats();
      const nc2 = await service.getNats();
      expect(nc1).toBe(nc2);
    });
  });

  describe('publishModuleEvent()', () => {
    it('publishes module completed event', async () => {
      // Pre-connect so getNats() resolves immediately
      await service.getNats();
      const payload = {
        lessonId: 'l1',
        runId: 'r1',
        moduleName: 'NER',
        status: 'COMPLETED' as const,
        tenantId: 't1',
      };
      service.publishModuleEvent(payload as any);
      // Allow promise to resolve
      await new Promise((r) => setTimeout(r, 10));
      expect(mockPublish).toHaveBeenCalledWith(
        'EDUSPHERE.lesson.pipeline.module.completed',
        expect.anything(),
      );
    });
  });

  describe('publishNEREntities()', () => {
    it('publishes NER entities when array is non-empty', async () => {
      await service.getNats();
      const entities = [{ text: 'Rashi', type: 'PERSON', score: 0.95 }];
      service.publishNEREntities('t1', 'l1', 'r1', entities as any);
      await new Promise((r) => setTimeout(r, 10));
      expect(mockPublish).toHaveBeenCalledWith(
        'EDUSPHERE.content.t1.ner.extracted',
        expect.anything(),
      );
    });

    it('skips publish when entities array is empty', async () => {
      await service.getNats();
      service.publishNEREntities('t1', 'l1', 'r1', []);
      await new Promise((r) => setTimeout(r, 10));
      expect(mockPublish).not.toHaveBeenCalled();
    });
  });

  describe('publishPipelineCompleted()', () => {
    it('publishes pipeline completed event', async () => {
      await service.getNats();
      service.publishPipelineCompleted('l1', 't1');
      await new Promise((r) => setTimeout(r, 10));
      expect(mockPublish).toHaveBeenCalledWith(
        'EDUSPHERE.lesson.pipeline.completed',
        expect.anything(),
      );
    });
  });
});
