/**
 * AGENT_MODES constant array — separated because it contains JSX (icon elements).
 *
 * Kept in its own file so the pure-TS types file (agent-modes.ts) stays free of
 * React imports, which helps with tree-shaking and test isolation.
 */
import {
  Bot,
  Zap,
  BookOpen,
  FlaskConical,
  Lightbulb,
} from 'lucide-react';
import type { AgentModeDefinition } from './agent-modes';

export const AGENT_MODES: readonly AgentModeDefinition[] = [
  {
    id: 'chavruta',
    label: 'Chavruta Debate',
    icon: <Bot className="h-5 w-5" />,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    description:
      'Dialectical partner — challenges your arguments using Talmudic reasoning',
    prompts: [
      'Debate free will',
      'Argue against Rambam',
      'Challenge my thesis',
    ],
    responses: [
      "An interesting position! But consider the counter-argument: if consciousness is purely deterministic, how can Rambam's framework of moral responsibility hold?",
      'You raise a valid point from the Mishneh Torah. However, the Ramban argues the opposite. How do you reconcile these two authorities?',
      'Excellent! Now steelman the opposing view. That is the true Chavruta method.',
    ],
  },
  {
    id: 'quiz',
    label: 'Quiz Master',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    description:
      'Adaptive quizzes based on your learning history and prerequisite gaps',
    prompts: [
      'Quiz me on free will',
      'Test my Rambam knowledge',
      'Random concept quiz',
    ],
    responses: [
      "Question 1: Rambam's concept of free will is found primarily in which of his works? A) Guide for the Perplexed B) Mishneh Torah C) Commentary on the Mishnah",
      'Correct! Now a harder question: What is the Hebrew term for the principle that all events are predetermined?',
      'The correct answer is *Hashgacha Pratit* (Divine Providence). Want to review that section?',
    ],
  },
  {
    id: 'summarize',
    label: 'Summarizer',
    icon: <BookOpen className="h-5 w-5" />,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    description:
      'Progressive summaries of your studied content with key concept extraction',
    prompts: [
      'Summarize lesson 1',
      'Key concepts only',
      'One-paragraph overview',
    ],
    responses: [
      '**Lesson 1 Summary:** The introductory lesson covers Talmudic reasoning methods including *kal vachomer*, *gezera shava*, and *binyan av*.',
      '**Key Concepts:** (1) Pilpul — rigorous analytical debate. (2) Svara — logical reasoning. (3) Machloket — structured dispute. (4) Kushya — a challenge.',
      '**One-line:** Talmudic reasoning uses structured debate, analogy, and logical inference to derive principles from sacred texts.',
    ],
  },
  {
    id: 'research',
    label: 'Research Scout',
    icon: <FlaskConical className="h-5 w-5" />,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    description:
      'Cross-reference finder — discovers connections across texts and time periods',
    prompts: [
      'Find contradictions',
      'Cross-reference Aristotle',
      'Related sources',
    ],
    responses: [
      '**Contradiction detected:** Rambam (Guide III:17) argues for limited divine providence. Nahmanides argues for universal providence. Both cite Job 34:21 with opposite conclusions.',
      '**Aristotle connections:** (1) Kal vachomer ↔ a fortiori (Prior Analytics). (2) Pilpul ↔ Socratic dialectic.',
      '**Related sources:** Guide for the Perplexed III:51 | Mishneh Torah, Laws of Teshuvah 5:1 | Talmud Bavli, Berakhot 33b',
    ],
  },
  {
    id: 'explain',
    label: 'Explainer',
    icon: <Lightbulb className="h-5 w-5" />,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    description:
      'Adaptive explanations that adjust to your understanding level',
    prompts: [
      "Explain like I'm 5",
      'Advanced explanation',
      'Practical examples',
    ],
    responses: [
      "**Simple:** Imagine a court case. 'If a small thing requires proof, a big thing *definitely* requires proof.' That's *kal vachomer*.",
      '**Advanced:** *Kal vachomer* operates through *binyan av* — establishing a norm from a clear case and extending it to an ambiguous one.',
      '**Example:** If watering plants is prohibited on Shabbat, then certainly uprooting trees is prohibited — a real Talmudic *kal vachomer*.',
    ],
  },
] as const;
