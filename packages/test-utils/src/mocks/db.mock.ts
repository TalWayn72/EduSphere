import { vi } from 'vitest';

export interface MockDbChain {
  returning: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  offset: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
}

export interface MockDb {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  _mocks: MockDbChain;
}

export function createMockDb(): MockDb {
  const mockReturning = vi.fn().mockResolvedValue([]);
  const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockOrderBy = vi
    .fn()
    .mockReturnValue({ where: mockWhere, returning: mockReturning });
  const mockOffset = vi
    .fn()
    .mockReturnValue({ orderBy: mockOrderBy, returning: mockReturning });
  const mockLimit = vi.fn().mockReturnValue({
    offset: mockOffset,
    orderBy: mockOrderBy,
  });
  const mockFrom = vi.fn().mockReturnValue({
    where: mockWhere,
    limit: mockLimit,
    orderBy: mockOrderBy,
  });
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockSet = vi
    .fn()
    .mockReturnValue({ where: mockWhere, returning: mockReturning });

  return {
    select: vi.fn().mockReturnValue({ from: mockFrom }),
    insert: vi.fn().mockReturnValue({ values: mockValues }),
    update: vi.fn().mockReturnValue({ set: mockSet }),
    delete: vi.fn().mockReturnValue({ where: mockWhere }),
    _mocks: {
      returning: mockReturning,
      where: mockWhere,
      from: mockFrom,
      limit: mockLimit,
      offset: mockOffset,
      orderBy: mockOrderBy,
      values: mockValues,
      set: mockSet,
    },
  };
}

export function createMockWithTenantContext(): ReturnType<typeof vi.fn> {
  return vi.fn(
    async (_db: unknown, _ctx: unknown, callback: () => Promise<unknown>) =>
      callback()
  );
}
