import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  connect,
  StringCodec,
  type NatsConnection,
  type Subscription,
} from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { XapiStatementService } from './xapi-statement.service.js';
import { natsToXapiStatement } from './xapi-verb-mappings.js';
import { randomUUID } from 'crypto';

const BRIDGE_SUBJECTS = [
  'EDUSPHERE.course.completed',
  'EDUSPHERE.course.enrolled',
  'EDUSPHERE.sessions.ended',
  'EDUSPHERE.sessions.participant.joined',
  'EDUSPHERE.submission.created',
  'EDUSPHERE.poll.voted',
] as const;

@Injectable()
export class XapiNatsBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(XapiNatsBridgeService.name);
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;
  private readonly subscriptions: Subscription[] = [];

  constructor(private readonly statementService: XapiStatementService) {}

  async onModuleInit(): Promise<void> {
    try {
      this.nc = await connect(buildNatsOptions());
      for (const subject of BRIDGE_SUBJECTS) {
        const sub = this.nc.subscribe(subject);
        this.subscriptions.push(sub);
        void this.processMessages(subject, sub);
      }
      this.logger.log(
        `XapiNatsBridgeService: subscribed to ${BRIDGE_SUBJECTS.length} subjects`
      );
    } catch (err) {
      this.logger.error(
        { err },
        'XapiNatsBridgeService: NATS connect failed — bridge inactive'
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const sub of this.subscriptions) {
      sub.unsubscribe();
    }
    this.subscriptions.length = 0;
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    this.logger.log('XapiNatsBridgeService destroyed — all subscriptions closed');
  }

  private async processMessages(
    subject: string,
    sub: Subscription
  ): Promise<void> {
    for await (const msg of sub) {
      try {
        const payload = JSON.parse(
          this.sc.decode(msg.data)
        ) as Record<string, unknown>;

        const tenantId = payload['tenantId'];
        const userId = payload['userId'];

        if (typeof tenantId !== 'string' || typeof userId !== 'string') {
          this.logger.warn(
            `XapiNatsBridgeService: skipping ${subject} — missing tenantId or userId`
          );
          continue;
        }

        const statement = natsToXapiStatement(subject, payload);
        const statementWithId = { id: randomUUID(), ...statement } as Parameters<
          typeof this.statementService.storeStatement
        >[1];

        await this.statementService.storeStatement(tenantId, statementWithId);
      } catch (err) {
        this.logger.error(
          { err },
          `XapiNatsBridgeService: failed to process message on ${subject}`
        );
      }
    }
  }
}
