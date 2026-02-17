import { Injectable, Logger } from '@nestjs/common';

export interface AgentEvent {
  type: 'session.created' | 'session.completed' | 'message.created';
  sessionId: string;
  userId: string;
  tenantId?: string;
  data: any;
  timestamp: Date;
}

@Injectable()
export class NatsService {
  private readonly logger = new Logger(NatsService.name);

  async publish(event: AgentEvent): Promise<void> {
    // TODO: Implement NATS JetStream publishing
    // For now, just log the event
    this.logger.debug(`[NATS Event] ${event.type} - Session: ${event.sessionId}`);
  }

  async subscribe(subject: string, handler: (event: AgentEvent) => Promise<void>): Promise<void> {
    // TODO: Implement NATS JetStream subscription
    this.logger.debug(`[NATS Subscribe] ${subject}`);
  }
}
