import { describe, it, expect } from 'vitest';
import {
  TemplateTypeEnum,
  StartAgentSessionSchema,
  SendMessageSchema,
  EndSessionSchema,
} from './agent-session.schemas.js';

describe('TemplateTypeEnum', () => {
  const validTypes = [
    'TUTOR',
    'QUIZ_GENERATOR',
    'DEBATE_FACILITATOR',
    'EXPLANATION_GENERATOR',
    'CHAVRUTA_DEBATE',
    'SUMMARIZE',
    'QUIZ_ASSESS',
    'RESEARCH_SCOUT',
    'EXPLAIN',
    'CUSTOM',
  ];

  it.each(validTypes)('accepts valid template type: %s', (type) => {
    const result = TemplateTypeEnum.safeParse(type);
    expect(result.success).toBe(true);
  });

  it('rejects invalid template type', () => {
    const result = TemplateTypeEnum.safeParse('INVALID_TYPE');
    expect(result.success).toBe(false);
  });
});

describe('StartAgentSessionSchema', () => {
  it('validates a minimal valid input', () => {
    const result = StartAgentSessionSchema.safeParse({ templateType: 'TUTOR' });
    expect(result.success).toBe(true);
  });

  it('applies default locale "en" when omitted', () => {
    const result = StartAgentSessionSchema.safeParse({ templateType: 'EXPLAIN' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.locale).toBe('en');
    }
  });

  it('accepts optional context record', () => {
    const result = StartAgentSessionSchema.safeParse({
      templateType: 'QUIZ_GENERATOR',
      context: { courseId: 'c-1', difficulty: 'medium' },
      locale: 'he',
    });
    expect(result.success).toBe(true);
  });

  it('rejects locale shorter than 2 chars', () => {
    const result = StartAgentSessionSchema.safeParse({
      templateType: 'TUTOR',
      locale: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects locale longer than 10 chars', () => {
    const result = StartAgentSessionSchema.safeParse({
      templateType: 'TUTOR',
      locale: 'x'.repeat(11),
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing templateType', () => {
    const result = StartAgentSessionSchema.safeParse({ locale: 'en' });
    expect(result.success).toBe(false);
  });
});

describe('SendMessageSchema', () => {
  it('validates a valid message', () => {
    const result = SendMessageSchema.safeParse({
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'Hello, agent!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID sessionId', () => {
    const result = SendMessageSchema.safeParse({
      sessionId: 'not-a-uuid',
      content: 'Hello',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty content', () => {
    const result = SendMessageSchema.safeParse({
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects content exceeding 10000 chars', () => {
    const result = SendMessageSchema.safeParse({
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'X'.repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts content of exactly 10000 chars', () => {
    const result = SendMessageSchema.safeParse({
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      content: 'X'.repeat(10000),
    });
    expect(result.success).toBe(true);
  });
});

describe('EndSessionSchema', () => {
  it('validates a valid UUID sessionId', () => {
    const result = EndSessionSchema.safeParse({
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID sessionId', () => {
    const result = EndSessionSchema.safeParse({ sessionId: 'bad-id' });
    expect(result.success).toBe(false);
  });

  it('rejects missing sessionId', () => {
    const result = EndSessionSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
