import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GraphQLClient } from 'graphql-request';

describe('GraphQL Federation Integration', () => {
  let client: GraphQLClient;
  const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000/graphql';

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
            description: "Integration test course"
            tenantId: "00000000-0000-0000-0000-000000000001"
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
            type: NOTE
            content: "Test note"
            targetType: "COURSE"
            targetId: "test-course-123"
            userId: "00000000-0000-0000-0000-000000000001"
            tenantId: "00000000-0000-0000-0000-000000000001"
          }) {
            id
            type
            content
          }
        }
      `;
      const data: any = await client.request(mutation);
      expect(data.createAnnotation).toBeDefined();
      expect(data.createAnnotation.type).toBe('NOTE');
    });
  });

  describe('Collaboration Subgraph (Port 4004)', () => {
    it('should create discussion', async () => {
      const mutation = `
        mutation {
          createDiscussion(input: {
            title: "Test Discussion"
            content: "Integration test discussion"
            courseId: "test-course-123"
            userId: "00000000-0000-0000-0000-000000000001"
            tenantId: "00000000-0000-0000-0000-000000000001"
          }) {
            id
            title
            content
            upvotes
          }
        }
      `;
      const data: any = await client.request(mutation);
      expect(data.createDiscussion).toBeDefined();
      expect(data.createDiscussion.upvotes).toBe(0);
    });
  });

  describe('Agent Subgraph (Port 4005)', () => {
    it('should create AI session', async () => {
      const mutation = `
        mutation {
          createAgentSession(input: {
            userId: "00000000-0000-0000-0000-000000000001"
            agentType: "TUTOR"
            context: "{}"
            tenantId: "00000000-0000-0000-0000-000000000001"
          }) {
            id
            agentType
            status
          }
        }
      `;
      const data: any = await client.request(mutation);
      expect(data.createAgentSession).toBeDefined();
      expect(data.createAgentSession.status).toBe('ACTIVE');
    });
  });

  describe('Knowledge Subgraph (Port 4006)', () => {
    it('should perform semantic search', async () => {
      const query = `
        query {
          semanticSearch(
            queryVector: [${Array(768).fill(0.1).join(', ')}]
            limit: 5
            minSimilarity: 0.5
          ) {
            embedding {
              id
              content
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
            # This extends from Content Subgraph via @key(fields: "id")
            courses {
              id
              title
              modules {
                id
                title
              }
            }
            # This extends from Annotation Subgraph
            annotations {
              id
              type
              content
            }
          }
        }
      `;
      // This will fail if federation is not working
      const data: any = await client.request(query);
      expect(data.me).toBeDefined();
    });
  });
});
