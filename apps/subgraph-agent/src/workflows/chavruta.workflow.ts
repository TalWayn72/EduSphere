/**
 * Chavruta Workflow — Jewish dialectical study-partner state machine.
 *
 * States: ASSESS → CHALLENGE → RESPOND → EVALUATE → CONCLUDE
 *
 * LangGraph is not yet installed; the workflow is implemented as an
 * explicit state-machine loop powered by the Vercel AI SDK so that
 * replacing it with @langchain/langgraph later is a drop-in swap.
 */

import { generateText, streamText, type LanguageModelV1 } from 'ai';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChavrutaState =
  | 'ASSESS'
  | 'CHALLENGE'
  | 'RESPOND'
  | 'EVALUATE'
  | 'CONCLUDE';

export interface ChavrutaContext {
  sessionId: string;
  content: string;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
  understandingScore: number; // 1-5
  turn: number;
  currentState: ChavrutaState;
}

export interface ChavrutaResult {
  text: string;
  nextState: ChavrutaState;
  understandingScore: number;
  isComplete: boolean;
}

// ── System Prompts ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<ChavrutaState, string> = {
  ASSESS: `You are a Chavruta (Jewish study partner). Your role is to assess the learner's
current understanding of the topic. Ask open-ended questions to gauge their
knowledge level. Be warm and encouraging. Respond in the language the user uses.
Identify gaps and strengths. Keep your response concise (2-3 sentences).`,

  CHALLENGE: `You are a Chavruta study partner. Based on what you now know about the learner,
pose a Socratic challenge question that pushes them to think deeper.
Use "What if...?" or "How would you explain...?" patterns.
Draw on the Jewish tradition of questioning to uncover deeper meaning.`,

  RESPOND: `You are a Chavruta study partner engaged in active dialogue. The learner has
responded to your challenge. Engage with their answer thoughtfully:
- Acknowledge what is correct or insightful
- Gently surface any misconceptions
- Add a layer of depth with a new perspective or counter-example
Keep the dialogue lively and Socratic.`,

  EVALUATE: `You are a Chavruta study partner. Silently evaluate the learner's understanding
based on the conversation so far. Then provide brief feedback:
- Highlight their strongest insights
- Note one area for improvement
- Score their understanding from 1 (novice) to 5 (mastery)
Format: start your response with [SCORE:N] then the feedback.`,

  CONCLUDE: `You are a Chavruta study partner wrapping up the session. Provide:
1. A concise summary of what was learned (2-3 key insights)
2. One "take-away" question to ponder before the next session
3. A suggested related topic for further study
Be encouraging and celebrate the learner's growth.`,
};

// ── State Transition Logic ─────────────────────────────────────────────────────

function nextState(
  current: ChavrutaState,
  turn: number,
  score: number
): ChavrutaState {
  switch (current) {
    case 'ASSESS':
      return 'CHALLENGE';
    case 'CHALLENGE':
      return 'RESPOND';
    case 'RESPOND':
      return turn >= 3 || score >= 4 ? 'EVALUATE' : 'CHALLENGE';
    case 'EVALUATE':
      return 'CONCLUDE';
    case 'CONCLUDE':
      return 'CONCLUDE';
  }
}

function extractScore(text: string): number {
  const match = /\[SCORE:(\d)\]/i.exec(text);
  return match ? Math.min(5, Math.max(1, parseInt(match[1] ?? '3', 10))) : 3;
}

function buildMessages(
  ctx: ChavrutaContext
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return ctx.history.map((m) => ({ role: m.role, content: m.text }));
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function createChavrutaWorkflow(model: LanguageModelV1) {
  async function step(ctx: ChavrutaContext): Promise<ChavrutaResult> {
    const system = SYSTEM_PROMPTS[ctx.currentState];
    const messages = buildMessages(ctx);

    const { text } = await generateText({
      model,
      system,
      messages,
      temperature: 0.8,
      maxTokens: 400,
    });

    const score =
      ctx.currentState === 'EVALUATE'
        ? extractScore(text)
        : ctx.understandingScore;

    const next = nextState(ctx.currentState, ctx.turn, score);

    return {
      text,
      nextState: next,
      understandingScore: score,
      isComplete: ctx.currentState === 'CONCLUDE',
    };
  }

  async function stream(ctx: ChavrutaContext) {
    const system = SYSTEM_PROMPTS[ctx.currentState];
    const messages = buildMessages(ctx);

    return streamText({
      model,
      system,
      messages,
      temperature: 0.8,
      maxTokens: 400,
    });
  }

  return { step, stream };
}
