/**
 * Exam entity types — core domain objects for the Certification Exam System.
 * Aligned to backend SDL: exam-types.graphql + exam-sessions.graphql.
 */
import type {
  BloomLevel,
  BlueprintStatus,
  CalibrationStatus,
  ConfidenceInterval,
  ExamItemSource,
  ExamSessionStatus,
  PassingMethod,
  QualityTier,
} from './exam';

// ── Core entities ────────────────────────────────────────────────────────────
export interface ExamItem {
  id: string;
  courseId: string;
  moduleId?: string;
  domainTag: string;
  bloomLevel: BloomLevel;
  questionData: unknown;
  irtA?: number;
  irtB?: number;
  irtC?: number;
  calibrationStatus: CalibrationStatus;
  source: ExamItemSource;
  qualityTier: QualityTier;
  pValue?: number;
  rpbis?: number;
  exposureCount: number;
  createdAt: string;
}

export interface ExamBlueprint {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  timeLimitMinutes: number;
  totalQuestions: number;
  passingScore: number;
  passingMethod: PassingMethod;
  domainDistribution: unknown;
  bloomDistribution: unknown;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  maxRetakes: number;
  retakeCooldownHours: number;
  isAdaptive: boolean;
  catMinItems?: number;
  catMaxItems?: number;
  status: BlueprintStatus;
  version: number;
  createdAt: string;
}

export interface ExamSession {
  id: string;
  blueprintId: string;
  userId: string;
  status: ExamSessionStatus;
  attemptNumber: number;
  startedAt: string;
  submittedAt?: string;
  timeRemainingSeconds?: number;
  questionOrder: string[];
  isAdaptive: boolean;
  currentQuestionIndex?: number;
}

export interface ExamResponse {
  itemId: string;
  answerData: unknown;
  isCorrect?: boolean;
  isFlagged: boolean;
  timeSpentMs?: number;
}

export interface ExamResult {
  id: string;
  sessionId: string;
  rawScore: number;
  scaledScore?: number;
  passed: boolean;
  thetaEstimate?: number;
  sem?: number;
  confidenceInterval?: ConfidenceInterval;
  domainScores: DomainScore[];
  bloomScores: BloomScore[];
  gradedAt: string;
}

export interface DomainScore {
  domain: string;
  correct: number;
  total: number;
  scaledScore?: number;
}

export interface BloomScore {
  level: BloomLevel;
  correct: number;
  total: number;
}
