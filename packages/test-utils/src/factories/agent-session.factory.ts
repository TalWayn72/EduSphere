export type AgentSessionStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'EXPIRED';

export interface AgentSession {
  id: string;
  tenantId: string;
  userId: string;
  templateId: string;
  contentId: string;
  status: AgentSessionStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface AgentMessage {
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: Date;
}

export function createAgentSession(
  overrides?: Partial<AgentSession>
): AgentSession {
  const now = new Date('2025-01-01T00:00:00.000Z');
  return {
    id: 'session-test-001',
    tenantId: 'tenant-test-001',
    userId: 'user-test-001',
    templateId: 'template-chavruta-001',
    contentId: 'content-test-001',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date('2025-01-01T01:00:00.000Z'),
    ...overrides,
  };
}

export function createAgentMessage(
  overrides?: Partial<AgentMessage>
): AgentMessage {
  return {
    id: 'msg-test-001',
    sessionId: 'session-test-001',
    role: 'USER',
    content: 'Hello, can you explain this concept?',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}
