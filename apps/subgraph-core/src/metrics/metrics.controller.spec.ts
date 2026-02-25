import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { MetricsController } from '@edusphere/metrics';

describe('MetricsController', () => {
  let controller: MetricsController;
  let mockRegistry: { contentType: string; metrics: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockRegistry = {
      contentType: 'text/plain; version=0.0.4; charset=utf-8',
      metrics: vi.fn().mockResolvedValue('edusphere_up 1'),
    };

    const module = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        { provide: 'METRICS_REGISTRY', useValue: mockRegistry },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  describe('getMetrics()', () => {
    it('sets Content-Type header to registry contentType', async () => {
      const mockRes = { set: vi.fn(), end: vi.fn() } as any;
      await controller.getMetrics(mockRes);
      expect(mockRes.set).toHaveBeenCalledWith('Content-Type', mockRegistry.contentType);
    });

    it('calls registry.metrics() to retrieve prometheus data', async () => {
      const mockRes = { set: vi.fn(), end: vi.fn() } as any;
      await controller.getMetrics(mockRes);
      expect(mockRegistry.metrics).toHaveBeenCalledOnce();
    });

    it('ends response with metrics output', async () => {
      const mockRes = { set: vi.fn(), end: vi.fn() } as any;
      const expectedMetrics = 'edusphere_up 1';
      mockRegistry.metrics.mockResolvedValue(expectedMetrics);
      await controller.getMetrics(mockRes);
      expect(mockRes.end).toHaveBeenCalledWith(expectedMetrics);
    });

    it('propagates errors from registry.metrics()', async () => {
      mockRegistry.metrics.mockRejectedValue(new Error('Registry error'));
      const mockRes = { set: vi.fn(), end: vi.fn() } as any;
      await expect(controller.getMetrics(mockRes)).rejects.toThrow('Registry error');
    });
  });
});
