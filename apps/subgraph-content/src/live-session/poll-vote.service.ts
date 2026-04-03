import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';
import type { PollVotePayload } from '@edusphere/nats-client';

import type { PollResults } from './poll.service.js';

const NATS_POLL_VOTED = 'EDUSPHERE.poll.voted';

/**
 * Vote processing and results aggregation for live-session polls.
 * Extracted from PollService to keep each file under 300 lines.
 */
@Injectable()
export class PollVoteService implements OnModuleDestroy {
  private readonly logger = new Logger(PollVoteService.name);
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
      this.natsConn = await connect(buildNatsOptions());
    }
    return this.natsConn;
  }

  async vote(
    pollId: string,
    userId: string,
    optionIndex: number,
    tenantId: string
  ): Promise<void> {
    await withTenantContext(
      this.db,
      { tenantId, userId, userRole: 'STUDENT' },
      async (tx) => {
        const [existing] = await tx
          .select()
          .from(schema.pollVotes)
          .where(
            and(
              eq(schema.pollVotes.pollId, pollId),
              eq(schema.pollVotes.userId, userId)
            )
          )
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
      }
    );

    this.logger.log(
      `Vote recorded: pollId=${pollId} userId=${userId} option=${optionIndex}`
    );
    await this.publishVoteEvent(pollId, tenantId, optionIndex);
  }

  async getPollResults(
    pollId: string,
    tenantId: string,
    callerUserId: string
  ): Promise<PollResults> {
    const [poll] = await withTenantContext(
      this.db,
      { tenantId, userId: callerUserId, userRole: 'STUDENT' },
      async (tx) =>
        tx
          .select()
          .from(schema.sessionPolls)
          .where(
            and(
              eq(schema.sessionPolls.id, pollId),
              eq(schema.sessionPolls.tenantId, tenantId)
            )
          )
          .limit(1)
    );
    if (!poll) throw new NotFoundException(`Poll ${pollId} not found`);

    const votes = await withTenantContext(
      this.db,
      { tenantId, userId: callerUserId, userRole: 'INSTRUCTOR' },
      async (tx) =>
        tx
          .select()
          .from(schema.pollVotes)
          .where(
            and(
              eq(schema.pollVotes.pollId, pollId),
              eq(schema.pollVotes.tenantId, tenantId)
            )
          )
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
        count: counts.at(i) ?? 0,
        percentage:
          totalVotes > 0
            ? Math.round(((counts.at(i) ?? 0) / totalVotes) * 100)
            : 0,
      })),
    };
  }

  private async publishVoteEvent(
    pollId: string,
    tenantId: string,
    optionIndex: number
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
