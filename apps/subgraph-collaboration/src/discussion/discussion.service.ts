/**
 * DiscussionService — Facade that delegates to DiscussionThreadService
 * and DiscussionMessageService. Preserves the original public API
 * so that all existing imports continue to work unchanged.
 */
import {
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type {
  CreateDiscussionInput,
  AddMessageInput,
} from './discussion.schemas';
import { DiscussionThreadService } from './discussion-thread.service';
import { DiscussionMessageService } from './discussion-message.service';

@Injectable()
export class DiscussionService implements OnModuleDestroy {
  constructor(
    private readonly threads: DiscussionThreadService,
    private readonly messages: DiscussionMessageService,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.threads.onModuleDestroy();
  }

  // Thread operations
  async findDiscussionById(id: string, authContext: AuthContext) {
    return this.threads.findDiscussionById(id, authContext);
  }

  async findDiscussionsByCourse(
    courseId: string,
    limit: number,
    offset: number,
    authContext: AuthContext
  ) {
    return this.threads.findDiscussionsByCourse(courseId, limit, offset, authContext);
  }

  async createDiscussion(input: CreateDiscussionInput, authContext: AuthContext) {
    return this.threads.createDiscussion(input, authContext);
  }

  async findDiscussionsByUser(limit: number, offset: number, authContext: AuthContext) {
    return this.threads.findDiscussionsByUser(limit, offset, authContext);
  }

  // Message operations
  async findMessagesByDiscussion(
    discussionId: string,
    limit: number,
    offset: number,
    authContext: AuthContext
  ) {
    return this.messages.findMessagesByDiscussion(discussionId, limit, offset, authContext);
  }

  async findMessageById(id: string, authContext: AuthContext) {
    return this.messages.findMessageById(id, authContext);
  }

  async findRepliesByParent(
    parentId: string,
    limit: number,
    offset: number,
    authContext: AuthContext
  ) {
    return this.messages.findRepliesByParent(parentId, limit, offset, authContext);
  }

  async countReplies(parentId: string, authContext: AuthContext) {
    return this.messages.countReplies(parentId, authContext);
  }

  async addMessage(
    discussionId: string,
    input: AddMessageInput,
    authContext: AuthContext
  ) {
    return this.messages.addMessage(discussionId, input, authContext);
  }

  async countMessages(discussionId: string, authContext: AuthContext) {
    return this.messages.countMessages(discussionId, authContext);
  }

  // Participant operations
  async findParticipantsByDiscussion(discussionId: string, authContext: AuthContext) {
    return this.threads.findParticipantsByDiscussion(discussionId, authContext);
  }

  async countParticipants(discussionId: string, authContext: AuthContext) {
    return this.threads.countParticipants(discussionId, authContext);
  }

  async joinDiscussion(discussionId: string, authContext: AuthContext) {
    return this.threads.joinDiscussion(discussionId, authContext);
  }

  async leaveDiscussion(discussionId: string, authContext: AuthContext) {
    return this.threads.leaveDiscussion(discussionId, authContext);
  }
}
