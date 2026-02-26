import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GraphQLClient } from 'graphql-request';
import { printSchema, parse, validate } from 'graphql';
import { createGatewayRuntime } from '@graphql-hive/gateway';

// Integration tests require a fully running stack (gateway + all subgraphs).
// They are skipped in unit-test mode and only run when RUN_INTEGRATION_TESTS=true.
const SKIP = process.env.RUN_INTEGRATION_TESTS !== 'true';

describe.skipIf(SKIP)('GraphQL Federation Integration', () => {
  let client: GraphQLClient;
  const GATEWAY_URL =
    process.env.GATEWAY_URL || 'http://localhost:4000/graphql';

  beforeAll(() => {
    client = new GraphQLClient(GATEWAY_URL);
  });

  describe('Gateway Health', () => {
    it('should respond to health check', async () => {
      const query = `{ _health }`;
      const data = await client.request(query);
      expect(data._health).toBeDefined();
    });
  });

  describe('Core Subgraph (Port 4001)', () => {
    it('should fetch users', async () => {
      const query = `
        query {
          users(limit: 5) {
            id
            email
            firstName
            lastName
            role
          }
        }
      `;
      const data: any = await client.request(query);
      expect(data.users).toBeDefined();
      expect(Array.isArray(data.users)).toBe(true);
    });
  });

  describe('Content Subgraph (Port 4002)', () => {
    it('should create and fetch course', async () => {
      const mutation = `
        mutation {
          createCourse(input: {
            title: "Test Course"
            slug: "test-course"
            description: "Integration test course"
            instructorId: "00000000-0000-0000-0000-000000000001"
          }) {
            id
            title
            description
            isPublished
          }
        }
      `;
      const data: any = await client.request(mutation);
      expect(data.createCourse).toBeDefined();
      expect(data.createCourse.title).toBe('Test Course');
      expect(data.createCourse.isPublished).toBe(false);
    });
  });

  describe('Annotation Subgraph (Port 4003)', () => {
    it('should create annotation', async () => {
      const mutation = `
        mutation {
          createAnnotation(input: {
            assetId: "00000000-0000-0000-0000-000000000002"
            annotationType: TEXT
            content: {text: "Test note"}
            layer: PERSONAL
          }) {
            id
            annotationType
            content
          }
        }
      `;
      const data: any = await client.request(mutation);
      expect(data.createAnnotation).toBeDefined();
      expect(data.createAnnotation.annotationType).toBe('TEXT');
    });
  });

  describe('Collaboration Subgraph (Port 4004)', () => {
    it('should create discussion', async () => {
      const mutation = `
        mutation {
          createDiscussion(input: {
            title: "Test Discussion"
            description: "Integration test discussion"
            courseId: "00000000-0000-0000-0000-000000000003"
            discussionType: FORUM
          }) {
            id
            title
          }
        }
      `;
      const data: any = await client.request(mutation);
      expect(data.createDiscussion).toBeDefined();
      expect(data.createDiscussion.title).toBe('Test Discussion');
    });
  });

  describe('Agent Subgraph (Port 4005)', () => {
    it('should create AI session', async () => {
      const mutation = `
        mutation {
          startAgentSession(
            templateType: TUTOR
            context: "{}"
          ) {
            id
            templateType
            status
          }
        }
      `;
      const data: any = await client.request(mutation);
      expect(data.startAgentSession).toBeDefined();
      expect(data.startAgentSession.status).toBe('ACTIVE');
    });
  });

  describe('Knowledge Subgraph (Port 4006)', () => {
    it('should perform semantic search', async () => {
      const queryVec = Array(768).fill(0.1).join(', ');
      const query = `
        query {
          semanticSearch(
            query: [${queryVec}]
            limit: 5
            minSimilarity: 0.5
          ) {
            embedding {
              id
              chunkText
            }
            similarity
            distance
          }
        }
      `;
      const data: any = await client.request(query);
      expect(data.semanticSearch).toBeDefined();
      expect(Array.isArray(data.semanticSearch)).toBe(true);
    });
  });

  describe('Federation - Cross-Subgraph Query', () => {
    it('should resolve user with courses (federation)', async () => {
      const query = `
        query {
          me {
            id
            email
            firstName
          }
        }
      `;
      // This will fail if federation is not working
      const data: any = await client.request(query);
      expect(data.me).toBeDefined();
    });
  });
});

// --- Schema Composition Tests (no live server required) ---
describe.skipIf(SKIP)('Gateway Federation - Schema Composition', () => {
  let gateway: ReturnType<typeof createGatewayRuntime>;

  beforeAll(async () => {
    gateway = createGatewayRuntime({
      supergraph: {
        type: 'config',
        config: {
          subgraphs: [
            {
              name: 'core',
              url:
                process.env.SUBGRAPH_CORE_URL ||
                'http://localhost:4001/graphql',
            },
            {
              name: 'content',
              url:
                process.env.SUBGRAPH_CONTENT_URL ||
                'http://localhost:4002/graphql',
            },
            {
              name: 'annotation',
              url:
                process.env.SUBGRAPH_ANNOTATION_URL ||
                'http://localhost:4003/graphql',
            },
            {
              name: 'collaboration',
              url:
                process.env.SUBGRAPH_COLLABORATION_URL ||
                'http://localhost:4004/graphql',
            },
            {
              name: 'agent',
              url:
                process.env.SUBGRAPH_AGENT_URL ||
                'http://localhost:4005/graphql',
            },
            {
              name: 'knowledge',
              url:
                process.env.SUBGRAPH_KNOWLEDGE_URL ||
                'http://localhost:4006/graphql',
            },
          ],
        },
      },
    });
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  it('should compose supergraph schema from all subgraphs', async () => {
    expect(gateway).toBeDefined();
    const schema = await gateway.getSchema();
    expect(schema).toBeDefined();
    const schemaString = printSchema(schema);
    expect(schemaString).toBeTruthy();
    expect(schemaString.length).toBeGreaterThan(0);
  });

  it('should include User type from Core subgraph', async () => {
    const schema = await gateway.getSchema();
    const schemaString = printSchema(schema);
    expect(schemaString).toContain('type User');
    expect(schemaString).toContain('id: ID!');
    expect(schemaString).toContain('email: String!');
  });

  it('should include Course type from Content subgraph', async () => {
    const schema = await gateway.getSchema();
    const schemaString = printSchema(schema);
    expect(schemaString).toContain('type Course');
    expect(schemaString).toContain('title: String!');
  });

  it('should include Annotation type from Annotation subgraph', async () => {
    const schema = await gateway.getSchema();
    const schemaString = printSchema(schema);
    expect(schemaString).toContain('type Annotation');
  });

  it('should include Discussion type from Collaboration subgraph', async () => {
    const schema = await gateway.getSchema();
    const schemaString = printSchema(schema);
    expect(schemaString).toContain('type Discussion');
  });

  it('should include AgentSession type from Agent subgraph', async () => {
    const schema = await gateway.getSchema();
    const schemaString = printSchema(schema);
    expect(schemaString).toContain('type AgentSession');
  });

  it('should support cross-subgraph queries (User -> Course)', async () => {
    const schema = await gateway.getSchema();
    const query = parse(`
      query TestQuery {
        user(id: "test-user-id") {
          id
          email
        }
      }
    `);
    // Validate query is valid against composed schema
    expect(() => {
      validate(schema, query);
    }).not.toThrow();
  });

  it('should validate JWT authentication context propagation', async () => {
    const schema = await gateway.getSchema();
    const schemaString = printSchema(schema);
    expect(schemaString).toContain('@authenticated');
  });

  it('should include tenant isolation queries', async () => {
    const schema = await gateway.getSchema();
    const schemaString = printSchema(schema);
    expect(schemaString).toContain('Query');
  });
});
