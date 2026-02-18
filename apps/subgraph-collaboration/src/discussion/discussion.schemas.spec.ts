import { describe, it, expect } from 'vitest';
import {
  discussionTypeSchema,
  messageTypeSchema,
  createDiscussionInputSchema,
  addMessageInputSchema,
} from './discussion.schemas';

// ── discussionTypeSchema ──────────────────────────────────────────────────────

describe('discussionTypeSchema', () => {
  it('accepts FORUM', () => {
    expect(discussionTypeSchema.parse('FORUM')).toBe('FORUM');
  });

  it('accepts CHAVRUTA', () => {
    expect(discussionTypeSchema.parse('CHAVRUTA')).toBe('CHAVRUTA');
  });

  it('accepts DEBATE', () => {
    expect(discussionTypeSchema.parse('DEBATE')).toBe('DEBATE');
  });

  it('rejects unknown type', () => {
    expect(() => discussionTypeSchema.parse('INVALID')).toThrow();
  });

  it('rejects empty string', () => {
    expect(() => discussionTypeSchema.parse('')).toThrow();
  });
});

// ── messageTypeSchema ─────────────────────────────────────────────────────────

describe('messageTypeSchema', () => {
  it('accepts TEXT', () => {
    expect(messageTypeSchema.parse('TEXT')).toBe('TEXT');
  });

  it('accepts IMAGE', () => {
    expect(messageTypeSchema.parse('IMAGE')).toBe('IMAGE');
  });

  it('accepts VIDEO', () => {
    expect(messageTypeSchema.parse('VIDEO')).toBe('VIDEO');
  });

  it('accepts AUDIO', () => {
    expect(messageTypeSchema.parse('AUDIO')).toBe('AUDIO');
  });

  it('rejects unknown type', () => {
    expect(() => messageTypeSchema.parse('DOCUMENT')).toThrow();
  });
});

// ── createDiscussionInputSchema ───────────────────────────────────────────────

describe('createDiscussionInputSchema', () => {
  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts valid input with all required fields', () => {
    const input = {
      courseId: VALID_UUID,
      title: 'Introduction to JavaScript',
      discussionType: 'FORUM',
    };
    const result = createDiscussionInputSchema.parse(input);
    expect(result).toMatchObject(input);
  });

  it('accepts optional description', () => {
    const input = {
      courseId: VALID_UUID,
      title: 'Test',
      discussionType: 'CHAVRUTA',
      description: 'A detailed description',
    };
    const result = createDiscussionInputSchema.parse(input);
    expect(result.description).toBe('A detailed description');
  });

  it('omits description when not provided', () => {
    const input = {
      courseId: VALID_UUID,
      title: 'Test',
      discussionType: 'DEBATE',
    };
    const result = createDiscussionInputSchema.parse(input);
    expect(result.description).toBeUndefined();
  });

  it('rejects non-UUID courseId', () => {
    const input = {
      courseId: 'not-a-uuid',
      title: 'Test',
      discussionType: 'FORUM',
    };
    expect(() => createDiscussionInputSchema.parse(input)).toThrow();
  });

  it('rejects empty title', () => {
    const input = {
      courseId: VALID_UUID,
      title: '',
      discussionType: 'FORUM',
    };
    expect(() => createDiscussionInputSchema.parse(input)).toThrow();
  });

  it('rejects title longer than 200 characters', () => {
    const input = {
      courseId: VALID_UUID,
      title: 'A'.repeat(201),
      discussionType: 'FORUM',
    };
    expect(() => createDiscussionInputSchema.parse(input)).toThrow();
  });

  it('accepts title exactly at 200 characters', () => {
    const input = {
      courseId: VALID_UUID,
      title: 'A'.repeat(200),
      discussionType: 'FORUM',
    };
    expect(() => createDiscussionInputSchema.parse(input)).not.toThrow();
  });

  it('rejects description longer than 2000 characters', () => {
    const input = {
      courseId: VALID_UUID,
      title: 'Valid Title',
      discussionType: 'FORUM',
      description: 'B'.repeat(2001),
    };
    expect(() => createDiscussionInputSchema.parse(input)).toThrow();
  });

  it('accepts description exactly at 2000 characters', () => {
    const input = {
      courseId: VALID_UUID,
      title: 'Valid Title',
      discussionType: 'FORUM',
      description: 'B'.repeat(2000),
    };
    expect(() => createDiscussionInputSchema.parse(input)).not.toThrow();
  });

  it('rejects invalid discussionType', () => {
    const input = {
      courseId: VALID_UUID,
      title: 'Test',
      discussionType: 'WEBINAR',
    };
    expect(() => createDiscussionInputSchema.parse(input)).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => createDiscussionInputSchema.parse({})).toThrow();
  });
});

// ── addMessageInputSchema ─────────────────────────────────────────────────────

describe('addMessageInputSchema', () => {
  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts valid input with required fields', () => {
    const input = {
      content: 'This is a message',
      messageType: 'TEXT',
    };
    const result = addMessageInputSchema.parse(input);
    expect(result).toMatchObject(input);
  });

  it('accepts optional parentMessageId', () => {
    const input = {
      content: 'A reply',
      messageType: 'TEXT',
      parentMessageId: VALID_UUID,
    };
    const result = addMessageInputSchema.parse(input);
    expect(result.parentMessageId).toBe(VALID_UUID);
  });

  it('omits parentMessageId when not provided', () => {
    const input = {
      content: 'Top level message',
      messageType: 'TEXT',
    };
    const result = addMessageInputSchema.parse(input);
    expect(result.parentMessageId).toBeUndefined();
  });

  it('rejects empty content', () => {
    const input = { content: '', messageType: 'TEXT' };
    expect(() => addMessageInputSchema.parse(input)).toThrow();
  });

  it('rejects content longer than 10000 characters', () => {
    const input = { content: 'X'.repeat(10001), messageType: 'TEXT' };
    expect(() => addMessageInputSchema.parse(input)).toThrow();
  });

  it('accepts content exactly at 10000 characters', () => {
    const input = { content: 'X'.repeat(10000), messageType: 'TEXT' };
    expect(() => addMessageInputSchema.parse(input)).not.toThrow();
  });

  it('rejects non-UUID parentMessageId', () => {
    const input = {
      content: 'Reply',
      messageType: 'TEXT',
      parentMessageId: 'not-a-uuid',
    };
    expect(() => addMessageInputSchema.parse(input)).toThrow();
  });

  it('rejects invalid messageType', () => {
    const input = { content: 'Test', messageType: 'FILE' };
    expect(() => addMessageInputSchema.parse(input)).toThrow();
  });

  it('rejects missing content', () => {
    const input = { messageType: 'TEXT' };
    expect(() => addMessageInputSchema.parse(input)).toThrow();
  });

  it('rejects missing messageType', () => {
    const input = { content: 'Some content' };
    expect(() => addMessageInputSchema.parse(input)).toThrow();
  });
});
