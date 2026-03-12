import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';

// ── Ollama / AI SDK mocks ──────────────────────────────────────────────────────
// Use wrapper functions to avoid vi.mock hoisting issues with external variables

const mockGenerateTextFn = vi.fn();
const mockOllamaModelFn = vi.fn(() => ({}));

vi.mock('ollama-ai-provider', () => ({
  createOllama: vi.fn(() => mockOllamaModelFn),
}));

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateTextFn(...args),
}));

// ── Import AFTER mocks ────────────────────────────────────────────────────────

import { AutoGradingService } from './auto-grading.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const RUBRIC = {
  questionId: 'q-001',
  questionText: 'Explain what GraphQL is.',
  maxScore: 10,
  criteria: [
    { description: 'Defines GraphQL correctly', points: 5 },
    { description: 'Mentions query language', points: 3 },
    { description: 'Mentions type system', points: 2 },
  ],
};

const GOOD_ANSWER = 'GraphQL is a query language for APIs with a strong type system.';
const HTML_ANSWER = '<b>GraphQL</b> is a <script>alert("xss")</script>query language.';
const GRADING_RESPONSE =
  'Score: 8\nGraphQL is well explained.\nSuggestions: Add more detail about resolvers.';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AutoGradingService', () => {
  let service: AutoGradingService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateTextFn.mockResolvedValue({
      text: GRADING_RESPONSE,
      usage: {},
      finishReason: 'stop',
    });
    service = new AutoGradingService();
  });

  it('gradeAnswer returns GradingResult with score within 0-maxScore', async () => {
    const result = await service.gradeAnswer(RUBRIC, GOOD_ANSWER, 'tenant-1');

    expect(result.questionId).toBe('q-001');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(RUBRIC.maxScore);
    expect(result.maxScore).toBe(10);
    expect(result.percentageScore).toBeGreaterThanOrEqual(0);
    expect(result.percentageScore).toBeLessThanOrEqual(100);
    expect(result.gradedAt).toBeInstanceOf(Date);
    expect(typeof result.explanation).toBe('string');
    expect(Array.isArray(result.suggestions)).toBe(true);
  });

  it('gradeAnswer sanitizes HTML tags from studentAnswer (XSS prevention)', async () => {
    const result = await service.gradeAnswer(RUBRIC, HTML_ANSWER, 'tenant-1');

    // The sanitized answer must not contain any HTML opening or closing tags
    expect(result.studentAnswer).not.toContain('<b>');
    expect(result.studentAnswer).not.toContain('</b>');
    expect(result.studentAnswer).not.toContain('<script>');
    expect(result.studentAnswer).not.toContain('</script>');
    // Verifies the tag pattern itself is gone (angle brackets surrounding tag names)
    expect(result.studentAnswer).not.toMatch(/<\w+>/);
    expect(result.studentAnswer).toContain('GraphQL');
  });

  it('gradeAnswer uses JSON.stringify for prompt payload (SI-3 injection prevention)', async () => {
    await service.gradeAnswer(RUBRIC, GOOD_ANSWER, 'tenant-1');

    expect(mockGenerateTextFn).toHaveBeenCalledOnce();
    const callArgs = mockGenerateTextFn.mock.calls[0][0] as Record<string, unknown>;
    const prompt = callArgs['prompt'] as string;

    // Prompt must be valid JSON (JSON.stringify output)
    expect(() => JSON.parse(prompt)).not.toThrow();
    const parsed = JSON.parse(prompt) as Record<string, unknown>;
    expect(parsed).toHaveProperty('rubric');
    expect(parsed).toHaveProperty('answer');
  });

  it('gradeAnswer throws BadRequestException for empty answer', async () => {
    await expect(service.gradeAnswer(RUBRIC, '', 'tenant-1')).rejects.toThrow(
      BadRequestException
    );
  });

  it('gradeAnswer throws BadRequestException for answer exceeding 5000 chars', async () => {
    const longAnswer = 'a'.repeat(5001);
    await expect(service.gradeAnswer(RUBRIC, longAnswer, 'tenant-1')).rejects.toThrow(
      BadRequestException
    );
  });

  it('gradeAnswer logger.log receives questionId and score but NOT studentAnswer', async () => {
    // Spy on the service's internal logger after construction
    const logSpy = vi.spyOn(
      (service as unknown as { logger: { log: (...a: unknown[]) => void } }).logger,
      'log'
    );

    await service.gradeAnswer(RUBRIC, GOOD_ANSWER, 'tenant-1');

    expect(logSpy).toHaveBeenCalledOnce();
    const [logPayload] = logSpy.mock.calls[0] as [Record<string, unknown>, ...unknown[]];

    // Must log questionId and score
    expect(logPayload).toHaveProperty('questionId', 'q-001');
    expect(logPayload).toHaveProperty('score');

    // Must NOT log the raw student answer (PII protection)
    const serialized = JSON.stringify(logPayload);
    expect(serialized).not.toContain(GOOD_ANSWER);
    expect(logPayload).not.toHaveProperty('studentAnswer');
    expect(logPayload).not.toHaveProperty('answer');
  });

  it('batchGrade returns array with studentId field for each result', async () => {
    const answers = [
      { studentId: 'student-1', answer: 'GraphQL is a query language.' },
      { studentId: 'student-2', answer: 'GraphQL uses a type system and queries.' },
    ];

    const results = await service.batchGrade(RUBRIC, answers, 'tenant-1');

    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty('studentId', 'student-1');
    expect(results[1]).toHaveProperty('studentId', 'student-2');
    expect(results[0]).toHaveProperty('questionId', 'q-001');
    expect(results[0]).toHaveProperty('score');
    expect(results[0]).toHaveProperty('gradedAt');
  });
});
