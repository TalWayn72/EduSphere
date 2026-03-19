/**
 * Exam input types — mutation inputs and analytics for the Certification Exam System.
 * Aligned to backend SDL: exam-inputs.graphql + exam-sessions.graphql.
 */
import type {
  BloomLevel,
  BlueprintStatus,
  CalibrationStatus,
  DistractorStat,
  ExamItemSource,
  PassingMethod,
} from './exam';
import type { DomainScore, ExamItem } from './exam-entities';

// ── Mutation inputs ──────────────────────────────────────────────────────────
export interface CreateExamItemInput {
  courseId: string;
  moduleId?: string;
  domainTag: string;
  bloomLevel: BloomLevel;
  questionData: unknown;
  source?: ExamItemSource;
}

export interface UpdateExamItemInput {
  domainTag?: string;
  bloomLevel?: BloomLevel;
  questionData?: unknown;
}

export interface ExamItemFilterInput {
  courseId?: string;
  domainTag?: string;
  bloomLevel?: BloomLevel;
  calibrationStatus?: CalibrationStatus;
  source?: ExamItemSource;
}

export interface CreateExamBlueprintInput {
  courseId: string;
  title: string;
  description?: string;
  timeLimitMinutes: number;
  totalQuestions: number;
  passingScore: number;
  passingMethod: PassingMethod;
  domainDistribution: unknown;
  bloomDistribution: unknown;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  maxRetakes?: number;
  retakeCooldownHours?: number;
  isAdaptive?: boolean;
  catMinItems?: number;
  catMaxItems?: number;
}

export interface UpdateExamBlueprintInput {
  title?: string;
  description?: string;
  timeLimitMinutes?: number;
  totalQuestions?: number;
  passingScore?: number;
  passingMethod?: PassingMethod;
  domainDistribution?: unknown;
  bloomDistribution?: unknown;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  maxRetakes?: number;
  retakeCooldownHours?: number;
  isAdaptive?: boolean;
  catMinItems?: number;
  catMaxItems?: number;
  status?: BlueprintStatus;
}

export interface GenerateExamItemsInput {
  courseId: string;
  moduleId?: string;
  domainTag: string;
  bloomLevels: BloomLevel[];
  count: number;
  targetDifficulty?: number;
}

// ── Analytics & statistics ───────────────────────────────────────────────────
export interface ExamItemStatistics {
  itemId: string;
  totalAdministrations: number;
  pValue: number;
  rpbis: number;
  dIndex: number;
  distractorAnalysis: DistractorStat[];
  irtA?: number;
  irtB?: number;
  irtC?: number;
}

export interface ExamReliabilityReport {
  blueprintId: string;
  kr20: number;
  cronbachAlpha: number;
  sem: number;
  totalSessions: number;
  averageScore: number;
}

export interface BlueprintAnalytics {
  blueprintId: string;
  totalSessions: number;
  passRate: number;
  averageScore: number;
  averageTime: number;
  domainBreakdown: DomainScore[];
}

export interface ExamItemGenerationResult {
  generatedCount: number;
  validCount: number;
  items: ExamItem[];
}

export interface ExamTimeEvent {
  sessionId: string;
  timeRemainingSeconds: number;
  isExpired: boolean;
}
