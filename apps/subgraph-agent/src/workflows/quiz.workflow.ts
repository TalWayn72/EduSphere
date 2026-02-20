/**
 * Quiz Master Workflow — adaptive MCQ assessment state machine.
 *
 * States: LOAD_CONTENT → GENERATE_QUESTIONS → ASK → EVALUATE_ANSWER
 *         → NEXT_QUESTION → SCORE
 *
 * Generates 5 MCQ questions from course content, evaluates each answer
 * with explanation, tracks score and adapts difficulty.
 */

import { generateText, streamText, type LanguageModelV1 } from 'ai';

// ── Types ─────────────────────────────────────────────────────────────────────

export type QuizState =
  | 'LOAD_CONTENT'
  | 'GENERATE_QUESTIONS'
  | 'ASK'
  | 'EVALUATE_ANSWER'
  | 'NEXT_QUESTION'
  | 'SCORE';

export interface QuizQuestion {
  index: number;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
}

export interface QuizContext {
  sessionId: string;
  courseContent: string;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  answers: number[];
  score: number;
  currentState: QuizState;
}

export interface QuizResult {
  text: string;
  nextState: QuizState;
  updatedContext: Partial<QuizContext>;
  isComplete: boolean;
}

// ── Prompt Templates ──────────────────────────────────────────────────────────

const GENERATE_QUESTIONS_PROMPT = (content: string) => `
You are a quiz generator. Based on the following course content, create exactly 5 multiple-choice
questions that test comprehension at varying difficulty levels (2 easy, 2 medium, 1 hard).

Course Content:
---
${content}
---

Output a JSON array with this exact structure (no markdown, raw JSON only):
[
  {
    "index": 0,
    "text": "Question text",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctIndex": 0,
    "difficulty": "easy",
    "explanation": "Why this answer is correct"
  }
]
`;

const ASK_QUESTION_PROMPT = (q: QuizQuestion, questionNum: number) => `
You are a friendly quiz host. Present question ${questionNum} of 5:

${q.text}

${q.options.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Difficulty: ${q.difficulty}
Ask the learner to choose (1-4). Be encouraging and clear.
`;

const EVALUATE_PROMPT = (
  q: QuizQuestion,
  userAnswer: number,
  isCorrect: boolean
) => `
You are a quiz evaluator providing feedback.

Question: ${q.text}
User answered: option ${userAnswer + 1}
Correct answer: option ${q.correctIndex + 1}
Result: ${isCorrect ? 'CORRECT' : 'INCORRECT'}

Explanation: ${q.explanation}

Provide warm, educational feedback (2-3 sentences). Celebrate if correct.
If wrong, explain gently why and reinforce the correct concept.
`;

const SCORE_PROMPT = (score: number, total: number) => `
You are a quiz host wrapping up the session. The learner scored ${score}/${total}.

Provide:
1. Congratulatory or encouraging closing (based on score)
2. Performance summary (what they mastered vs. what needs review)
3. Suggested next steps for further learning
4. A motivational closing sentence

Score interpretation: <3 = needs more study, 3-4 = good grasp, 5 = mastery.
`;

// ── Question Parsing ──────────────────────────────────────────────────────────

function parseQuestions(raw: string): QuizQuestion[] {
  try {
    const jsonStart = raw.indexOf('[');
    const jsonEnd = raw.lastIndexOf(']') + 1;
    if (jsonStart === -1 || jsonEnd === 0) return [];
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd)) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 5).map((q, i) => {
      const item = q as Record<string, unknown>;
      return {
        index: typeof item['index'] === 'number' ? item['index'] : i,
        text: typeof item['text'] === 'string' ? item['text'] : '',
        options: Array.isArray(item['options'])
          ? (item['options'] as string[])
          : [],
        correctIndex:
          typeof item['correctIndex'] === 'number' ? item['correctIndex'] : 0,
        difficulty: (['easy', 'medium', 'hard'].includes(
          item['difficulty'] as string
        )
          ? item['difficulty']
          : 'medium') as QuizQuestion['difficulty'],
        explanation:
          typeof item['explanation'] === 'string' ? item['explanation'] : '',
      };
    });
  } catch {
    return [];
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function createQuizWorkflow(model: LanguageModelV1) {
  async function step(
    ctx: QuizContext,
    userAnswer?: number
  ): Promise<QuizResult> {
    switch (ctx.currentState) {
      case 'LOAD_CONTENT':
        return {
          text: 'Content loaded. Generating questions...',
          nextState: 'GENERATE_QUESTIONS',
          updatedContext: {},
          isComplete: false,
        };

      case 'GENERATE_QUESTIONS': {
        const { text } = await generateText({
          model,
          prompt: GENERATE_QUESTIONS_PROMPT(ctx.courseContent),
          temperature: 0.4,
          maxTokens: 1200,
        });
        const questions = parseQuestions(text);
        return {
          text: 'Questions ready. Starting quiz...',
          nextState: 'ASK',
          updatedContext: { questions, currentQuestionIndex: 0 },
          isComplete: false,
        };
      }

      case 'ASK': {
        const q = ctx.questions[ctx.currentQuestionIndex];
        if (!q) {
          return {
            text: 'No more questions.',
            nextState: 'SCORE',
            updatedContext: {},
            isComplete: false,
          };
        }
        const { text } = await generateText({
          model,
          prompt: ASK_QUESTION_PROMPT(q, ctx.currentQuestionIndex + 1),
          temperature: 0.5,
          maxTokens: 300,
        });
        return {
          text,
          nextState: 'EVALUATE_ANSWER',
          updatedContext: {},
          isComplete: false,
        };
      }

      case 'EVALUATE_ANSWER': {
        const q = ctx.questions[ctx.currentQuestionIndex];
        const answerIdx = userAnswer ?? 0;
        const isCorrect = answerIdx === q?.correctIndex;
        const { text } = await generateText({
          model,
          prompt: EVALUATE_PROMPT(q!, answerIdx, isCorrect),
          temperature: 0.6,
          maxTokens: 250,
        });
        const newScore = ctx.score + (isCorrect ? 1 : 0);
        const newAnswers = [...ctx.answers, answerIdx];
        const hasMore =
          ctx.currentQuestionIndex < ctx.questions.length - 1;
        return {
          text,
          nextState: hasMore ? 'NEXT_QUESTION' : 'SCORE',
          updatedContext: { score: newScore, answers: newAnswers },
          isComplete: false,
        };
      }

      case 'NEXT_QUESTION': {
        const nextIdx = ctx.currentQuestionIndex + 1;
        return {
          text: `Moving to question ${nextIdx + 1}...`,
          nextState: 'ASK',
          updatedContext: { currentQuestionIndex: nextIdx },
          isComplete: false,
        };
      }

      case 'SCORE': {
        const { text } = await generateText({
          model,
          prompt: SCORE_PROMPT(ctx.score, ctx.questions.length),
          temperature: 0.7,
          maxTokens: 400,
        });
        return {
          text,
          nextState: 'SCORE',
          updatedContext: {},
          isComplete: true,
        };
      }
    }
  }

  async function stream(ctx: QuizContext, userAnswer?: number) {
    const q = ctx.questions[ctx.currentQuestionIndex];
    const prompt =
      ctx.currentState === 'ASK' && q
        ? ASK_QUESTION_PROMPT(q, ctx.currentQuestionIndex + 1)
        : ctx.currentState === 'EVALUATE_ANSWER' && q
          ? EVALUATE_PROMPT(q, userAnswer ?? 0, (userAnswer ?? 0) === q.correctIndex)
          : SCORE_PROMPT(ctx.score, ctx.questions.length);

    return streamText({ model, prompt, temperature: 0.6, maxTokens: 400 });
  }

  return { step, stream };
}
