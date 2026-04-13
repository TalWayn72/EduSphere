import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';

// ── DB mock ────────────────────────────────────────────────────────────────
const mockTx = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

const mockWithTenantContext = vi.fn(
  async (
    _db: unknown,
    _ctx: unknown,
    fn: (tx: typeof mockTx) => Promise<unknown>
  ) => fn(mockTx)
);

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockTx),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    live_qa_questions: {
      id: 'id',
      session_id: 'session_id',
      user_id: 'user_id',
      tenant_id: 'tenant_id',
      status: 'status',
      upvotes: 'upvotes',
    },
    live_qa_upvotes: {
      id: 'id',
      question_id: 'question_id',
      user_id: 'user_id',
      tenant_id: 'tenant_id',
    },
  },
  eq: vi.fn(() => 'eq'),
  and: vi.fn((...a: unknown[]) => a),
  desc: vi.fn((f: unknown) => `desc(${String(f)})`),
  sql: Object.assign(
    vi.fn(() => 'sql'),
    { raw: vi.fn() }
  ),
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...args),
}));

vi.mock('./nats-pubsub.helper', () => ({
  publishQAUpdated: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@edusphere/nats-client', () => ({
  LiveChatSubjects: { QA_UPDATED: 'live.qa.updated' },
}));

import { LiveQAService } from './live-qa.service.js';
import { publishQAUpdated } from './nats-pubsub.helper.js';

const instructorCtx: AuthContext = {
  tenantId: 'tenant-1',
  userId: 'instructor-1',
  roles: ['INSTRUCTOR'],
  scopes: [],
  sub: 'instructor-1',
};
const studentCtx: AuthContext = {
  tenantId: 'tenant-1',
  userId: 'student-1',
  roles: ['STUDENT'],
  scopes: [],
  sub: 'student-1',
};

const sampleQuestion = {
  id: 'q-1',
  session_id: 'sess-1',
  user_id: 'student-1',
  question: 'What is ontology?',
  status: 'PENDING',
  upvotes: 0,
};

function chainSelect(returnRows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(returnRows),
    orderBy: vi.fn().mockResolvedValue(returnRows),
  };
  vi.mocked(mockTx.select).mockReturnValue(chain as never);
  return chain;
}

describe('LiveQAService', () => {
  let service: LiveQAService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LiveQAService();
  });

  describe('askQuestion', () => {
    it('inserts question with PENDING status and returns row', async () => {
      vi.mocked(mockTx.insert).mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([sampleQuestion]),
      } as never);
      const result = await service.askQuestion(
        'sess-1',
        'What is ontology?',
        studentCtx
      );
      expect(mockTx.insert).toHaveBeenCalled();
      expect(result.status).toBe('PENDING');
      expect(result.upvotes).toBe(0);
    });

    it('publishes QA updated event after insert', async () => {
      vi.mocked(mockTx.insert).mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([sampleQuestion]),
      } as never);
      await service.askQuestion('sess-1', 'What is ontology?', studentCtx);
      expect(publishQAUpdated).toHaveBeenCalledWith('sess-1', sampleQuestion);
    });
  });

  describe('upvoteQuestion', () => {
    /**
     * upvoteQuestion issues 3 DB calls in order:
     *   1. select().from().where().limit(1)  → find question
     *   2. select({count}).from().where()    → count upvotes (awaits .where() directly)
     *   3. update().set().where().returning() → persist new count
     * The count query does NOT call .limit(), so its .where() must resolve the array.
     */
    function setupUpvoteMocks(upvoteCount = 1) {
      let selectCallIdx = 0;
      vi.mocked(mockTx.select).mockImplementation(() => {
        const idx = selectCallIdx++;
        if (idx === 0) {
          // First call: fetch question — uses .limit()
          return {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue([sampleQuestion]),
          } as never;
        }
        // Second call: count upvotes — awaits .where() directly
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: upvoteCount }]),
          limit: vi.fn().mockResolvedValue([{ count: upvoteCount }]),
        } as never;
      });
    }

    it('increments upvote count and returns updated question', async () => {
      setupUpvoteMocks(1);

      vi.mocked(mockTx.insert).mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      } as never);

      vi.mocked(mockTx.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi
          .fn()
          .mockResolvedValue([{ ...sampleQuestion, upvotes: 1 }]),
      } as never);

      const result = await service.upvoteQuestion('q-1', studentCtx);
      expect(result.upvotes).toBe(1);
    });

    it('is idempotent: second upvote no-ops via onConflictDoNothing', async () => {
      setupUpvoteMocks(1);

      const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
      vi.mocked(mockTx.insert).mockReturnValue({
        values: vi.fn().mockReturnThis(),
        onConflictDoNothing,
      } as never);
      vi.mocked(mockTx.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi
          .fn()
          .mockResolvedValue([{ ...sampleQuestion, upvotes: 1 }]),
      } as never);

      await service.upvoteQuestion('q-1', studentCtx);
      expect(onConflictDoNothing).toHaveBeenCalled();
    });

    it('throws NotFoundException when question not found', async () => {
      chainSelect([]);
      await expect(service.upvoteQuestion('q-1', studentCtx)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('answerQuestion', () => {
    it('sets status=ANSWERED and answer text', async () => {
      chainSelect([sampleQuestion]);
      vi.mocked(mockTx.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([
          {
            ...sampleQuestion,
            status: 'ANSWERED',
            answer: 'Because ontology',
          },
        ]),
      } as never);

      const result = await service.answerQuestion(
        'q-1',
        'Because ontology',
        instructorCtx
      );
      expect(result.status).toBe('ANSWERED');
      expect(result.answer).toBe('Because ontology');
    });

    it('throws ForbiddenException for non-instructor', async () => {
      await expect(
        service.answerQuestion('q-1', 'Answer', studentCtx)
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when question not found', async () => {
      chainSelect([]);
      await expect(
        service.answerQuestion('q-1', 'Answer', instructorCtx)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('dismissQuestion', () => {
    it('sets status=DISMISSED', async () => {
      chainSelect([sampleQuestion]);
      vi.mocked(mockTx.update).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi
          .fn()
          .mockResolvedValue([{ ...sampleQuestion, status: 'DISMISSED' }]),
      } as never);

      const result = await service.dismissQuestion('q-1', instructorCtx);
      expect(result.status).toBe('DISMISSED');
    });

    it('throws ForbiddenException for student', async () => {
      await expect(service.dismissQuestion('q-1', studentCtx)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('getQuestions', () => {
    it('returns questions sorted by upvotes DESC', async () => {
      const questions = [
        { ...sampleQuestion, id: 'q-2', upvotes: 5 },
        { ...sampleQuestion, id: 'q-1', upvotes: 2 },
      ];
      const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(questions),
      };
      vi.mocked(mockTx.select).mockReturnValue(chain as never);
      const result = await service.getQuestions('sess-1', instructorCtx);
      expect(result).toHaveLength(2);
      expect(result[0].upvotes).toBe(5);
    });

    it('filters by status when provided', async () => {
      const chain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([sampleQuestion]),
      };
      vi.mocked(mockTx.select).mockReturnValue(chain as never);
      const result = await service.getQuestions(
        'sess-1',
        studentCtx,
        'PENDING'
      );
      expect(result).toHaveLength(1);
    });
  });
});
