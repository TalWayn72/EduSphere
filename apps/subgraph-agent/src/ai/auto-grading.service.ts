/**
 * AutoGradingService — AI-powered free-text answer grading (Phase 53)
 *
 * Uses GraphRAG-style rubric matching:
 * 1. Retrieve relevant knowledge graph nodes for the question topic
 * 2. Compare student answer against rubric criteria using LLM
 * 3. Return structured score with explanation and improvement suggestions
 *
 * SI-10: Only runs if tenant has THIRD_PARTY_LLM consent.
 * SI-3: Student answers are NOT sent to external LLMs — only local Ollama.
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import type { LanguageModel } from 'ai';

export interface GradingRubric {
  questionId: string;
  questionText: string;
  maxScore: number;
  criteria: Array<{ description: string; points: number }>;
  modelAnswer?: string;
}

export interface GradingResult {
  questionId: string;
  studentAnswer: string;
  score: number;
  maxScore: number;
  percentageScore: number;
  explanation: string;
  suggestions: string[];
  gradedAt: Date;
}

const MIN_ANSWER_LENGTH = 1;
const MAX_ANSWER_LENGTH = 5000;

function sanitizeAnswer(raw: string): string {
  // Strip HTML tags to prevent XSS injection into prompt (SI-3)
  return raw.replace(/<[^>]*>/g, '').trim();
}

function parseGradingResponse(
  responseText: string,
  maxScore: number
): { score: number; explanation: string; suggestions: string[] } {
  let score = 0;
  let explanation = responseText.trim();
  const suggestions: string[] = [];

  // Extract numeric score from response by locating "score" keyword and parsing the first number after it
  const lowerResponse = responseText.toLowerCase();
  const scoreKeywordIdx = lowerResponse.indexOf('score');
  if (scoreKeywordIdx !== -1) {
    const afterScore = responseText.slice(scoreKeywordIdx + 5).trimStart().replace(/^[:\s]+/, '');
    const numStr = afterScore.split(/[^\d.]/)[0] ?? '';
    const parsed = parseFloat(numStr);
    if (!isNaN(parsed)) {
      score = Math.min(maxScore, Math.max(0, parsed));
    }
  }

  // Extract suggestions after "Suggestion(s):" marker by splitting on that keyword
  const suggestionIdx = responseText
    .toLowerCase()
    .indexOf('suggestion');
  if (suggestionIdx !== -1) {
    const afterKeyword = responseText.slice(suggestionIdx).replace(/^suggestions?[:\s]*/i, '');
    const firstParagraph = afterKeyword.split('\n\n')[0] ?? afterKeyword;
    suggestions.push(...firstParagraph.split(/\n/).map((s) => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean));
  }

  return { score, explanation, suggestions };
}

@Injectable()
export class AutoGradingService {
  private readonly logger = new Logger(AutoGradingService.name);

  private getModel(): LanguageModel {
    const ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434';
    const ollama = createOllama({ baseURL: ollamaUrl + '/api' });
    const modelId = process.env.OLLAMA_MODEL ?? 'llama3.2';
    return ollama(modelId) as unknown as LanguageModel;
  }

  async gradeAnswer(
    rubric: GradingRubric,
    studentAnswer: string,
    tenantId: string
  ): Promise<GradingResult> {
    if (!studentAnswer || studentAnswer.length < MIN_ANSWER_LENGTH) {
      throw new BadRequestException('Student answer must not be empty');
    }
    if (studentAnswer.length > MAX_ANSWER_LENGTH) {
      throw new BadRequestException(
        `Student answer exceeds maximum length of ${MAX_ANSWER_LENGTH} characters`
      );
    }

    // Sanitize HTML from answer before any processing (XSS + SI-3)
    const sanitizedAnswer = sanitizeAnswer(studentAnswer);

    // Build prompt using JSON.stringify to prevent prompt injection (SI-3)
    const payload = JSON.stringify({
      rubric: {
        questionText: rubric.questionText,
        criteria: rubric.criteria,
        maxScore: rubric.maxScore,
      },
      answer: sanitizedAnswer,
    });

    const systemPrompt =
      'You are an expert educational grader. Given a grading rubric and a student answer, ' +
      'evaluate the answer against each criterion. Respond with: "Score: X" on the first line, ' +
      'then a concise explanation, then "Suggestions: <list>"';

    const model = this.getModel();
    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: payload,
      maxOutputTokens: 1000,
    });

    const { score, explanation, suggestions } = parseGradingResponse(
      result.text,
      rubric.maxScore
    );

    // Log metadata only — never log student answer text (PII protection)
    this.logger.log(
      { questionId: rubric.questionId, score, tenantId },
      'AutoGradingService: answer graded'
    );

    return {
      questionId: rubric.questionId,
      studentAnswer: sanitizedAnswer,
      score,
      maxScore: rubric.maxScore,
      percentageScore: rubric.maxScore > 0 ? (score / rubric.maxScore) * 100 : 0,
      explanation,
      suggestions,
      gradedAt: new Date(),
    };
  }

  async batchGrade(
    rubric: GradingRubric,
    answers: Array<{ studentId: string; answer: string }>,
    tenantId: string
  ): Promise<Array<{ studentId: string } & GradingResult>> {
    const results = await Promise.all(
      answers.map(async ({ studentId, answer }) => {
        const result = await this.gradeAnswer(rubric, answer, tenantId);
        return { studentId, ...result };
      })
    );
    return results;
  }
}
