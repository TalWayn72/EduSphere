import {
  Resolver,
  Query,
  Mutation,
  Subscription,
  Args,
  Context,
  Int,
} from '@nestjs/graphql';
import { connect, StringCodec, type NatsConnection } from 'nats';
import {
  BreakoutService,
  type CreateBreakoutRoomInput,
} from './breakout.service';
import { PollService } from './poll.service';
import type { PollVotePayload } from '@edusphere/nats-client';
import type { GraphQLContext } from '../auth/auth.middleware';

const NATS_POLL_VOTED = 'EDUSPHERE.poll.voted';

@Resolver()
export class LiveSessionExtensionsResolver {
  private readonly sc = StringCodec();
  private natsConn: NatsConnection | null = null;

  constructor(
    private readonly breakoutService: BreakoutService,
    private readonly pollService: PollService
  ) {}

  private userId(ctx: GraphQLContext): string {
    return ctx.authContext?.userId ?? '';
  }

  private tenantId(ctx: GraphQLContext): string {
    if (ctx.authContext?.tenantId) return ctx.authContext.tenantId;
    const header = ctx.req?.headers?.['x-tenant-id'];
    return (Array.isArray(header) ? header[0] : header) ?? '';
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  @Query('breakoutRooms')
  async breakoutRooms(
    @Args('sessionId') sessionId: string,
    @Context() ctx: GraphQLContext
  ) {
    return this.breakoutService.listRooms(
      sessionId,
      this.tenantId(ctx),
      this.userId(ctx)
    );
  }

  @Query('sessionPolls')
  async sessionPolls(
    @Args('sessionId') sessionId: string,
    @Context() ctx: GraphQLContext
  ) {
    return this.pollService.listPolls(
      sessionId,
      this.tenantId(ctx),
      this.userId(ctx)
    );
  }

  @Query('pollResults')
  async pollResults(
    @Args('pollId') pollId: string,
    @Context() ctx: GraphQLContext
  ) {
    return this.pollService.getPollResults(
      pollId,
      this.tenantId(ctx),
      this.userId(ctx)
    );
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  @Mutation('createBreakoutRooms')
  async createBreakoutRooms(
    @Args('sessionId') sessionId: string,
    @Args('rooms') rooms: CreateBreakoutRoomInput[],
    @Context() ctx: GraphQLContext
  ) {
    return this.breakoutService.createBreakoutRooms(
      sessionId,
      rooms,
      this.tenantId(ctx),
      this.userId(ctx)
    );
  }

  @Mutation('createPoll')
  async createPoll(
    @Args('sessionId') sessionId: string,
    @Args('question') question: string,
    @Args('options') options: string[],
    @Context() ctx: GraphQLContext
  ) {
    return this.pollService.createPoll(
      sessionId,
      question,
      options,
      this.tenantId(ctx),
      this.userId(ctx)
    );
  }

  @Mutation('activatePoll')
  async activatePoll(
    @Args('pollId') pollId: string,
    @Context() ctx: GraphQLContext
  ) {
    return this.pollService.activatePoll(
      pollId,
      this.tenantId(ctx),
      this.userId(ctx)
    );
  }

  @Mutation('closePoll')
  async closePoll(@Args('pollId') pollId: string, @Context() ctx: GraphQLContext) {
    return this.pollService.closePoll(
      pollId,
      this.tenantId(ctx),
      this.userId(ctx)
    );
  }

  @Mutation('votePoll')
  async votePoll(
    @Args('pollId') pollId: string,
    @Args('optionIndex', { type: () => Int }) optionIndex: number,
    @Context() ctx: GraphQLContext
  ): Promise<boolean> {
    await this.pollService.vote(
      pollId,
      this.userId(ctx),
      optionIndex,
      this.tenantId(ctx)
    );
    return true;
  }

  // ── Subscription ───────────────────────────────────────────────────────────

  @Subscription('pollUpdated', {
    filter: (payload: PollVotePayload, variables: { pollId: string }) =>
      payload.pollId === variables.pollId,
  })
  async *pollUpdated(@Args('pollId') _pollId: string): AsyncGenerator<unknown> {
    const natsUrl = process.env.NATS_URL ?? 'nats://localhost:4222';
    if (!this.natsConn) {
      this.natsConn = await connect({ servers: natsUrl });
    }
    const sub = this.natsConn.subscribe(NATS_POLL_VOTED);
    for await (const msg of sub) {
      const payload = JSON.parse(this.sc.decode(msg.data)) as PollVotePayload;
      yield { pollUpdated: payload };
    }
  }
}
