/**
 * XapiStatementService — F-028 xAPI / LRS Integration
 *
 * Responsibilities:
 *  1. Subscribe to EDUSPHERE.* NATS wildcard
 *  2. Map events → xAPI 1.0.3 statements
 *  3. Store locally in xapi_statements table (self-hosted LRS)
 *  4. Forward to external LRS if token has lrs_endpoint configured
 */
import {
  Injectable, Logger, OnModuleInit, OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  createDatabaseConnection, closeAllPools, schema, withTenantContext, eq, and, gte, lte,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { connect, StringCodec, type NatsConnection, type Subscription } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import type {
  XapiStatement, XapiQueryParams, XapiActor, XapiVerb, XapiObject, MappableNatsPayload,
} from './xapi.types.js';
import { SUBJECT_TO_VERB } from './xapi.types.js';

const NATS_WILDCARD = 'EDUSPHERE.*';
const LRS_FORWARD_TIMEOUT_MS = 5_000;

function makeActor(userId: string): XapiActor {
  return { objectType: 'Agent', name: userId, mbox: `mailto:${userId}@edusphere.local` };
}

function makeVerb(verbId: string): XapiVerb {
  return { id: verbId, display: { en: verbId.split('/').pop() ?? verbId } };
}

function makeObject(resourceId: string, name: string): XapiObject {
  return {
    objectType: 'Activity',
    id: `https://edusphere.io/activities/${resourceId}`,
    definition: { name: { en: name } },
  };
}

@Injectable()
export class XapiStatementService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(XapiStatementService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;
  private sub: Subscription | null = null;

  async onModuleInit(): Promise<void> {
    try {
      this.nc = await connect(buildNatsOptions());
      this.sub = this.nc.subscribe(NATS_WILDCARD);
      this.logger.log(`XapiStatementService: subscribed to ${NATS_WILDCARD}`);
      void this.processMessages();
    } catch (err) {
      this.logger.error({ err }, 'XapiStatementService: NATS connect failed');
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.sub?.unsubscribe();
    this.sub = null;
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    await closeAllPools();
    this.logger.log('XapiStatementService destroyed');
  }

  private async processMessages(): Promise<void> {
    if (!this.sub) return;
    for await (const msg of this.sub) {
      try {
        const raw = JSON.parse(this.sc.decode(msg.data)) as unknown;
        const statement = this.mapNatsToXapi(msg.subject, raw);
        if (statement && typeof (raw as MappableNatsPayload).tenantId === 'string') {
          const tenantId = (raw as MappableNatsPayload).tenantId;
          await this.storeStatement(tenantId, statement);
        }
      } catch (err) {
        this.logger.warn({ err }, 'XapiStatementService: failed to process message');
      }
    }
  }

  mapNatsToXapi(subject: string, payload: unknown): XapiStatement | null {
    const verbId = SUBJECT_TO_VERB[subject];
    if (!verbId) return null;

    const p = payload as MappableNatsPayload;
    if (!p.userId || !p.tenantId) return null;

    const resourceId = p.courseId ?? p.contentItemId ?? p.annotationId ?? p.followingId ?? p.userId;
    const name = p.courseTitle ?? resourceId;

    return {
      id: randomUUID(),
      actor: makeActor(p.userId),
      verb: makeVerb(verbId),
      object: makeObject(resourceId, name),
      timestamp: new Date().toISOString(),
    };
  }

  async storeStatement(tenantId: string, statement: XapiStatement): Promise<void> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' };
    await withTenantContext(this.db, ctx, async (tx) =>
      tx.insert(schema.xapiStatements).values({
        tenantId,
        statementId: statement.id,
        actor: statement.actor,
        verb: statement.verb,
        object: statement.object,
        result: statement.result ?? null,
        context: statement.context ?? null,
      }),
    );
  }

  async queryStatements(tenantId: string, params: XapiQueryParams): Promise<XapiStatement[]> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' };
    const limit = Math.min(params.limit ?? 20, 200);

    const rows = await withTenantContext(this.db, ctx, async (tx) => {
      const conditions = [eq(schema.xapiStatements.tenantId, tenantId)];
      if (params.since) conditions.push(gte(schema.xapiStatements.storedAt, new Date(params.since)));
      if (params.until) conditions.push(lte(schema.xapiStatements.storedAt, new Date(params.until)));
      return tx.select()
        .from(schema.xapiStatements)
        .where(and(...conditions))
        .limit(limit)
        .orderBy(schema.xapiStatements.storedAt);
    });

    return rows.map((r) => ({
      id: r.statementId,
      actor: r.actor as XapiStatement['actor'],
      verb: r.verb as XapiStatement['verb'],
      object: r.object as XapiStatement['object'],
      result: r.result as XapiStatement['result'],
      context: r.context as XapiStatement['context'],
      stored: r.storedAt.toISOString(),
    }));
  }

  async forwardToExternalLrs(lrsEndpoint: string, rawToken: string, statement: XapiStatement): Promise<void> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('LRS forward timeout')), LRS_FORWARD_TIMEOUT_MS),
    );
    const forward = fetch(`${lrsEndpoint}/statements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${rawToken}`,
        'X-Experience-API-Version': '1.0.3',
      },
      body: JSON.stringify(statement),
    });
    await Promise.race([forward, timeout]);
  }
}
