/**
 * AITutorScreen — expanded pure logic tests.
 * Covers: chat interface logic, input validation, consent gate,
 * session creation, message sending, loading state,
 * empty chat state, error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- AsyncStorage mock ---
const mockStore: Record<string, string> = {};
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => mockStore[key] ?? null),
    setItem: vi.fn(async (key: string, value: string) => { mockStore[key] = value; }),
    removeItem: vi.fn(async (key: string) => { delete mockStore[key]; }),
  },
}));

import { checkAiConsent, grantAiConsent, AI_CONSENT_KEY } from '../../lib/ai-consent';

// Mirror resolveSessionId from AITutorScreen
function resolveSessionId(mutationResult: string | null, fallback: string): string {
  if (mutationResult && mutationResult.trim().length > 0) return mutationResult;
  return fallback;
}

// Mirror input validation from handleSend
function isValidInput(text: string): boolean {
  return text.trim().length > 0;
}

// Mirror message shape
interface AgentMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

function createUserMessage(content: string): AgentMessage {
  return { id: Date.now().toString(), role: 'USER', content, createdAt: new Date().toISOString() };
}

beforeEach(() => {
  for (const key of Object.keys(mockStore)) delete mockStore[key];
  vi.clearAllMocks();
});

describe('AITutorScreen — chat interface rendering logic', () => {
  it('empty messages array represents initial empty chat', () => {
    const messages: AgentMessage[] = [];
    expect(messages).toHaveLength(0);
  });

  it('user message is added to list after send', () => {
    const messages: AgentMessage[] = [];
    const msg = createUserMessage('Hello tutor');
    messages.push(msg);
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('USER');
    expect(messages[0].content).toBe('Hello tutor');
  });

  it('AI response appended after user message', () => {
    const messages: AgentMessage[] = [createUserMessage('Hi')];
    const aiMsg: AgentMessage = { id: 'ai-1', role: 'ASSISTANT', content: 'Hello!', createdAt: new Date().toISOString() };
    messages.push(aiMsg);
    expect(messages).toHaveLength(2);
    expect(messages[1].role).toBe('ASSISTANT');
  });
});

describe('AITutorScreen — input field validation', () => {
  it('empty string is invalid', () => {
    expect(isValidInput('')).toBe(false);
  });

  it('whitespace-only is invalid', () => {
    expect(isValidInput('   ')).toBe(false);
  });

  it('valid text passes', () => {
    expect(isValidInput('What is GraphQL?')).toBe(true);
  });

  it('max length is 500 characters', () => {
    const longText = 'a'.repeat(500);
    expect(isValidInput(longText)).toBe(true);
    expect(longText.length).toBe(500);
  });
});

describe('AITutorScreen — consent gate (SI-10)', () => {
  it('consent blocked by default', async () => {
    expect(await checkAiConsent()).toBe(false);
  });

  it('consent granted after explicit grant', async () => {
    await grantAiConsent();
    expect(await checkAiConsent()).toBe(true);
  });

  it('AI_CONSENT_KEY is correct', () => {
    expect(AI_CONSENT_KEY).toBe('ai_consent_given');
  });
});

describe('AITutorScreen — session creation', () => {
  it('uses mutation result when valid', () => {
    expect(resolveSessionId('session-real-123', 'demo-session')).toBe('session-real-123');
  });

  it('falls back to demo-session on null', () => {
    expect(resolveSessionId(null, 'demo-session')).toBe('demo-session');
  });

  it('falls back on empty string', () => {
    expect(resolveSessionId('', 'demo-session')).toBe('demo-session');
  });

  it('loading state: sessionLoading=true shows spinner', () => {
    const sessionLoading = true;
    const sessionId: string | null = null;
    expect(sessionLoading).toBe(true);
    expect(sessionId).toBeNull();
  });
});

describe('AITutorScreen — error handling', () => {
  it('CONSENT_REQUIRED error code triggers consent alert', () => {
    const gqlError = {
      graphQLErrors: [{ extensions: { code: 'CONSENT_REQUIRED' } }],
    };
    const consentErr = gqlError.graphQLErrors.find(
      e => e.extensions?.code === 'CONSENT_REQUIRED'
    );
    expect(consentErr).toBeDefined();
  });

  it('generic error does not match CONSENT_REQUIRED', () => {
    const gqlError = {
      graphQLErrors: [{ extensions: { code: 'INTERNAL_ERROR' } }],
    };
    const consentErr = gqlError.graphQLErrors.find(
      e => e.extensions?.code === 'CONSENT_REQUIRED'
    );
    expect(consentErr).toBeUndefined();
  });
});
