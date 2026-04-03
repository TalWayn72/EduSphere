/**
 * Shared test helpers for DiscussionService tests.
 * Creates properly-wired DiscussionService with DI dependencies.
 */
import { DiscussionService } from './discussion.service';
import { DiscussionThreadService } from './discussion-thread.service';
import { DiscussionMessageService } from './discussion-message.service';

export function createDiscussionService(): DiscussionService {
  const threads = new DiscussionThreadService();
  const messages = new DiscussionMessageService(threads);
  return new DiscussionService(threads, messages);
}
