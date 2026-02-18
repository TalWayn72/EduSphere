import Redis from 'ioredis';

export interface PubSubMessage<T = any> {
  event: string;
  data: T;
  timestamp: number;
  tenantId?: string;
}

export class RedisPubSub {
  private publisher: Redis;
  private subscriber: Redis;
  private listeners: Map<string, Set<(message: PubSubMessage) => void>>;

  constructor(redisUrl: string = 'redis://localhost:6379') {
    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
    this.listeners = new Map();

    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });
  }

  /**
   * Publish event to channel
   */
  async publish<T>(
    channel: string,
    event: string,
    data: T,
    tenantId?: string
  ): Promise<void> {
    const message: PubSubMessage<T> = {
      event,
      data,
      timestamp: Date.now(),
      tenantId,
    };

    await this.publisher.publish(channel, JSON.stringify(message));
  }

  /**
   * Subscribe to channel
   */
  async subscribe(
    channel: string,
    callback: (message: PubSubMessage) => void
  ): Promise<void> {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
      await this.subscriber.subscribe(channel);
    }

    this.listeners.get(channel)!.add(callback);
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(
    channel: string,
    callback?: (message: PubSubMessage) => void
  ): Promise<void> {
    if (!this.listeners.has(channel)) return;

    if (callback) {
      this.listeners.get(channel)!.delete(callback);
    }

    if (!callback || this.listeners.get(channel)!.size === 0) {
      this.listeners.delete(channel);
      await this.subscriber.unsubscribe(channel);
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(channel: string, message: string): void {
    const listeners = this.listeners.get(channel);
    if (!listeners) return;

    try {
      const parsed: PubSubMessage = JSON.parse(message);
      listeners.forEach((callback) => callback(parsed));
    } catch (error) {
      console.error('Failed to parse PubSub message:', error);
    }
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.publisher.quit();
    await this.subscriber.quit();
  }
}

// Singleton instance
let pubSubInstance: RedisPubSub | null = null;

export function getPubSub(redisUrl?: string): RedisPubSub {
  if (!pubSubInstance) {
    pubSubInstance = new RedisPubSub(redisUrl);
  }
  return pubSubInstance;
}

// Event channels
export const CHANNELS = {
  COURSE_UPDATES: 'course:updates',
  DISCUSSION_UPDATES: 'discussion:updates',
  AGENT_MESSAGES: 'agent:messages',
  ANNOTATION_UPDATES: 'annotation:updates',
  USER_UPDATES: 'user:updates',
  KNOWLEDGE_UPDATES: 'knowledge:updates',
} as const;

// Event types
export const EVENTS = {
  COURSE_CREATED: 'course.created',
  COURSE_UPDATED: 'course.updated',
  COURSE_PUBLISHED: 'course.published',
  DISCUSSION_CREATED: 'discussion.created',
  DISCUSSION_UPDATED: 'discussion.updated',
  DISCUSSION_UPVOTED: 'discussion.upvoted',
  AGENT_MESSAGE_CREATED: 'agent.message.created',
  ANNOTATION_CREATED: 'annotation.created',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
} as const;
