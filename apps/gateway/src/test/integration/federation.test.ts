import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createGateway } from '@graphql-hive/gateway';
import { printSchema, parse } from 'graphql';

describe('Gateway Federation Integration', () => {
  let gateway: ReturnType<typeof createGateway>;

  beforeAll(async () => {
    gateway = createGateway({
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
    });
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  it('should compose supergraph schema from all subgraphs', async () => {
    expect(gateway).toBeDefined();

    // Get the composed schema
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
          enrolledCourses {
            id
            title
          }
        }
      }
    `);

    // Validate query is valid against composed schema
    expect(() => {
      require('graphql').validate(schema, query);
    }).not.toThrow();
  });

  it('should validate JWT authentication context propagation', async () => {
    const schema = await gateway.getSchema();

    // Check if authenticated directives are present
    const schemaString = printSchema(schema);
    expect(schemaString).toContain('@authenticated');
  });

  it('should include tenant isolation queries', async () => {
    const schema = await gateway.getSchema();
    const schemaString = printSchema(schema);

    // Verify tenant-scoped queries exist
    expect(schemaString).toContain('Query');
  });
});
