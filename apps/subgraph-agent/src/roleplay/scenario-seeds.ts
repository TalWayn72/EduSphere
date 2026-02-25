/**
 * Built-in role-play scenario templates (F-007).
 * These are seeded into every tenant on first setup.
 */
import type { RubricCriterion } from '@edusphere/db';

export interface ScenarioSeed {
  title: string;
  domain: string;
  difficultyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  characterPersona: string;
  sceneDescription: string;
  evaluationRubric: RubricCriterion[];
  maxTurns: number;
}

export const BUILT_IN_SCENARIOS: ScenarioSeed[] = [
  {
    title: 'Difficult Customer Call',
    domain: 'customer_service',
    difficultyLevel: 'INTERMEDIATE',
    characterPersona:
      'You are an angry customer named Alex who received the wrong order. ' +
      'You are frustrated but can be calmed down with empathy and clear solutions. ' +
      'Start upset, raise your voice slightly in text, then gradually soften as you ' +
      'feel heard. Do not break character.',
    sceneDescription:
      'You are a customer service agent receiving a call from an upset customer. ' +
      'Your goal is to de-escalate the situation, show empathy, and offer a practical solution.',
    evaluationRubric: [
      { name: 'Empathy', description: 'Acknowledged customer feelings', maxScore: 30 },
      { name: 'Problem Solving', description: 'Offered a concrete solution', maxScore: 30 },
      { name: 'Professionalism', description: 'Maintained calm and professional tone', maxScore: 20 },
      { name: 'Clarity', description: 'Communicated clearly and concisely', maxScore: 20 },
    ],
    maxTurns: 8,
  },
  {
    title: 'Sales Pitch Practice',
    domain: 'sales',
    difficultyLevel: 'BEGINNER',
    characterPersona:
      'You are Jordan, a busy VP of Engineering who is skeptical of new software tools. ' +
      'You have a tight budget and need clear ROI. You ask probing questions and push back on ' +
      'vague claims. You warm up when you hear specific metrics or relevant case studies.',
    sceneDescription:
      'You are a sales rep presenting a SaaS productivity platform. ' +
      'Convince Jordan to schedule a demo by identifying their pain points and articulating value.',
    evaluationRubric: [
      { name: 'Discovery', description: 'Asked about customer needs before pitching', maxScore: 25 },
      { name: 'Value Proposition', description: 'Clearly articulated ROI', maxScore: 35 },
      { name: 'Objection Handling', description: 'Addressed concerns confidently', maxScore: 25 },
      { name: 'Call to Action', description: 'Asked for a specific next step', maxScore: 15 },
    ],
    maxTurns: 10,
  },
  {
    title: 'Performance Review Conversation',
    domain: 'management',
    difficultyLevel: 'ADVANCED',
    characterPersona:
      'You are Sam, an employee who has been underperforming for two quarters. ' +
      'You are defensive at first, feel micromanaged, but are genuinely struggling with workload. ' +
      'You respond well to specific examples and collaborative goal-setting.',
    sceneDescription:
      'You are a team lead conducting a performance review with an underperforming team member. ' +
      'Navigate the conversation constructively: deliver feedback, understand the root cause, ' +
      'and agree on an improvement plan.',
    evaluationRubric: [
      { name: 'Specificity', description: 'Used concrete examples, not generalities', maxScore: 25 },
      { name: 'Active Listening', description: 'Acknowledged employee perspective', maxScore: 25 },
      { name: 'Constructiveness', description: 'Focused on improvement, not blame', maxScore: 30 },
      { name: 'Goal Setting', description: 'Agreed on measurable next steps', maxScore: 20 },
    ],
    maxTurns: 12,
  },
];
