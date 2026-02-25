import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { connect, StringCodec, type NatsConnection } from 'nats';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';
import type { PollVotePayload } from '@edusphere/nats-client';

const NATS_POLL_VOTED = 'EDUSPHERE.poll.voted';

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
  private readonly sc = StringCodec();
  private natsConn: NatsConnection | null = null;

  async onModuleDestroy(): Promise<void> {
    if (this.natsConn) {
      await this.natsConn.drain().catch(() => undefined);
      this.natsConn = null;
    }
    await closeAllPools();
  }

  private async getNats(): Promise<NatsConnection> {
    if (!this.natsConn) {
      const natsUrl = process.env.NATS_URL ?? 'nats://localhost:4222';
      this.natsConn = await connect({ servers: natsUrl });
    }
    return this.natsConn;
  }

  async createPoll(
    sessionId: string,
    question: string,
    options: string[],
    tenantId: string,
    callerUserId: string,
  ): Promise<SessionPollResult> {
    const [poll] = await withTenantContext(
      this.db,
      { tenantId, userId: callerUserId, userRole: 'INSTRUCTOR' },
      async (tx) =>
        tx
          .insert(schema.sessionPolls)
          .values({ sessionId, tenantId, question, options })
          .returning(),
    );
    if (!poll) throw new Error('Failed to insert poll');
    this.logger.log(`Poll created: pollId=${poll.id} sessionId=${sessionId}`);
    return this.mapPoll(poll);
  }

  async activatePoll(
    pollId: string,
    tenantId: string,
    callerUserId: string,
  ): Promise<SessionPollResult> {
    const [updated] = await withTenantContext(
      this.db,
      { tenantId, userId: callerUserId, userRole: 'INSTRUCTOR' },
      async (tx) =>
        tx
          .update(schema.sessionPolls)
          .set({ isActive: true })
          .where(and(eq(schema.sessionPolls.id, pollId), eq(schema.sessionPolls.tenantId, tenantId)))
          .returning(),
    );
    if (!updated) throw new NotFoundException(`Poll ${pollId} not found`);
    this.logger.log(`Poll activated: pollId=${pollId}`);
    return this.mapPoll(updated);
  }

  async closePoll(
    pollId: string,
    tenantId: string,
    callerUserId: string,
  ): Promise<PollResults> {
    const [updated] = await withTenantContext(
      this.db,
      { tenantId, userId: callerUserId, userRole: 'INSTRUCTOR' },
      async (tx) =>
        tx
          .update(schema.sessionPolls)
          .set({ isActive: false, closedAt: new Date() })
          .where(and(eq(schema.sessionPolls.id, pollId), eq(schema.sessionPolls.tenantId, tenantId)))
          .returning(),
    );
    if (!updated) throw new NotFoundException(`Poll ${pollId} not found`);
    this.logger.log(`Poll closed: pollId=${pollId}`);
    return this.getPollResults(pollId, tenantId, callerUserId);
  }

  async vote(
    pollId: string,
    userId: string,
    optionIndex: number,
    tenantId: string,
  ): Promise<void> {
    await withTenantContext(
      this.db,
      { tenantId, userId, userRole: 'STUDENT' },
      async (tx) => {
        // Upsert: if user already voted, update; otherwise insert
        const [existing] = await tx
          .select()
          .from(schema.pollVotes)
          .where(and(eq(schema.pollVotes.pollId, pollId), eq(schema.pollVotes.userId, userId)))
          .limit(1);

        if (existing) {
          await tx
            .update(schema.pollVotes)
            .set({ optionIndex, votedAt: new Date() })
            .where(eq(schema.pollVotes.id, existing.id));
        } else {
          await tx
            .insert(schema.pollVotes)
            .values({ pollId, userId, tenantId, optionIndex });
        }
      },
    );

    this.logger.log(`Vote recorded: pollId=${pollId} userId=${userId} option=${optionIndex}`);
    await this.publishVoteEvent(pollId, tenantId, optionIndex);
  }

  async getPollResults(
    pollId: string,
    tenantId: string,
    callerUserId: string,
  ): Promise<PollResults> {
    const [poll] = await withTenantContext(
      this.db,
      { tenantId, userId: callerUserId, userRole: 'STUDENT' },
      async (tx) =>
        tx
          .select()
          .from(schema.sessionPolls)
          .where(and(eq(schema.sessionPolls.id, pollId), eq(schema.sessionPolls.tenantId, tenantId)))
          .limit(1),
    );
    if (!poll) throw new NotFoundException(`Poll ${pollId} not found`);

    const votes = await withTenantContext(
      this.db,
      { tenantId, userId: callerUserId, userRole: 'INSTRUCTOR' },
      async (tx) =>
        tx
          .select()
          .from(schema.pollVotes)
          .where(and(eq(schema.pollVotes.pollId, pollId), eq(schema.pollVotes.tenantId, tenantId))),
    );

    const optionTexts = poll.options as string[];
    const totalVotes = votes.length;
    const counts = new Array<number>(optionTexts.length).fill(0);
    for (const v of votes) {
      if (v.optionIndex >= 0 && v.optionIndex < counts.length) {
        (counts[v.optionIndex] as number)++;
      }
    }

    return {
      pollId,
      question: poll.question,
      totalVotes,
      options: optionTexts.map((text, i) => ({
        text,
        count: counts[i] ?? 0,
        percentage: totalVotes > 0 ? Math.round(((counts[i] ?? 0) / totalVotes) * 100) : 0,
      })),
    };
  }

  async listPolls(
    sessionId: string,
    tenantId: string,
    callerUserId: string,
  ): Promise<SessionPollResult[]> {
    const rows = await withTenantContext(
      this.db,
      { tenantId, userId: callerUserId, userRole: 'STUDENT' },
      async (tx) =>
        tx
          .select()
          .from(schema.sessionPolls)
          .where(and(eq(schema.sessionPolls.sessionId, sessionId), eq(schema.sessionPolls.tenantId, tenantId))),
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

  private async publishVoteEvent(
    pollId: string,
    tenantId: string,
    optionIndex: number,
  ): Promise<void> {
    try {
      const votes = await this.db
        .select()
        .from(schema.pollVotes)
        .where(eq(schema.pollVotes.pollId, pollId));

      const resultMap = new Map<number, number>();
      for (const v of votes) {
        resultMap.set(v.optionIndex, (resultMap.get(v.optionIndex) ?? 0) + 1);
      }

      const [poll] = await this.db
        .select()
        .from(schema.sessionPolls)
        .where(eq(schema.sessionPolls.id, pollId))
        .limit(1);

      const payload: PollVotePayload = {
        pollId,
        sessionId: poll?.sessionId ?? '',
        tenantId,
        optionIndex,
        totalVotes: votes.length,
        results: Array.from(resultMap.entries()).map(([idx, count]) => ({
          optionIndex: idx,
          count,
        })),
      };

      const nc = await this.getNats();
      nc.publish(NATS_POLL_VOTED, this.sc.encode(JSON.stringify(payload)));
    } catch (err) {
      this.logger.warn(`Failed to publish NATS poll.voted event: ${err}`);
    }
  }
}
