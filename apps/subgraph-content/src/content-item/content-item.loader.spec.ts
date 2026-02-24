import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentItemLoader } from './content-item.loader.js';
import type { ContentItemMapped } from './content-item.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(id: string, moduleId: string): ContentItemMapped {
  return {
    id,
    moduleId,
    title: `Item ${id}`,
    contentType: 'video',
    content: null,
    fileId: null,
    duration: 60,
    orderIndex: 0,
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date('2026-01-01').toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Mock ContentItemService
// ---------------------------------------------------------------------------

function makeServiceMock(data: Map<string, ContentItemMapped[]>) {
  return {
    findByModuleIdBatch: vi.fn(async (moduleIds: string[]) => {
      const result = new Map<string, ContentItemMapped[]>();
      for (const id of moduleIds) {
        result.set(id, data.get(id) ?? []);
      }
      return result;
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ContentItemLoader', () => {
  const ITEM_A1 = makeItem('item-a1', 'module-a');
  const ITEM_A2 = makeItem('item-a2', 'module-a');
  const ITEM_B1 = makeItem('item-b1', 'module-b');

  const batchData = new Map<string, ContentItemMapped[]>([
    ['module-a', [ITEM_A1, ITEM_A2]],
    ['module-b', [ITEM_B1]],
    ['module-empty', []],
  ]);

  let serviceMock: ReturnType<typeof makeServiceMock>;
  let loader: ContentItemLoader;

  beforeEach(() => {
    serviceMock = makeServiceMock(batchData);
    // ContentItemLoader accepts the service via constructor injection
    loader = new ContentItemLoader(serviceMock as never);
  });

  describe('byModuleId.load()', () => {
    it('returns items for a single module', async () => {
      const items = await loader.byModuleId.load('module-a');
      expect(items).toHaveLength(2);
      expect(items.map((i) => i.id)).toEqual(['item-a1', 'item-a2']);
    });

    it('returns empty array for a module with no content items', async () => {
      const items = await loader.byModuleId.load('module-empty');
      expect(items).toEqual([]);
    });

    it('batches multiple concurrent .load() calls into ONE findByModuleIdBatch call', async () => {
      // Fire three loads in the same tick — DataLoader must coalesce them
      const [resA, resB, resEmpty] = await Promise.all([
        loader.byModuleId.load('module-a'),
        loader.byModuleId.load('module-b'),
        loader.byModuleId.load('module-empty'),
      ]);

      // Results are correct
      expect(resA).toHaveLength(2);
      expect(resB).toHaveLength(1);
      expect(resEmpty).toHaveLength(0);

      // The critical assertion: service called ONCE, not three times
      expect(serviceMock.findByModuleIdBatch).toHaveBeenCalledTimes(1);

      // All three moduleIds were passed in one batch call
      const calledWith: string[] = serviceMock.findByModuleIdBatch.mock.calls[0]![0];
      expect(calledWith).toHaveLength(3);
      expect(calledWith).toContain('module-a');
      expect(calledWith).toContain('module-b');
      expect(calledWith).toContain('module-empty');
    });

    it('preserves correct result order regardless of DB return order', async () => {
      // Batch data returns module-b before module-a internally;
      // DataLoader must still match results to the original key positions.
      const [resB, resA] = await Promise.all([
        loader.byModuleId.load('module-b'),
        loader.byModuleId.load('module-a'),
      ]);

      expect(resB[0]?.id).toBe('item-b1');
      expect(resA[0]?.id).toBe('item-a1');
    });

    it('returns ContentItemMapped objects with all required fields', async () => {
      const [item] = await loader.byModuleId.load('module-a');
      expect(item).toMatchObject<ContentItemMapped>({
        id: expect.any(String) as string,
        moduleId: 'module-a',
        title: expect.any(String) as string,
        contentType: expect.any(String) as string,
        content: null,
        fileId: null,
        duration: expect.any(Number) as number,
        orderIndex: expect.any(Number) as number,
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
      });
    });
  });

  describe('batching isolation', () => {
    it('does not share batch state between loader instances', async () => {
      const serviceMock2 = makeServiceMock(batchData);
      const loader2 = new ContentItemLoader(serviceMock2 as never);

      await loader.byModuleId.load('module-a');
      await loader2.byModuleId.load('module-b');

      // Each loader has its own DataLoader instance — separate batch calls
      expect(serviceMock.findByModuleIdBatch).toHaveBeenCalledTimes(1);
      expect(serviceMock2.findByModuleIdBatch).toHaveBeenCalledTimes(1);
    });
  });
});
