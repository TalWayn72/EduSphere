import { Injectable, Logger } from '@nestjs/common';
import {
  QuizContent,
  QuizItem,
  MultipleChoice,
  DragOrder,
  Hotspot,
  Matching,
  FillBlank,
} from './quiz-schemas';

export interface QuizAnswers {
  [itemIndex: number]: unknown;
}

export interface ItemResult {
  itemIndex: number;
  correct: boolean;
  explanation?: string;
  partialScore?: number;
}

export interface GradeResult {
  score: number;
  passed: boolean;
  itemResults: ItemResult[];
}

@Injectable()
export class QuizGraderService {
  private readonly logger = new Logger(QuizGraderService.name);

  grade(quiz: QuizContent, answers: QuizAnswers): GradeResult {
    const itemResults: ItemResult[] = quiz.items.map((item, idx) =>
      this.gradeItem(item, answers[idx], idx)
    );

    const gradableItems = itemResults.filter(
      (r) => r.partialScore !== undefined
    );
    const totalGradable = gradableItems.length || 1;
    const totalScore = gradableItems.reduce(
      (sum, r) => sum + (r.partialScore ?? 0),
      0
    );
    const score = Math.round((totalScore / totalGradable) * 100);
    const passed = score >= quiz.passingScore;

    this.logger.debug(`Quiz graded: score=${score}, passed=${passed}`);
    return { score, passed, itemResults };
  }

  private gradeItem(item: QuizItem, answer: unknown, idx: number): ItemResult {
    switch (item.type) {
      case 'MULTIPLE_CHOICE':
        return this.gradeMultipleChoice(item, answer, idx);
      case 'DRAG_ORDER':
        return this.gradeDragOrder(item, answer, idx);
      case 'HOTSPOT':
        return this.gradeHotspot(item, answer, idx);
      case 'MATCHING':
        return this.gradeMatching(item, answer, idx);
      case 'LIKERT':
        return { itemIndex: idx, correct: true, partialScore: 1 };
      case 'FILL_BLANK':
        return this.gradeFillBlank(item, answer, idx);
      default:
        return { itemIndex: idx, correct: false, partialScore: 0 };
    }
  }

  private gradeMultipleChoice(
    item: MultipleChoice,
    answer: unknown,
    idx: number
  ): ItemResult {
    const selected = Array.isArray(answer) ? answer : [answer];
    const correct =
      selected.length === item.correctOptionIds.length &&
      selected.every((a) => item.correctOptionIds.includes(String(a)));
    return {
      itemIndex: idx,
      correct,
      explanation: item.explanation,
      partialScore: correct ? 1 : 0,
    };
  }

  private gradeDragOrder(
    item: DragOrder,
    answer: unknown,
    idx: number
  ): ItemResult {
    if (!Array.isArray(answer)) {
      return { itemIndex: idx, correct: false, partialScore: 0 };
    }
    const correct = item.correctOrder.every((id, i) => answer[i] === id);
    return { itemIndex: idx, correct, partialScore: correct ? 1 : 0 };
  }

  private gradeHotspot(
    item: Hotspot,
    answer: unknown,
    idx: number
  ): ItemResult {
    const selected = Array.isArray(answer) ? answer : [];
    const correct =
      selected.length > 0 &&
      selected.every((id) => item.correctHotspotIds.includes(String(id)));
    return { itemIndex: idx, correct, partialScore: correct ? 1 : 0 };
  }

  private gradeMatching(
    item: Matching,
    answer: unknown,
    idx: number
  ): ItemResult {
    if (!Array.isArray(answer)) {
      return { itemIndex: idx, correct: false, partialScore: 0 };
    }
    const matched = answer.filter((pair) =>
      item.correctPairs.some(
        (cp) => cp.leftId === pair.leftId && cp.rightId === pair.rightId
      )
    ).length;
    const total = item.correctPairs.length || 1;
    const partialScore = matched / total;
    return {
      itemIndex: idx,
      correct: partialScore === 1,
      partialScore,
    };
  }

  private gradeFillBlank(
    item: FillBlank,
    answer: unknown,
    idx: number
  ): ItemResult {
    const userAnswer = String(answer ?? '')
      .trim()
      .toLowerCase();
    const correct = item.correctAnswer.trim().toLowerCase() === userAnswer;
    return { itemIndex: idx, correct, partialScore: correct ? 1 : 0 };
  }
}
