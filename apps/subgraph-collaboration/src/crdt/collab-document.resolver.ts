/**
 * CollabDocumentResolver — Resolves compactCollabDocument mutation.
 */
import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { CollabDocumentService } from './collab-document.service';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver('CollabDocument')
export class CollabDocumentResolver {
  private readonly logger = new Logger(CollabDocumentResolver.name);

  constructor(private readonly collabDocumentService: CollabDocumentService) {}

  @Mutation('compactCollabDocument')
  async compactCollabDocument(
    @Args('documentId') documentId: string,
    @Context() context: GraphQLContext
  ) {
    if (!context.authContext) {
      throw new Error('Unauthenticated');
    }

    this.logger.log(
      { documentId, userId: context.authContext.userId },
      '[CollabDocumentResolver] compactCollabDocument'
    );

    return this.collabDocumentService.compactDocument(documentId);
  }
}
