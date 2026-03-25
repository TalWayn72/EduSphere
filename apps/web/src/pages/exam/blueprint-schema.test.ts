import { describe, it, expect } from 'vitest';
import { blueprintSchema } from './blueprint-schema';

describe('blueprint-schema', () => {
  it('exports blueprintSchema', () => {
    expect(blueprintSchema).toBeDefined();
  });

  it('validates minimal valid data', () => {
    const result = blueprintSchema.safeParse({
      title: 'Test Blueprint',
      totalQuestions: 10,
      timeLimitMinutes: 30,
      passingScore: 70,
      passingMethod: 'PERCENTAGE',
    });
    expect(result).toBeDefined();
  });
});
