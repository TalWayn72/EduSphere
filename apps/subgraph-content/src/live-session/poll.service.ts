import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';

import { PollVoteService } from './poll-vote.service.js';

export interface PollOptionResult {
  text: string;
  count: number;
  percentage: number;
}

export interface PollResults {
  pollId: string;
  question: string;
  options: PollOptionResult[];
  totalVotes: number;
}

export interface SessionPollResult {
  id: string;
  sessionId: string;
  question: string;
  options: string[];
  isActive: boolean;
}

@Injectable()
export class PollService implements OnModuleDestroy {
  private readonly logger = new Logger(PollService.name);
  private readonly db = createDatabaseConnection();

  constructor(private readonly voteService: PollVoteService) {}

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async createPoll(
    sessionId: string,
    question: string,
    options: string[],
    tenantId: string,
    callerUserId: string
  ): Promise<SessionPollResult> {
    const [poll] = await withTenantContext(
      this.db,
      { tenantId, userId: callerUserId, userRole: 'INSTRUCTOR' },
      async (tx) =>
        tx
          .insert(schema.sessionPolls)
          .values({ sessionId, tenantId, question, options })
          .returning()
    );
    if (!poll) throw new InternalServerErrorException('Failed to insert poll');
    this.logger.log(`Poll created: pollId=${poll.id} sessionId=${sessionId}`);
    return this.mapPoll(poll);
  }

  async activatePoll(
    pollId: string,
    tenantId: string,
    callerUserId: string
  ): Promise<SessionPollResult> {
    const [updated] = await withTenantContext(
      this.db,
      { tenantId, userId: callerUserId, userRole: 'INSTRUCTOR' },
      async (tx) =>
        tx
          .update(schema.sessionPolls)
          .set({ isActive: true })
          .where(
            and(
              eq(schema.sessionPolls.id, pollId),
              eq(schema.sessionPolls.tenantId, tenantId)
            )
          )
          .returning()
    );
    if (!updated) throw new NotFoundException(`Poll ${pollId} not found`);
    this.logger.log(`Poll activated: pollId=${pollId}`);
    return this.mapPoll(updated);
  }

  async closePoll(
    pollId: string,
    tenantId: string,
    callerUserId: string
  ): Promise<PollResults> {
    const [updated] = await withTenantContext(
      this.db,
      { tenantId, userId: callerUserId, userRole: 'INSTRUCTOR' },
      async (tx) =>
        tx
          .update(schema.sessionPolls)
          .set({ isActive: false, closedAt: new Date() })
          .where(
            and(
              eq(schema.sessionPolls.id, pollId),
              eq(schema.sessionPolls.tenantId, tenantId)
            )
          )
          .returning()
    );
    if (!updated) throw new NotFoundException(`Poll ${pollId} not found`);
    this.logger.log(`Poll closed: pollId=${pollId}`);
    return this.voteService.getPollResults(pollId, tenantId, callerUserId);
  }

  // Delegation methods — forwarded to PollVoteService
  async vote(
    pollId: string,
    userId: string,
    optionIndex: number,
    tenantId: string
  ) {
    return this.voteService.vote(pollId, userId, optionIndex, tenantId);
  }

  async getPollResults(pollId: string, tenantId: string, callerUserId: string) {
    return this.voteService.getPollResults(pollId, tenantId, callerUserId);
  }

  async listPolls(
    sessionId: string,
    tenantId: string,
    callerUserId: string
  ): Promise<SessionPollResult[]> {
    const rows = await withTenantContext(
      this.db,
      { tenantId, userId: callerUserId, userRole: 'STUDENT' },
      async (tx) =>
        tx
          .select()
          .from(schema.sessionPolls)
          .where(
            and(
              eq(schema.sessionPolls.sessionId, sessionId),
              eq(schema.sessionPolls.tenantId, tenantId)
            )
          )
    );
    return rows.map((r) => this.mapPoll(r));
  }

  private mapPoll(row: {
    id: string;
    sessionId: string;
    question: string;
    options: unknown;
    isActive: boolean;
  }): SessionPollResult {
    return {
      id: row.id,
      sessionId: row.sessionId,
      question: row.question,
      options: row.options as string[],
      isActive: row.isActive,
    };
  }
}
