/**
 * LiveBookmarkResolver — Query and Mutation resolvers for LiveBookmark.
 */
import type { IncomingMessage } from 'http';
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import { LiveBookmarkService } from './live-bookmark.service';

interface GraphQLContext {
  req: IncomingMessage;
  authContext?: AuthContext;
}

@Resolver('LiveBookmark')
export class LiveBookmarkResolver {
  private readonly logger = new Logger(LiveBookmarkResolver.name);

  constructor(private readonly bookmarkService: LiveBookmarkService) {}

  @Query('liveBookmarks')
  async getLiveBookmarks(
    @Args('sessionId') sessionId: string,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.bookmarkService.getBookmarks(sessionId, context.authContext);
  }

  @Mutation('addLiveBookmark')
  async addLiveBookmark(
    @Args('sessionId') sessionId: string,
    @Args('streamTs') streamTs: number,
    @Args('label') label: string | undefined,
    @Args('note') note: string | undefined,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.bookmarkService.addBookmark(
      sessionId,
      streamTs,
      context.authContext,
      label,
      note
    );
  }

  @Mutation('removeLiveBookmark')
  async removeLiveBookmark(
    @Args('bookmarkId') bookmarkId: string,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) throw new Error('Unauthenticated');
    return this.bookmarkService.removeBookmark(bookmarkId, context.authContext);
  }
}
