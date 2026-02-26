import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ScenarioService } from './scenario.service';

// --- Mock @edusphere/db ---

const mockSelectChain = {
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
};

const mockInsertChain = {
  values: vi.fn().mockResolvedValue(undefined),
};

const mockDb = {
  select: vi.fn(() => mockSelectChain),
  insert: vi.fn(() => mockInsertChain),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: vi.fn(),
  schema: {
    contentItems: {} as Record<string, unknown>,
    scenario_choices: {} as Record<string, unknown>,
  },
  eq: vi.fn((_a: unknown, _b: unknown) => ({ type: 'eq' })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  asc: vi.fn((col: unknown) => col),
  withTenantContext: vi.fn(
    async (_db: unknown, _ctx: unknown, fn: () => Promise<unknown>) => fn()
  ),
}));

// --- Helpers ---

const CTX = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  userRole: 'STUDENT' as const,
};

const makeScenarioContent = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    title: 'Test Scenario',
    description: 'You are at a crossroads.',
    choices: [
      {
        id: 'choice-a',
        text: 'Go left',
        nextContentItemId: '550e8400-e29b-41d4-a716-446655440002',
      },
      { id: 'choice-b', text: 'Go right', nextContentItemId: null },
    ],
    isEndNode: false,
    ...overrides,
  });

const makeEndNodeContent = () =>
  JSON.stringify({
    title: 'The End',
    description: 'You reached the end.',
    choices: [],
    isEndNode: true,
    endingType: 'SUCCESS',
  });

function setupSelectReturn(returnValue: unknown[]) {
  mockSelectChain.from.mockReturnValue(mockSelectChain);
  mockSelectChain.where.mockReturnValue(mockSelectChain);
  mockSelectChain.limit.mockResolvedValue(returnValue);
  mockSelectChain.orderBy.mockResolvedValue(returnValue);
}

// --- Tests ---

describe('ScenarioService', () => {
  let service: ScenarioService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ScenarioService();
    mockSelectChain.from.mockReturnValue(mockSelectChain);
    mockSelectChain.where.mockReturnValue(mockSelectChain);
    mockSelectChain.limit.mockResolvedValue([]);
    mockSelectChain.orderBy.mockResolvedValue([]);
    mockInsertChain.values.mockResolvedValue(undefined);
  });

  // --- parseScenarioContent ---

  it('throws BadRequestException for null content', () => {
    expect(() => service.parseScenarioContent(null)).toThrow(
      BadRequestException
    );
  });

  it('throws BadRequestException for invalid JSON', () => {
    expect(() => service.parseScenarioContent('not json')).toThrow(
      BadRequestException
    );
  });

  it('throws BadRequestException for invalid schema', () => {
    expect(() =>
      service.parseScenarioContent(JSON.stringify({ title: 'x' }))
    ).toThrow(BadRequestException);
  });

  it('parses valid scenario content', () => {
    const result = service.parseScenarioContent(makeScenarioContent());
    expect(result.choices).toHaveLength(2);
    expect(result.isEndNode).toBe(false);
  });

  // --- getScenarioNode ---

  it('throws NotFoundException when content item does not exist', async () => {
    setupSelectReturn([]);
    await expect(service.getScenarioNode('missing-id', CTX)).rejects.toThrow(
      NotFoundException
    );
  });

  it('throws BadRequestException when content item is not SCENARIO type', async () => {
    setupSelectReturn([
      { id: 'item-1', type: 'VIDEO', content: null, title: 'Video' },
    ]);
    await expect(service.getScenarioNode('item-1', CTX)).rejects.toThrow(
      BadRequestException
    );
  });

  it('returns ScenarioNodeDto for valid scenario node', async () => {
    setupSelectReturn([
      {
        id: 'item-1',
        type: 'SCENARIO',
        content: makeScenarioContent(),
        title: 'Node 1',
      },
    ]);
    const node = await service.getScenarioNode('item-1', CTX);
    expect(node.id).toBe('item-1');
    expect(node.choices).toHaveLength(2);
    expect(node.isEndNode).toBe(false);
  });

  // --- recordChoice ---

  it('returns next node when a valid choice with nextContentItemId is made', async () => {
    mockSelectChain.from.mockReturnValue(mockSelectChain);
    mockSelectChain.where.mockReturnValue(mockSelectChain);
    mockSelectChain.limit
      .mockResolvedValueOnce([
        {
          id: 'item-1',
          type: 'SCENARIO',
          content: makeScenarioContent(),
          title: 'Node 1',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          type: 'SCENARIO',
          content: makeScenarioContent(),
          title: 'Node 2',
        },
      ]);

    const result = await service.recordChoice(
      'item-1',
      'choice-a',
      'item-1',
      CTX
    );
    expect(result).not.toBeNull();
    expect(result?.id).toBe('550e8400-e29b-41d4-a716-446655440002');
  });

  it('returns null when choice leads to end of branch', async () => {
    setupSelectReturn([
      {
        id: 'item-1',
        type: 'SCENARIO',
        content: makeScenarioContent(),
        title: 'Node 1',
      },
    ]);
    const result = await service.recordChoice(
      'item-1',
      'choice-b',
      'item-1',
      CTX
    );
    expect(result).toBeNull();
  });

  it('throws NotFoundException for invalid choiceId', async () => {
    setupSelectReturn([
      {
        id: 'item-1',
        type: 'SCENARIO',
        content: makeScenarioContent(),
        title: 'Node 1',
      },
    ]);
    await expect(
      service.recordChoice('item-1', 'nonexistent-choice', 'item-1', CTX)
    ).rejects.toThrow(NotFoundException);
  });

  // --- getScenarioProgress ---

  it('returns ordered list of choices made so far', async () => {
    const choiceRows = [
      {
        from_content_item_id: 'item-1',
        choice_id: 'choice-a',
        chosen_at: new Date('2026-01-01T10:00:00Z'),
      },
    ];
    mockSelectChain.from.mockReturnValue(mockSelectChain);
    mockSelectChain.where.mockReturnValue(mockSelectChain);
    mockSelectChain.orderBy.mockResolvedValueOnce(choiceRows);
    mockSelectChain.limit.mockResolvedValueOnce([
      {
        id: 'item-1',
        type: 'SCENARIO',
        content: makeScenarioContent(),
        title: 'Node 1',
      },
    ]);

    const progress = await service.getScenarioProgress('item-1', CTX);
    expect(progress).toHaveLength(1);
    expect(progress[0].choiceId).toBe('choice-a');
    expect(progress[0].choiceText).toBe('Go left');
  });

  it('returns empty array when no choices have been made', async () => {
    mockSelectChain.from.mockReturnValue(mockSelectChain);
    mockSelectChain.where.mockReturnValue(mockSelectChain);
    mockSelectChain.orderBy.mockResolvedValueOnce([]);

    const progress = await service.getScenarioProgress('item-1', CTX);
    expect(progress).toHaveLength(0);
  });

  // --- end node ---

  it('correctly parses end node with endingType SUCCESS', () => {
    const content = service.parseScenarioContent(makeEndNodeContent());
    expect(content.isEndNode).toBe(true);
    expect(content.endingType).toBe('SUCCESS');
    expect(content.choices).toHaveLength(0);
  });
});
