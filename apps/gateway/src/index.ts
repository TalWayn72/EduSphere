import { createGateway } from '@graphql-hive/gateway';
import { createYoga } from 'graphql-yoga';
import { createServer } from 'http';
import pino from 'pino';

const logger = pino({ 
  transport: { target: 'pino-pretty' },
  level: 'info'
});

const gateway = createGateway({
  supergraph: {
    type: 'config',
    config: {
      subgraphs: [
        {
          name: 'core',
          url: process.env.SUBGRAPH_CORE_URL || 'http://localhost:4001/graphql',
        },
        {
          name: 'content',
          url: process.env.SUBGRAPH_CONTENT_URL || 'http://localhost:4002/graphql',
        },
        {
          name: 'annotation',
          url: process.env.SUBGRAPH_ANNOTATION_URL || 'http://localhost:4003/graphql',
        },
        {
          name: 'collaboration',
          url: process.env.SUBGRAPH_COLLABORATION_URL || 'http://localhost:4004/graphql',
        },
        {
          name: 'agent',
          url: process.env.SUBGRAPH_AGENT_URL || 'http://localhost:4005/graphql',
        },
        {
          name: 'knowledge',
          url: process.env.SUBGRAPH_KNOWLEDGE_URL || 'http://localhost:4006/graphql',
        },
      ],
    },
  },
  additionalResolvers: [],
});

const yoga = createYoga({
  gateway,
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  },
  logging: logger,
  context: async ({ request }) => {
    const authHeader = request.headers.get('authorization');
    let tenantId = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          tenantId = payload.tenant_id;
        }
      } catch (error) {
        logger.warn('Failed to extract tenant_id from JWT', error);
      }
    }
    
    return {
      headers: {
        authorization: authHeader,
        'x-tenant-id': tenantId,
      },
    };
  },
});

const port = parseInt(process.env.PORT || '4000');
const server = createServer(yoga);

server.listen(port, () => {
  logger.info(`🚀 Gateway running on http://localhost:${port}/graphql`);
  logger.info(`📊 GraphQL Playground available`);
});
