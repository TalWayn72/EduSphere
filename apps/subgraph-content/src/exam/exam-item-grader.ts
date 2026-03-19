/**
 * ExamItemGrader — Per-item grading for exam responses.
 * Mirrors QuizGraderService logic but works with exam_items.question_data.
 */

export interface ExamQuestionData {
  type: string;
  correctOptionIds?: string[];
  correctOrder?: string[];
  correctHotspotIds?: string[];
  correctPairs?: Array<{ leftId: string; rightId: string }>;
  correctAnswer?: string;
}

export function gradeExamItem(
  questionData: Record<string, unknown>,
  answerData: unknown,
): boolean {
  const qd = questionData as ExamQuestionData;
  const type = qd.type?.toUpperCase();

  switch (type) {
    case 'MULTIPLE_CHOICE':
      return gradeMultipleChoice(qd, answerData);
    case 'DRAG_ORDER':
      return gradeDragOrder(qd, answerData);
    case 'HOTSPOT':
      return gradeHotspot(qd, answerData);
    case 'MATCHING':
      return gradeMatching(qd, answerData);
    case 'FILL_BLANK':
      return gradeFillBlank(qd, answerData);
    default:
      return false;
  }
}

function gradeMultipleChoice(qd: ExamQuestionData, answer: unknown): boolean {
  const selected = Array.isArray(answer) ? answer : [answer];
  const correct = qd.correctOptionIds ?? [];
  return (
    selected.length === correct.length &&
    selected.every((a) => correct.includes(String(a)))
  );
}

function gradeDragOrder(qd: ExamQuestionData, answer: unknown): boolean {
  if (!Array.isArray(answer)) return false;
  const correct = qd.correctOrder ?? [];
  return correct.every((id, i) => answer[i] === id);
}

function gradeHotspot(qd: ExamQuestionData, answer: unknown): boolean {
  const selected = Array.isArray(answer) ? answer : [];
  const correct = qd.correctHotspotIds ?? [];
  return (
    selected.length > 0 &&
    selected.every((id) => correct.includes(String(id)))
  );
}

function gradeMatching(qd: ExamQuestionData, answer: unknown): boolean {
  if (!Array.isArray(answer)) return false;
  const correct = qd.correctPairs ?? [];
  if (correct.length === 0) return false;
  const matched = answer.filter((pair: Record<string, unknown>) =>
    correct.some(
      (cp) => cp.leftId === pair['leftId'] && cp.rightId === pair['rightId'],
    ),
  ).length;
  return matched === correct.length;
}

function gradeFillBlank(qd: ExamQuestionData, answer: unknown): boolean {
  const userAnswer = String(answer ?? '').trim().toLowerCase();
  const correctAnswer = (qd.correctAnswer ?? '').trim().toLowerCase();
  return correctAnswer.length > 0 && userAnswer === correctAnswer;
}
