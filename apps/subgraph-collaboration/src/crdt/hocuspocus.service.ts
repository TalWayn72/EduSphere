import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  Server,
  type onAuthenticatePayload,
  type onConnectPayload,
  type onDisconnectPayload,
  type onLoadDocumentPayload,
  type onStoreDocumentPayload,
} from '@hocuspocus/server';
import { JWTValidator, type AuthContext } from '@edusphere/auth';
import { createDatabaseConnection, schema, eq, type Database } from '@edusphere/db';
import * as Y from 'yjs';

interface ConnectionContext {
  authContext?: AuthContext;
}

@Injectable()
export class HocuspocusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HocuspocusService.name);
  private server!: ReturnType<typeof Server.configure>;
  private db: Database;
  private jwtValidator: JWTValidator;

  constructor() {
    this.db = createDatabaseConnection();
    const keycloakUrl = process.env.KEYCLOAK_URL ?? 'http://localhost:8080';
    const realm = process.env.KEYCLOAK_REALM ?? 'edusphere';
    const clientId = process.env.KEYCLOAK_CLIENT_ID ?? 'edusphere-backend';
    this.jwtValidator = new JWTValidator(keycloakUrl, realm, clientId);
  }

  onModuleInit(): void {
    const port = parseInt(process.env.HOCUSPOCUS_PORT ?? '1234', 10);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    this.server = Server.configure({
      port,
      async onAuthenticate(data: onAuthenticatePayload) {
        const token = self.extractToken(data.requestParameters, data.token);
        if (!token) {
          self.logger.warn(`Auth rejected — no token for doc "${data.documentName}"`);
          throw new Error('Unauthorized: missing token');
        }

        try {
          const authContext = await self.jwtValidator.validate(token);
          (data.context as ConnectionContext).authContext = authContext;
          self.logger.debug(
            `Authenticated user ${authContext.userId} for doc "${data.documentName}"`
          );
          return data.context;
        } catch (err) {
          self.logger.warn(`Auth rejected — invalid JWT for doc "${data.documentName}": ${err}`);
          throw new Error('Unauthorized: invalid token');
        }
      },

      onConnect(data: onConnectPayload) {
        const ctx = data.context as ConnectionContext;
        self.logger.log(
          `User connected: ${ctx.authContext?.userId ?? 'unknown'} to doc "${data.documentName}"`
        );
      },

      onDisconnect(data: onDisconnectPayload) {
        const ctx = data.context as ConnectionContext;
        self.logger.log(
          `User disconnected: ${ctx.authContext?.userId ?? 'unknown'} from doc "${data.documentName}"`
        );
      },

      async onLoadDocument(data: onLoadDocumentPayload): Promise<Y.Doc> {
        return self.loadDocument(data);
      },

      async onStoreDocument(data: onStoreDocumentPayload): Promise<void> {
        return self.storeDocument(data);
      },
    });

    this.server
      .listen()
      .then(() => {
        this.logger.log(`Hocuspocus CRDT server listening on ws://0.0.0.0:${port}`);
      })
      .catch((err: unknown) => {
        this.logger.error('Failed to start Hocuspocus server', err);
      });
  }

  onModuleDestroy(): void {
    if (this.server) {
      this.server.destroy().catch((err: unknown) => {
        this.logger.warn('Error destroying Hocuspocus server', err);
      });
    }
  }

  private async loadDocument(data: onLoadDocumentPayload): Promise<Y.Doc> {
    const { documentName, document } = data;
    this.logger.debug(`Loading document: "${documentName}"`);

    try {
      const entityId = this.parseEntityId(documentName);
      const [row] = await this.db
        .select()
        .from(schema.collab_documents)
        .where(eq(schema.collab_documents.entity_id, entityId))
        .limit(1);

      if (row?.ydoc_snapshot) {
        Y.applyUpdate(document, row.ydoc_snapshot);
        this.logger.debug(
          `Document "${documentName}" restored (${row.ydoc_snapshot.length} bytes)`
        );
      } else {
        this.logger.debug(`Document "${documentName}" not in DB — starting fresh`);
      }
    } catch (err) {
      this.logger.warn(`Could not load document "${documentName}" from DB: ${err}`);
    }

    return document;
  }

  private async storeDocument(data: onStoreDocumentPayload): Promise<void> {
    const { documentName, document, context } = data;
    const snapshot = Buffer.from(Y.encodeStateAsUpdate(document));
    const entityId = this.parseEntityId(documentName);
    const ctx = context as ConnectionContext;

    this.logger.debug(`Storing document "${documentName}" (${snapshot.length} bytes)`);

    try {
      const [existing] = await this.db
        .select({ id: schema.collab_documents.id })
        .from(schema.collab_documents)
        .where(eq(schema.collab_documents.entity_id, entityId))
        .limit(1);

      if (existing) {
        await this.db
          .update(schema.collab_documents)
          .set({ ydoc_snapshot: snapshot })
          .where(eq(schema.collab_documents.id, existing.id));
      } else {
        const tenantId = ctx.authContext?.tenantId ?? '';
        await this.db.insert(schema.collab_documents).values({
          tenant_id: tenantId,
          entity_type: 'SHARED_CANVAS',
          entity_id: entityId,
          name: documentName,
          ydoc_snapshot: snapshot,
        });
      }
      this.logger.debug(`Document "${documentName}" stored successfully`);
    } catch (err) {
      this.logger.error(`Failed to persist document "${documentName}": ${err}`);
    }
  }

  private extractToken(
    params: URLSearchParams,
    headerToken?: string
  ): string | null {
    const paramToken = params.get('token');
    if (paramToken) return paramToken;

    if (headerToken?.startsWith('Bearer ')) return headerToken.substring(7);
    if (headerToken) return headerToken;

    const auth = params.get('authorization') ?? params.get('Authorization');
    if (auth?.startsWith('Bearer ')) return auth.substring(7);

    return null;
  }

  private parseEntityId(documentName: string): string {
    // Expected format: "discussion:<uuid>"
    const colonIndex = documentName.indexOf(':');
    return colonIndex !== -1 ? documentName.substring(colonIndex + 1) : documentName;
  }
}
