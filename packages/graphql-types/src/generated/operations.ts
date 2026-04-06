export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
  JSON: { input: unknown; output: unknown; }
  /**
   * Content Ingestion — Phase 40 Sprint D.
   * Accepts a file upload (base64 via Upload scalar) and runs the full OCR pipeline:
   *   Tier 1: Tesseract.js (embedded)
   *   Tier 2: PaddleOCR (port 8001) when Tesseract confidence < 70%
   *   Tier 3: TrOCR (port 8002) when Moondream detects handwriting
   */
  Upload: { input: File; output: File; }
  join__FieldSet: { input: string; output: string; }
  link__Import: { input: string; output: string; }
  requiresScopes__Scope: { input: string; output: string; }
};

export type ActivityEntry = {
  __typename?: 'ActivityEntry';
  date: Scalars['DateTime']['output'];
  description: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export enum ActivityEventType {
  AiSession = 'AI_SESSION',
  AnnotationAdded = 'ANNOTATION_ADDED',
  CourseEnrolled = 'COURSE_ENROLLED',
  LessonCompleted = 'LESSON_COMPLETED',
  QuizPassed = 'QUIZ_PASSED'
}

export type ActivityFeedItem = {
  __typename?: 'ActivityFeedItem';
  description: Scalars['String']['output'];
  eventType: ActivityEventType;
  id: Scalars['ID']['output'];
  occurredAt: Scalars['String']['output'];
};

/**
 * Adaptive learning path for a course, personalized to the user's mastery gaps.
 * Items are sorted descending by priorityScore: gap items first, mastered items last.
 */
export type AdaptiveLearningPath = {
  __typename?: 'AdaptiveLearningPath';
  courseId: Scalars['ID']['output'];
  items: Array<AdaptivePathItem>;
  masteryGapCount: Scalars['Int']['output'];
  timeBudgetMinutes: Scalars['Int']['output'];
};

/** A single item in the adaptive learning path, ranked by mastery gap and time budget. */
export type AdaptivePathItem = {
  __typename?: 'AdaptivePathItem';
  contentItemId: Scalars['ID']['output'];
  estimatedMinutes: Scalars['Int']['output'];
  priorityScore: Scalars['Float']['output'];
  reason: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type AddFileSourceInput = {
  /** Base64-encoded file content */
  contentBase64: Scalars['String']['input'];
  courseId: Scalars['ID']['input'];
  /** Original filename — used to determine SourceType (pdf/docx/txt) */
  fileName: Scalars['String']['input'];
  /** MIME type hint (e.g. application/pdf) */
  mimeType: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type AddLessonAssetInput = {
  assetType: LessonAssetType;
  fileUrl?: InputMaybe<Scalars['String']['input']>;
  mediaAssetId?: InputMaybe<Scalars['ID']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  sourceUrl?: InputMaybe<Scalars['String']['input']>;
};

export type AddLessonStepInput = {
  config?: InputMaybe<Scalars['JSON']['input']>;
  planId: Scalars['ID']['input'];
  stepType: LessonStepType;
};

export type AddMessageInput = {
  content: Scalars['String']['input'];
  messageType: MessageType;
  parentMessageId?: InputMaybe<Scalars['ID']['input']>;
};

export type AddTextSourceInput = {
  courseId: Scalars['ID']['input'];
  text: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type AddUrlSourceInput = {
  courseId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
  url: Scalars['String']['input'];
};

export type AddYoutubeSourceInput = {
  courseId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
  /** Full YouTube video URL (youtube.com/watch?v=... or youtu.be/...) */
  url: Scalars['String']['input'];
};

export type AdminDashboardStats = {
  __typename?: 'AdminDashboardStats';
  activeUsers: Scalars['Int']['output'];
  publishedCourses: Scalars['Int']['output'];
  storageUsedMb: Scalars['Float']['output'];
  totalAnnotations: Scalars['Int']['output'];
  totalCourses: Scalars['Int']['output'];
  totalUsers: Scalars['Int']['output'];
};

export type AdminEnrollmentRecord = {
  __typename?: 'AdminEnrollmentRecord';
  completedAt?: Maybe<Scalars['String']['output']>;
  courseId: Scalars['ID']['output'];
  enrolledAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type AdminOverview = {
  __typename?: 'AdminOverview';
  activeUsersThisMonth: Scalars['Int']['output'];
  atRiskCount: Scalars['Int']['output'];
  completionsThisMonth: Scalars['Int']['output'];
  lastComplianceReport?: Maybe<Scalars['String']['output']>;
  lastScimSync?: Maybe<Scalars['String']['output']>;
  storageUsedMb: Scalars['Float']['output'];
  totalCourses: Scalars['Int']['output'];
  totalUsers: Scalars['Int']['output'];
};

export type AdminUsersResult = {
  __typename?: 'AdminUsersResult';
  total: Scalars['Int']['output'];
  users: Array<User>;
};

export type AgentExecution = {
  __typename?: 'AgentExecution';
  agent: AgentTemplate;
  agentId: Scalars['ID']['output'];
  completedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  input: Scalars['JSON']['output'];
  metadata: Scalars['JSON']['output'];
  output?: Maybe<Scalars['JSON']['output']>;
  startedAt?: Maybe<Scalars['String']['output']>;
  status: AgentExecutionStatus;
  user: User;
  userId: Scalars['ID']['output'];
};

export enum AgentExecutionStatus {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Queued = 'QUEUED',
  Running = 'RUNNING'
}

export type AgentLessonPipelineResult = {
  __typename?: 'AgentLessonPipelineResult';
  citations: Array<Scalars['String']['output']>;
  executionId: Scalars['ID']['output'];
  hebrewNerEntities: Array<Scalars['String']['output']>;
  markdownContent?: Maybe<Scalars['String']['output']>;
  stage: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type AgentMessage = {
  __typename?: 'AgentMessage';
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  role: MessageRole;
  session: AgentSession;
  sessionId: Scalars['ID']['output'];
};

export type AgentSession = {
  __typename?: 'AgentSession';
  completedAt?: Maybe<Scalars['String']['output']>;
  contextData?: Maybe<Scalars['JSON']['output']>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  messages: Array<AgentMessage>;
  status: AgentSessionStatus;
  templateType: TemplateType;
  user: User;
  userId: Scalars['ID']['output'];
};

export enum AgentSessionStatus {
  Active = 'ACTIVE',
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Failed = 'FAILED'
}

export type AgentTemplate = {
  __typename?: 'AgentTemplate';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  parameters: Scalars['JSON']['output'];
  systemPrompt: Scalars['String']['output'];
  templateType: TemplateType;
};

export type AiUsageStats = {
  __typename?: 'AiUsageStats';
  estimatedTokensUsed: Scalars['Int']['output'];
  topCourseId?: Maybe<Scalars['ID']['output']>;
  topCourseRequests: Scalars['Int']['output'];
  totalRequests: Scalars['Int']['output'];
  uniqueLearnersUsed: Scalars['Int']['output'];
};

/**
 * Spaced-repetition scheduling algorithm to use when creating or reviewing a card.
 * SM2 uses the classic SuperMemo-2 algorithm (quality 0-5).
 * FSRS uses the FSRS-4.5 algorithm (quality 1-4).
 */
export enum AlgorithmType {
  Fsrs = 'FSRS',
  Sm2 = 'SM2'
}

export enum AnalyticsPeriod {
  NinetyDays = 'NINETY_DAYS',
  SevenDays = 'SEVEN_DAYS',
  ThirtyDays = 'THIRTY_DAYS'
}

export type AnalyticsSnapshot = {
  __typename?: 'AnalyticsSnapshot';
  activeLearners: Scalars['Int']['output'];
  completions: Scalars['Int']['output'];
  date: Scalars['String']['output'];
  learningMinutes: Scalars['Int']['output'];
  newEnrollments: Scalars['Int']['output'];
};

export type Annotation = {
  __typename?: 'Annotation';
  annotationType: AnnotationType;
  assetId: Scalars['ID']['output'];
  content: Scalars['JSON']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isResolved: Scalars['Boolean']['output'];
  layer: AnnotationLayer;
  parent?: Maybe<Annotation>;
  parentId?: Maybe<Scalars['ID']['output']>;
  spatialData?: Maybe<Scalars['JSON']['output']>;
  tenantId: Scalars['ID']['output'];
  /** Text range for inline annotations (INLINE_COMMENT, SUGGESTION types) */
  textRange?: Maybe<TextRange>;
  updatedAt: Scalars['DateTime']['output'];
  user?: Maybe<User>;
  userId: Scalars['ID']['output'];
};

export enum AnnotationLayer {
  AiGenerated = 'AI_GENERATED',
  Instructor = 'INSTRUCTOR',
  Personal = 'PERSONAL',
  Shared = 'SHARED'
}

export enum AnnotationType {
  Bookmark = 'BOOKMARK',
  InlineComment = 'INLINE_COMMENT',
  Link = 'LINK',
  Sketch = 'SKETCH',
  SpatialComment = 'SPATIAL_COMMENT',
  Suggestion = 'SUGGESTION',
  Text = 'TEXT'
}

export type Announcement = {
  __typename?: 'Announcement';
  body: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  createdBy?: Maybe<Scalars['ID']['output']>;
  expiresAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  priority: Scalars['String']['output'];
  publishAt?: Maybe<Scalars['String']['output']>;
  targetAudience: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type AnnouncementResult = {
  __typename?: 'AnnouncementResult';
  announcements: Array<Announcement>;
  total: Scalars['Int']['output'];
};

export type ApiKey = {
  __typename?: 'ApiKey';
  createdAt: Scalars['DateTime']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  keyPrefix: Scalars['String']['output'];
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  rateLimitPerMinute: Scalars['Int']['output'];
  scopes: Array<Scalars['String']['output']>;
};

export type ApiKeyCreated = {
  __typename?: 'ApiKeyCreated';
  apiKey: ApiKey;
  plainTextKey: Scalars['String']['output'];
};

export type AssessmentCampaign = {
  __typename?: 'AssessmentCampaign';
  criteriaCount: Scalars['Int']['output'];
  dueDate?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  status: AssessmentStatus;
  targetUserId: Scalars['ID']['output'];
  title: Scalars['String']['output'];
};

export type AssessmentResult = {
  __typename?: 'AssessmentResult';
  aggregatedScores: Array<CriteriaAggregation>;
  campaignId: Scalars['ID']['output'];
  generatedAt: Scalars['String']['output'];
  summary: Scalars['String']['output'];
};

export enum AssessmentStatus {
  Active = 'ACTIVE',
  Completed = 'COMPLETED',
  Draft = 'DRAFT'
}

/** Type of media asset stored in the system. */
export enum AssetType {
  Audio = 'AUDIO',
  Document = 'DOCUMENT',
  Image = 'IMAGE',
  Model_3D = 'MODEL_3D',
  Video = 'VIDEO'
}

export type AtRiskLearner = {
  __typename?: 'AtRiskLearner';
  courseId: Scalars['ID']['output'];
  courseTitle: Scalars['String']['output'];
  daysSinceActive: Scalars['Int']['output'];
  daysSinceLastActivity: Scalars['Int']['output'];
  displayName: Scalars['String']['output'];
  flaggedAt: Scalars['DateTime']['output'];
  learnerId: Scalars['ID']['output'];
  progressPct: Scalars['Int']['output'];
  progressPercent: Scalars['Float']['output'];
  riskFactors: Array<RiskFactor>;
  riskScore: Scalars['Float']['output'];
  userId: Scalars['ID']['output'];
};

export type AtRiskLearnerItem = {
  __typename?: 'AtRiskLearnerItem';
  completionRate: Scalars['Float']['output'];
  email: Scalars['String']['output'];
  lastActive?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  quizPassRate: Scalars['Float']['output'];
  riskLevel: RiskLevel;
  userId: Scalars['ID']['output'];
};

export type AtRiskThresholds = {
  __typename?: 'AtRiskThresholds';
  inactivityDays: Scalars['Int']['output'];
  minCompletionPct: Scalars['Float']['output'];
  minQuizScorePct: Scalars['Float']['output'];
};

export type AtRiskThresholdsInput = {
  inactivityDays: Scalars['Int']['input'];
  minCompletionPct: Scalars['Float']['input'];
  minQuizScorePct: Scalars['Float']['input'];
};

export enum AuditExportFormat {
  Csv = 'CSV',
  Json = 'JSON'
}

export type AuditExportResult = {
  __typename?: 'AuditExportResult';
  expiresAt: Scalars['String']['output'];
  presignedUrl: Scalars['String']['output'];
  recordCount: Scalars['Int']['output'];
};

export type AuditLogEntry = {
  __typename?: 'AuditLogEntry';
  action: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  ipAddress?: Maybe<Scalars['String']['output']>;
  metadata?: Maybe<Scalars['String']['output']>;
  requestId?: Maybe<Scalars['String']['output']>;
  resourceId?: Maybe<Scalars['ID']['output']>;
  resourceType?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  tenantId: Scalars['ID']['output'];
  userId?: Maybe<Scalars['ID']['output']>;
};

export type AuditLogResult = {
  __typename?: 'AuditLogResult';
  entries: Array<AuditLogEntry>;
  total: Scalars['Int']['output'];
};

/** Personalized learning path toward a target concept, showing per-node completion. */
export type AutoPath = {
  __typename?: 'AutoPath';
  completedSteps: Scalars['Int']['output'];
  nodes: Array<AutoPathNode>;
  targetConceptName: Scalars['String']['output'];
  totalSteps: Scalars['Int']['output'];
};

/** A single node in the personalized learning path (concept + completion status). */
export type AutoPathNode = {
  __typename?: 'AutoPathNode';
  conceptName: Scalars['String']['output'];
  contentItems: Array<Scalars['String']['output']>;
  isCompleted: Scalars['Boolean']['output'];
};

export type BiApiToken = {
  __typename?: 'BIApiToken';
  createdAt: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  lastUsedAt?: Maybe<Scalars['String']['output']>;
};

export type Badge = {
  __typename?: 'Badge';
  category: Scalars['String']['output'];
  conditionType: Scalars['String']['output'];
  conditionValue: Scalars['Int']['output'];
  description: Scalars['String']['output'];
  iconEmoji: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  pointsReward: Scalars['Int']['output'];
};

/** Result of verifying a badge assertion's Ed25519 proof */
export type BadgeVerificationResult = {
  __typename?: 'BadgeVerificationResult';
  assertion?: Maybe<OpenBadgeAssertion>;
  error?: Maybe<Scalars['String']['output']>;
  valid: Scalars['Boolean']['output'];
};

export enum BloomLevel {
  Analyze = 'ANALYZE',
  Apply = 'APPLY',
  Create = 'CREATE',
  Evaluate = 'EVALUATE',
  Remember = 'REMEMBER',
  Understand = 'UNDERSTAND'
}

export type BloomScore = {
  __typename?: 'BloomScore';
  correct: Scalars['Int']['output'];
  level: BloomLevel;
  total: Scalars['Int']['output'];
};

export type BlueprintAnalytics = {
  __typename?: 'BlueprintAnalytics';
  averageScore: Scalars['Float']['output'];
  averageTime: Scalars['Float']['output'];
  blueprintId: Scalars['ID']['output'];
  domainBreakdown: Array<DomainScore>;
  passRate: Scalars['Float']['output'];
  totalSessions: Scalars['Int']['output'];
};

export enum BlueprintStatus {
  Active = 'ACTIVE',
  Archived = 'ARCHIVED',
  Draft = 'DRAFT'
}

export type BrandedLoginData = {
  __typename?: 'BrandedLoginData';
  logoUrl?: Maybe<Scalars['String']['output']>;
  orgName: Scalars['String']['output'];
  primaryColor?: Maybe<Scalars['String']['output']>;
  secondaryColor?: Maybe<Scalars['String']['output']>;
  ssoProviders: Array<SsoProvider>;
  welcomeMessage?: Maybe<Scalars['String']['output']>;
};

export type BreakoutRoom = {
  __typename?: 'BreakoutRoom';
  assignedUserIds: Array<Scalars['ID']['output']>;
  capacity: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  roomName: Scalars['String']['output'];
  sessionId: Scalars['ID']['output'];
};

export type BulkImportResult = {
  __typename?: 'BulkImportResult';
  created: Scalars['Int']['output'];
  errors: Array<Scalars['String']['output']>;
  failed: Scalars['Int']['output'];
  updated: Scalars['Int']['output'];
};

export enum CalibrationStatus {
  Calibrated = 'CALIBRATED',
  Draft = 'DRAFT',
  Pilot = 'PILOT',
  Retired = 'RETIRED'
}

export type CertExamGenResult = {
  __typename?: 'CertExamGenResult';
  executionId: Scalars['ID']['output'];
  itemCount: Scalars['Int']['output'];
  status: Scalars['String']['output'];
};

export type Certificate = {
  __typename?: 'Certificate';
  courseId: Scalars['ID']['output'];
  courseName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  issuedAt: Scalars['String']['output'];
  pdfUrl?: Maybe<Scalars['String']['output']>;
  verificationCode: Scalars['String']['output'];
};

export type ChallengeParticipant = {
  __typename?: 'ChallengeParticipant';
  challengeId: Scalars['ID']['output'];
  completedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  joinedAt: Scalars['String']['output'];
  rank?: Maybe<Scalars['Int']['output']>;
  score: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
};

export enum ChallengeStatus {
  Active = 'ACTIVE',
  Completed = 'COMPLETED',
  Draft = 'DRAFT'
}

export enum ChallengeType {
  Discussion = 'DISCUSSION',
  Project = 'PROJECT',
  Quiz = 'QUIZ'
}

export type ChannelAnalytics = {
  __typename?: 'ChannelAnalytics';
  channel: NotificationChannel;
  delivered: Scalars['Int']['output'];
  failed: Scalars['Int']['output'];
  sent: Scalars['Int']['output'];
};

export type ChavrutaPartnerMatch = {
  __typename?: 'ChavrutaPartnerMatch';
  compatibilityScore: Scalars['Float']['output'];
  courseId: Scalars['ID']['output'];
  matchReason: Scalars['String']['output'];
  partnerId: Scalars['ID']['output'];
  partnerName: Scalars['String']['output'];
  topic: Scalars['String']['output'];
};

export type ChavrutaPartnerSession = {
  __typename?: 'ChavrutaPartnerSession';
  courseId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  initiatedAt: Scalars['String']['output'];
  initiatorId: Scalars['ID']['output'];
  partnerId: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  topic: Scalars['String']['output'];
};

export type CheckoutSession = {
  __typename?: 'CheckoutSession';
  sessionId: Scalars['String']['output'];
  sessionUrl: Scalars['String']['output'];
};

export enum CitationMatchStatus {
  Failed = 'FAILED',
  Unverified = 'UNVERIFIED',
  Verified = 'VERIFIED'
}

export type CohortInsight = {
  __typename?: 'CohortInsight';
  annotationId: Scalars['ID']['output'];
  authorCohortLabel: Scalars['String']['output'];
  conceptId: Scalars['ID']['output'];
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  relevanceScore: Scalars['Float']['output'];
};

export type CohortInsightsResult = {
  __typename?: 'CohortInsightsResult';
  conceptId: Scalars['ID']['output'];
  courseId: Scalars['ID']['output'];
  insights: Array<CohortInsight>;
  totalPastDiscussions: Scalars['Int']['output'];
};

export type CohortMetrics = {
  __typename?: 'CohortMetrics';
  activeAt7Days: Scalars['Int']['output'];
  activeAt30Days: Scalars['Int']['output'];
  cohortWeek: Scalars['String']['output'];
  completionRate30Days: Scalars['Float']['output'];
  enrolled: Scalars['Int']['output'];
};

/** A collaborative document with CRDT state */
export type CollabDocument = {
  __typename?: 'CollabDocument';
  compactedAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  sizeBytes: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type CompetencyGoal = {
  __typename?: 'CompetencyGoal';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  targetConceptName: Scalars['String']['output'];
  targetLevel?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
};

export type ComplianceCourse = {
  __typename?: 'ComplianceCourse';
  category: Scalars['String']['output'];
  complianceDueDate?: Maybe<Scalars['String']['output']>;
  description: Scalars['String']['output'];
  estimatedHours?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  isCompliance: Scalars['Boolean']['output'];
  isPublished: Scalars['Boolean']['output'];
  isTemplate: Scalars['Boolean']['output'];
  slug: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type ComplianceReportResult = {
  __typename?: 'ComplianceReportResult';
  csvUrl: Scalars['String']['output'];
  pdfUrl: Scalars['String']['output'];
  summary: ComplianceSummary;
};

export type ComplianceSummary = {
  __typename?: 'ComplianceSummary';
  completedCount: Scalars['Int']['output'];
  completionRate: Scalars['Float']['output'];
  generatedAt: Scalars['String']['output'];
  overdueCount: Scalars['Int']['output'];
  totalEnrollments: Scalars['Int']['output'];
  totalUsers: Scalars['Int']['output'];
};

export type Concept = {
  __typename?: 'Concept';
  createdAt: Scalars['String']['output'];
  definition: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  sourceIds: Array<Scalars['ID']['output']>;
  tenantId: Scalars['ID']['output'];
  updatedAt: Scalars['String']['output'];
};

/**
 * A lightweight concept node used in learning path and prerequisite chain results.
 * Distinct from the full Concept entity — carries only the fields needed for path display.
 */
export type ConceptNode = {
  __typename?: 'ConceptNode';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  type?: Maybe<Scalars['String']['output']>;
};

export type ConceptRelationship = {
  __typename?: 'ConceptRelationship';
  description?: Maybe<Scalars['String']['output']>;
  fromConcept: Concept;
  inferred?: Maybe<Scalars['Boolean']['output']>;
  relationshipType: Scalars['String']['output'];
  strength?: Maybe<Scalars['Float']['output']>;
  toConcept: Concept;
};

export enum ConsentType {
  AiProcessing = 'AI_PROCESSING',
  Analytics = 'ANALYTICS',
  Marketing = 'MARKETING',
  Research = 'RESEARCH',
  ThirdPartyLlm = 'THIRD_PARTY_LLM'
}

export type ContentIngestionResult = {
  __typename?: 'ContentIngestionResult';
  aiCaption?: Maybe<Scalars['String']['output']>;
  contentItemId: Scalars['ID']['output'];
  estimatedDuration: Scalars['Int']['output'];
  extractedText: Scalars['String']['output'];
  isHandwritten: Scalars['Boolean']['output'];
  ocrConfidence: Scalars['Float']['output'];
  ocrMethod: OcrMethod;
  pageCount?: Maybe<Scalars['Int']['output']>;
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  topics: Array<Scalars['String']['output']>;
  warnings: Array<Scalars['String']['output']>;
};

export type ContentItem = {
  __typename?: 'ContentItem';
  content?: Maybe<Scalars['String']['output']>;
  contentType: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  duration?: Maybe<Scalars['Int']['output']>;
  fileId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  moduleId: Scalars['ID']['output'];
  orderIndex: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type ContentItemMetric = {
  __typename?: 'ContentItemMetric';
  avgTimeSpentSeconds: Scalars['Int']['output'];
  completionRate: Scalars['Float']['output'];
  contentItemId: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  viewCount: Scalars['Int']['output'];
};

export type ContentTranslation = {
  __typename?: 'ContentTranslation';
  contentItemId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  locale: Scalars['String']['output'];
  modelUsed: Scalars['String']['output'];
  qualityScore?: Maybe<Scalars['Float']['output']>;
  translatedDescription?: Maybe<Scalars['String']['output']>;
  translatedSummary?: Maybe<Scalars['String']['output']>;
  translatedTitle?: Maybe<Scalars['String']['output']>;
  translatedTranscript?: Maybe<Scalars['String']['output']>;
  translationStatus: TranslationStatus;
};

export enum ContentType {
  Assignment = 'ASSIGNMENT',
  Audio = 'AUDIO',
  Link = 'LINK',
  LiveSession = 'LIVE_SESSION',
  Markdown = 'MARKDOWN',
  Microlesson = 'MICROLESSON',
  Pdf = 'PDF',
  Quiz = 'QUIZ',
  RichDocument = 'RICH_DOCUMENT',
  Scenario = 'SCENARIO',
  Scorm = 'SCORM',
  Video = 'VIDEO'
}

export type Course = {
  __typename?: 'Course';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  estimatedHours?: Maybe<Scalars['Int']['output']>;
  forkedFromId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  instructor?: Maybe<User>;
  instructorId: Scalars['ID']['output'];
  isPublished: Scalars['Boolean']['output'];
  modules: Array<Module>;
  slug: Scalars['String']['output'];
  tenantId: Scalars['ID']['output'];
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type CourseAnalytics = {
  __typename?: 'CourseAnalytics';
  activeLearnersLast7Days: Scalars['Int']['output'];
  avgQuizScore?: Maybe<Scalars['Float']['output']>;
  completionRate: Scalars['Float']['output'];
  contentItemMetrics: Array<ContentItemMetric>;
  courseId: Scalars['ID']['output'];
  dropOffFunnel: Array<FunnelStep>;
  enrollmentCount: Scalars['Int']['output'];
};

export type CourseAnalyticsItem = {
  __typename?: 'CourseAnalyticsItem';
  avgTimeToComplete?: Maybe<Scalars['Float']['output']>;
  completionRate: Scalars['Float']['output'];
  courseId: Scalars['ID']['output'];
  enrollmentCount: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export type CourseCompletionMetric = {
  __typename?: 'CourseCompletionMetric';
  avgTimeToCompleteHours?: Maybe<Scalars['Float']['output']>;
  completionRate: Scalars['Float']['output'];
  courseId: Scalars['ID']['output'];
  courseTitle: Scalars['String']['output'];
  enrollmentCount: Scalars['Int']['output'];
};

export type CourseGenerationResult = {
  __typename?: 'CourseGenerationResult';
  courseDescription?: Maybe<Scalars['String']['output']>;
  courseTitle?: Maybe<Scalars['String']['output']>;
  draftCourseId?: Maybe<Scalars['ID']['output']>;
  executionId: Scalars['ID']['output'];
  modules: Array<GeneratedModule>;
  status: Scalars['String']['output'];
};

export type CourseLessonPlan = {
  __typename?: 'CourseLessonPlan';
  courseId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  status: CourseLessonPlanStatus;
  steps: Array<CourseLessonStep>;
  title: Scalars['String']['output'];
};

export enum CourseLessonPlanStatus {
  Archived = 'ARCHIVED',
  Draft = 'DRAFT',
  Published = 'PUBLISHED'
}

export type CourseLessonStep = {
  __typename?: 'CourseLessonStep';
  config: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  stepOrder: Scalars['Int']['output'];
  stepType: LessonStepType;
};

export type CourseLicense = {
  __typename?: 'CourseLicense';
  courseId: Scalars['ID']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  licenseType: LicenseType;
  licensedAt: Scalars['DateTime']['output'];
  maxSeats?: Maybe<Scalars['Int']['output']>;
  status: LicenseStatus;
  usedSeats: Scalars['Int']['output'];
};

export type CourseListing = {
  __typename?: 'CourseListing';
  courseId: Scalars['ID']['output'];
  currency?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  enrollmentCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  instructorName: Scalars['String']['output'];
  isPublished: Scalars['Boolean']['output'];
  price?: Maybe<Scalars['Float']['output']>;
  priceCents: Scalars['Int']['output'];
  rating?: Maybe<Scalars['Float']['output']>;
  revenueSplitPercent: Scalars['Int']['output'];
  tags: Array<Scalars['String']['output']>;
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  totalLessons: Scalars['Int']['output'];
};

export type CourseListingConnection = {
  __typename?: 'CourseListingConnection';
  edges: Array<CourseListingEdge>;
  nodes: Array<CourseListing>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type CourseListingEdge = {
  __typename?: 'CourseListingEdge';
  cursor: Scalars['String']['output'];
  node: CourseListing;
};

export type CourseListingFiltersInput = {
  instructorName?: InputMaybe<Scalars['String']['input']>;
  priceMax?: InputMaybe<Scalars['Float']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CourseProgress = {
  __typename?: 'CourseProgress';
  completedItems: Scalars['Int']['output'];
  courseId: Scalars['ID']['output'];
  percentComplete: Scalars['Float']['output'];
  totalItems: Scalars['Int']['output'];
};

export type CourseReadiness = {
  __typename?: 'CourseReadiness';
  checks: Array<CourseReadinessCheck>;
  ready: Scalars['Boolean']['output'];
};

export type CourseReadinessCheck = {
  __typename?: 'CourseReadinessCheck';
  id: Scalars['ID']['output'];
  message?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  passed: Scalars['Boolean']['output'];
};

export type CpdCreditType = {
  __typename?: 'CpdCreditType';
  creditHoursPerHour: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  regulatoryBody: Scalars['String']['output'];
};

export enum CpdExportFormat {
  Ama = 'AMA',
  Csv = 'CSV',
  Nasba = 'NASBA'
}

export type CpdLogEntry = {
  __typename?: 'CpdLogEntry';
  completionDate: Scalars['String']['output'];
  courseId: Scalars['ID']['output'];
  creditTypeName: Scalars['String']['output'];
  earnedHours: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
};

export type CpdReport = {
  __typename?: 'CpdReport';
  byType: Array<CpdTypeSummary>;
  entries: Array<CpdLogEntry>;
  totalHours: Scalars['Float']['output'];
};

export type CpdTypeSummary = {
  __typename?: 'CpdTypeSummary';
  name: Scalars['String']['output'];
  regulatoryBody: Scalars['String']['output'];
  totalHours: Scalars['Float']['output'];
};

export type CreateAgentTemplateInput = {
  name: Scalars['String']['input'];
  parameters?: InputMaybe<Scalars['JSON']['input']>;
  systemPrompt: Scalars['String']['input'];
  templateType: TemplateType;
};

export type CreateAnnotationInput = {
  annotationType: AnnotationType;
  assetId: Scalars['ID']['input'];
  content: Scalars['JSON']['input'];
  layer?: InputMaybe<AnnotationLayer>;
  parentId?: InputMaybe<Scalars['ID']['input']>;
  spatialData?: InputMaybe<Scalars['JSON']['input']>;
  /** Text range for inline annotations (INLINE_COMMENT, SUGGESTION types) */
  textRange?: InputMaybe<TextRangeInput>;
};

export type CreateAnnouncementInput = {
  body: Scalars['String']['input'];
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  priority: Scalars['String']['input'];
  publishAt?: InputMaybe<Scalars['String']['input']>;
  targetAudience: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type CreateApiKeyInput = {
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  name: Scalars['String']['input'];
  rateLimitPerMinute?: InputMaybe<Scalars['Int']['input']>;
  scopes: Array<Scalars['String']['input']>;
};

export type CreateBadgeInput = {
  category: Scalars['String']['input'];
  conditionType: Scalars['String']['input'];
  conditionValue: Scalars['Int']['input'];
  description: Scalars['String']['input'];
  iconEmoji: Scalars['String']['input'];
  name: Scalars['String']['input'];
  pointsReward: Scalars['Int']['input'];
};

export type CreateBreakoutRoomInput = {
  assignedUserIds?: InputMaybe<Array<Scalars['ID']['input']>>;
  capacity: Scalars['Int']['input'];
  roomName: Scalars['String']['input'];
};

export type CreateChallengeInput = {
  challengeType: ChallengeType;
  courseId?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  endDate: Scalars['String']['input'];
  maxParticipants?: InputMaybe<Scalars['Int']['input']>;
  startDate: Scalars['String']['input'];
  targetScore: Scalars['Int']['input'];
  title: Scalars['String']['input'];
};

export type CreateChavrutaPartnerSessionInput = {
  courseId: Scalars['ID']['input'];
  partnerId: Scalars['ID']['input'];
  topic: Scalars['String']['input'];
};

export type CreateConceptInput = {
  definition: Scalars['String']['input'];
  name: Scalars['String']['input'];
  sourceIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type CreateContentItemInput = {
  body?: InputMaybe<Scalars['String']['input']>;
  contentType: ContentType;
  mediaAssetId?: InputMaybe<Scalars['ID']['input']>;
  moduleId: Scalars['ID']['input'];
  order?: InputMaybe<Scalars['Int']['input']>;
  title: Scalars['String']['input'];
};

export type CreateCourseInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  estimatedHours?: InputMaybe<Scalars['Int']['input']>;
  instructorId: Scalars['ID']['input'];
  isPublished?: InputMaybe<Scalars['Boolean']['input']>;
  slug: Scalars['String']['input'];
  thumbnailUrl?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type CreateDiscussionInput = {
  courseId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  discussionType: DiscussionType;
  title: Scalars['String']['input'];
};

export type CreateEmbeddingInput = {
  chunkText: Scalars['String']['input'];
  contentItemId: Scalars['ID']['input'];
  embedding: Array<Scalars['Float']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
};

export type CreateExamBlueprintInput = {
  bloomDistribution: Scalars['JSON']['input'];
  catMaxItems?: InputMaybe<Scalars['Int']['input']>;
  catMinItems?: InputMaybe<Scalars['Int']['input']>;
  courseId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  domainDistribution: Scalars['JSON']['input'];
  isAdaptive?: InputMaybe<Scalars['Boolean']['input']>;
  maxRetakes?: InputMaybe<Scalars['Int']['input']>;
  passingMethod: PassingMethod;
  passingScore: Scalars['Float']['input'];
  retakeCooldownHours?: InputMaybe<Scalars['Int']['input']>;
  shuffleAnswers?: InputMaybe<Scalars['Boolean']['input']>;
  shuffleQuestions?: InputMaybe<Scalars['Boolean']['input']>;
  timeLimitMinutes: Scalars['Int']['input'];
  title: Scalars['String']['input'];
  totalQuestions: Scalars['Int']['input'];
};

export type CreateExamItemInput = {
  bloomLevel: BloomLevel;
  courseId: Scalars['ID']['input'];
  domainTag: Scalars['String']['input'];
  moduleId?: InputMaybe<Scalars['ID']['input']>;
  questionData: Scalars['JSON']['input'];
  source?: InputMaybe<ExamItemSource>;
};

export type CreateLessonInput = {
  courseId: Scalars['ID']['input'];
  instructorId: Scalars['ID']['input'];
  lessonDate?: InputMaybe<Scalars['String']['input']>;
  moduleId?: InputMaybe<Scalars['ID']['input']>;
  series?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  type: LessonType;
};

export type CreateLessonPlanInput = {
  courseId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};

export type CreateModuleInput = {
  courseId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  orderIndex: Scalars['Int']['input'];
  title: Scalars['String']['input'];
};

export type CreateOrgBadgeInput = {
  autoAwardCriteria?: InputMaybe<Scalars['JSON']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  iconUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  xpRequired: Scalars['Int']['input'];
};

export type CreateOrganizationInput = {
  adminEmail: Scalars['String']['input'];
  adminFirstName: Scalars['String']['input'];
  adminLastName: Scalars['String']['input'];
  idempotencyKey: Scalars['String']['input'];
  name: Scalars['String']['input'];
  slug: Scalars['String']['input'];
};

export type CreatePersonInput = {
  bio?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreatePipelineTemplateInput = {
  config?: InputMaybe<Scalars['JSON']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  nodes: Scalars['JSON']['input'];
};

export type CreateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  permissions: Array<Scalars['String']['input']>;
};

export type CreateRubricInput = {
  contentItemId: Scalars['ID']['input'];
  criteria: Scalars['String']['input'];
  isAnonymous?: InputMaybe<Scalars['Boolean']['input']>;
  minReviewers?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateSavedSearchInput = {
  filters?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  query: Scalars['String']['input'];
};

export type CreateSkillPathInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  estimatedHours?: InputMaybe<Scalars['Int']['input']>;
  skillIds: Array<Scalars['ID']['input']>;
  targetRole?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type CreateSourceInput = {
  title: Scalars['String']['input'];
  type: Scalars['String']['input'];
  url?: InputMaybe<Scalars['String']['input']>;
};

export type CreateTermInput = {
  definition: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type CreateTopicClusterInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateUserInput = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  role: UserRole;
  tenantId: Scalars['ID']['input'];
};

export type CreateVisualAnchorInput = {
  anchorText: Scalars['String']['input'];
  courseId: Scalars['ID']['input'];
  documentOrder: Scalars['Int']['input'];
  mediaAssetId: Scalars['ID']['input'];
  pageEnd?: InputMaybe<Scalars['Int']['input']>;
  pageNumber?: InputMaybe<Scalars['Int']['input']>;
  posH?: InputMaybe<Scalars['Float']['input']>;
  posW?: InputMaybe<Scalars['Float']['input']>;
  posX?: InputMaybe<Scalars['Float']['input']>;
  posXEnd?: InputMaybe<Scalars['Float']['input']>;
  posY?: InputMaybe<Scalars['Float']['input']>;
  posYEnd?: InputMaybe<Scalars['Float']['input']>;
};

export type CreateWebhookInput = {
  events: Array<Scalars['String']['input']>;
  url: Scalars['String']['input'];
};

export type CredentialProgram = {
  __typename?: 'CredentialProgram';
  badgeEmoji: Scalars['String']['output'];
  description: Scalars['String']['output'];
  enrollmentCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  published: Scalars['Boolean']['output'];
  requiredCourseIds: Array<Scalars['ID']['output']>;
  title: Scalars['String']['output'];
  totalHours: Scalars['Int']['output'];
};

export type CriteriaAggregation = {
  __typename?: 'CriteriaAggregation';
  criteriaId: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  managerScore?: Maybe<Scalars['Float']['output']>;
  overallAvg: Scalars['Float']['output'];
  peerAvg?: Maybe<Scalars['Float']['output']>;
  selfScore?: Maybe<Scalars['Float']['output']>;
};

export type CrmConnection = {
  __typename?: 'CrmConnection';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  instanceUrl: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  provider: Scalars['String']['output'];
};

export type CrmSyncLogEntry = {
  __typename?: 'CrmSyncLogEntry';
  createdAt: Scalars['String']['output'];
  errorMessage?: Maybe<Scalars['String']['output']>;
  externalId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  operation: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type CustomDomain = {
  __typename?: 'CustomDomain';
  createdAt: Scalars['DateTime']['output'];
  domain: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  sslStatus: Scalars['String']['output'];
  verificationRecordType?: Maybe<Scalars['String']['output']>;
  verificationToken?: Maybe<Scalars['String']['output']>;
  verifiedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type DateRangeInput = {
  from: Scalars['DateTime']['input'];
  to: Scalars['DateTime']['input'];
};

export type DayActivity = {
  __typename?: 'DayActivity';
  count: Scalars['Int']['output'];
  date: Scalars['String']['output'];
};

export enum DeliveryStatus {
  Bounced = 'BOUNCED',
  Delivered = 'DELIVERED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Sent = 'SENT'
}

/** Discussion in a course */
export type Discussion = {
  __typename?: 'Discussion';
  course: Course;
  courseId: Scalars['ID']['output'];
  createdAt: Scalars['DateTime']['output'];
  creator: User;
  creatorId: Scalars['ID']['output'];
  description?: Maybe<Scalars['String']['output']>;
  discussionType: DiscussionType;
  id: Scalars['ID']['output'];
  messageCount: Scalars['Int']['output'];
  messages: Array<DiscussionMessage>;
  participantCount: Scalars['Int']['output'];
  participants: Array<DiscussionParticipant>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};


/** Discussion in a course */
export type DiscussionMessagesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

/** Message in a discussion */
export type DiscussionMessage = {
  __typename?: 'DiscussionMessage';
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  discussion: Discussion;
  discussionId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  isLikedByMe: Scalars['Boolean']['output'];
  likesCount: Scalars['Int']['output'];
  messageType: MessageType;
  parentMessage?: Maybe<DiscussionMessage>;
  parentMessageId?: Maybe<Scalars['ID']['output']>;
  replies: Array<DiscussionMessage>;
  replyCount: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['ID']['output'];
};


/** Message in a discussion */
export type DiscussionMessageRepliesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

/** Participant in a discussion */
export type DiscussionParticipant = {
  __typename?: 'DiscussionParticipant';
  discussion: Discussion;
  discussionId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  joinedAt: Scalars['DateTime']['output'];
  user: User;
  userId: Scalars['ID']['output'];
};

/** AI-generated summary of a discussion thread */
export type DiscussionSummary = {
  __typename?: 'DiscussionSummary';
  generatedAt: Scalars['DateTime']['output'];
  keyTopics: Array<Scalars['String']['output']>;
  suggestedFollowUp?: Maybe<Scalars['String']['output']>;
  summary: Scalars['String']['output'];
};

/** Discussion types */
export enum DiscussionType {
  Chavruta = 'CHAVRUTA',
  Debate = 'DEBATE',
  Forum = 'FORUM'
}

export type DistractorStat = {
  __typename?: 'DistractorStat';
  functional: Scalars['Boolean']['output'];
  optionIndex: Scalars['Int']['output'];
  rpbis: Scalars['Float']['output'];
  selectionRate: Scalars['Float']['output'];
};

export type DocumentVersion = {
  __typename?: 'DocumentVersion';
  aiSuggestions?: Maybe<Scalars['JSON']['output']>;
  anchorCount: Scalars['Int']['output'];
  brokenAnchorCount: Scalars['Int']['output'];
  createdAt: Scalars['String']['output'];
  createdBy?: Maybe<Scalars['ID']['output']>;
  diffSummary?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  mediaAssetId: Scalars['ID']['output'];
  versionNumber: Scalars['Int']['output'];
};

export type DomainScore = {
  __typename?: 'DomainScore';
  correct: Scalars['Int']['output'];
  domain: Scalars['String']['output'];
  scaledScore?: Maybe<Scalars['Float']['output']>;
  total: Scalars['Int']['output'];
};

export type DomainVerificationInfo = {
  __typename?: 'DomainVerificationInfo';
  instructions: Scalars['String']['output'];
  recordType: Scalars['String']['output'];
  recordValue: Scalars['String']['output'];
  token: Scalars['String']['output'];
};

export type DriveImportInput = {
  accessToken: Scalars['String']['input'];
  courseId: Scalars['ID']['input'];
  folderId: Scalars['String']['input'];
  moduleId: Scalars['ID']['input'];
};

export type EarningsSummary = {
  __typename?: 'EarningsSummary';
  paidOutCents: Scalars['Int']['output'];
  pendingPayoutCents: Scalars['Int']['output'];
  purchases: Array<MarketplacePurchase>;
  totalEarnedCents: Scalars['Int']['output'];
};

export type Embedding = {
  __typename?: 'Embedding';
  chunkText: Scalars['String']['output'];
  contentItem: ContentItem;
  contentItemId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  embedding: Array<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
};

export enum EnrichedBlockType {
  Citation = 'CITATION',
  Heading = 'HEADING',
  Text = 'TEXT',
  VisualAnchor = 'VISUAL_ANCHOR'
}

export type EnrichedLesson = {
  __typename?: 'EnrichedLesson';
  blocks: Array<EnrichedTranscriptBlock>;
  citations: Array<LessonCitation>;
  enrichmentStatus: EnrichmentStatus;
  id: Scalars['ID']['output'];
  lesson: Lesson;
  transcriptReady: Scalars['Boolean']['output'];
  youtubeVideoId?: Maybe<Scalars['String']['output']>;
};

export type EnrichedTranscriptBlock = {
  __typename?: 'EnrichedTranscriptBlock';
  anchor?: Maybe<VisualAnchor>;
  blockOrder: Scalars['Int']['output'];
  blockType: EnrichedBlockType;
  citation?: Maybe<LessonCitation>;
  content: Scalars['JSON']['output'];
  endTime?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  lessonId: Scalars['ID']['output'];
  segmentId?: Maybe<Scalars['ID']['output']>;
  startTime?: Maybe<Scalars['Float']['output']>;
};

export enum EnrichmentStatus {
  ExtractingTranscript = 'EXTRACTING_TRANSCRIPT',
  Pending = 'PENDING',
  Published = 'PUBLISHED',
  Ready = 'READY',
  ResolvingCitations = 'RESOLVING_CITATIONS',
  RunningNer = 'RUNNING_NER'
}

export type ErasureVerification = {
  __typename?: 'ErasureVerification';
  completedAt?: Maybe<Scalars['String']['output']>;
  erasureHash: Scalars['String']['output'];
  isValid: Scalars['Boolean']['output'];
  requestedAt: Scalars['String']['output'];
  rowsDeletedCount: Scalars['Int']['output'];
  status: Scalars['String']['output'];
  tablesAffected: Array<Scalars['String']['output']>;
  tenantId: Scalars['ID']['output'];
  userIdHash: Scalars['String']['output'];
  verificationToken: Scalars['String']['output'];
};

export type EvaluationCriterionScore = {
  __typename?: 'EvaluationCriterionScore';
  feedback: Scalars['String']['output'];
  name: Scalars['String']['output'];
  score: Scalars['Float']['output'];
};

export type ExamBlueprint = {
  __typename?: 'ExamBlueprint';
  bloomDistribution: Scalars['JSON']['output'];
  catMaxItems?: Maybe<Scalars['Int']['output']>;
  catMinItems?: Maybe<Scalars['Int']['output']>;
  courseId: Scalars['ID']['output'];
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  domainDistribution: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  isAdaptive: Scalars['Boolean']['output'];
  maxRetakes: Scalars['Int']['output'];
  passingMethod: PassingMethod;
  passingScore: Scalars['Float']['output'];
  retakeCooldownHours: Scalars['Int']['output'];
  shuffleAnswers: Scalars['Boolean']['output'];
  shuffleQuestions: Scalars['Boolean']['output'];
  status: BlueprintStatus;
  timeLimitMinutes: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  totalQuestions: Scalars['Int']['output'];
  version: Scalars['Int']['output'];
};

export type ExamItem = {
  __typename?: 'ExamItem';
  bloomLevel: BloomLevel;
  calibrationStatus: CalibrationStatus;
  courseId: Scalars['ID']['output'];
  createdAt: Scalars['DateTime']['output'];
  domainTag: Scalars['String']['output'];
  exposureCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  irtA?: Maybe<Scalars['Float']['output']>;
  irtB?: Maybe<Scalars['Float']['output']>;
  irtC?: Maybe<Scalars['Float']['output']>;
  moduleId?: Maybe<Scalars['ID']['output']>;
  pValue?: Maybe<Scalars['Float']['output']>;
  qualityTier: QualityTier;
  questionData: Scalars['JSON']['output'];
  rpbis?: Maybe<Scalars['Float']['output']>;
  source: ExamItemSource;
};

export type ExamItemConnection = {
  __typename?: 'ExamItemConnection';
  edges: Array<ExamItemEdge>;
  nodes: Array<ExamItem>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type ExamItemEdge = {
  __typename?: 'ExamItemEdge';
  cursor: Scalars['String']['output'];
  node: ExamItem;
};

export type ExamItemFilterInput = {
  bloomLevel?: InputMaybe<BloomLevel>;
  calibrationStatus?: InputMaybe<CalibrationStatus>;
  courseId?: InputMaybe<Scalars['ID']['input']>;
  domainTag?: InputMaybe<Scalars['String']['input']>;
  source?: InputMaybe<ExamItemSource>;
};

export type ExamItemGenerationResult = {
  __typename?: 'ExamItemGenerationResult';
  generatedCount: Scalars['Int']['output'];
  items: Array<ExamItem>;
  validCount: Scalars['Int']['output'];
};

export enum ExamItemSource {
  AiGenerated = 'AI_GENERATED',
  Imported = 'IMPORTED',
  Manual = 'MANUAL'
}

export type ExamItemStatistics = {
  __typename?: 'ExamItemStatistics';
  dIndex: Scalars['Float']['output'];
  distractorAnalysis: Array<DistractorStat>;
  irtA?: Maybe<Scalars['Float']['output']>;
  irtB?: Maybe<Scalars['Float']['output']>;
  irtC?: Maybe<Scalars['Float']['output']>;
  itemId: Scalars['ID']['output'];
  pValue: Scalars['Float']['output'];
  rpbis: Scalars['Float']['output'];
  totalAdministrations: Scalars['Int']['output'];
};

export type ExamReliabilityReport = {
  __typename?: 'ExamReliabilityReport';
  averageScore: Scalars['Float']['output'];
  blueprintId: Scalars['ID']['output'];
  cronbachAlpha: Scalars['Float']['output'];
  kr20: Scalars['Float']['output'];
  sem: Scalars['Float']['output'];
  totalSessions: Scalars['Int']['output'];
};

export type ExamResponse = {
  __typename?: 'ExamResponse';
  answerData: Scalars['JSON']['output'];
  isCorrect?: Maybe<Scalars['Boolean']['output']>;
  isFlagged: Scalars['Boolean']['output'];
  itemId: Scalars['ID']['output'];
  timeSpentMs?: Maybe<Scalars['Int']['output']>;
};

export type ExamResult = {
  __typename?: 'ExamResult';
  bloomScores: Array<BloomScore>;
  confidenceInterval?: Maybe<Scalars['JSON']['output']>;
  domainScores: Array<DomainScore>;
  gradedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  passed: Scalars['Boolean']['output'];
  rawScore: Scalars['Float']['output'];
  scaledScore?: Maybe<Scalars['Float']['output']>;
  sem?: Maybe<Scalars['Float']['output']>;
  sessionId: Scalars['ID']['output'];
  thetaEstimate?: Maybe<Scalars['Float']['output']>;
};

export type ExamSession = {
  __typename?: 'ExamSession';
  attemptNumber: Scalars['Int']['output'];
  blueprintId: Scalars['ID']['output'];
  currentQuestionIndex?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  isAdaptive: Scalars['Boolean']['output'];
  questionOrder: Array<Scalars['ID']['output']>;
  startedAt: Scalars['DateTime']['output'];
  status: ExamSessionStatus;
  submittedAt?: Maybe<Scalars['DateTime']['output']>;
  timeRemainingSeconds?: Maybe<Scalars['Int']['output']>;
  userId: Scalars['ID']['output'];
};

export enum ExamSessionStatus {
  Graded = 'GRADED',
  InProgress = 'IN_PROGRESS',
  Scheduled = 'SCHEDULED',
  Submitted = 'SUBMITTED',
  TimedOut = 'TIMED_OUT',
  Voided = 'VOIDED'
}

export type ExamTimeEvent = {
  __typename?: 'ExamTimeEvent';
  isExpired: Scalars['Boolean']['output'];
  sessionId: Scalars['ID']['output'];
  timeRemainingSeconds: Scalars['Int']['output'];
};

export type ExportAnalyticsInput = {
  dateRange: DateRangeInput;
  format: OrgExportFormat;
};

export enum ExportFormat {
  Csv = 'CSV',
  Excel = 'EXCEL'
}

export type ExportResult = {
  __typename?: 'ExportResult';
  downloadUrl: Scalars['String']['output'];
  expiresAt: Scalars['DateTime']['output'];
  format: OrgExportFormat;
};

export type FindChavrutaPartnerInput = {
  courseId: Scalars['ID']['input'];
  preferredTopic?: InputMaybe<Scalars['String']['input']>;
};

export type FunnelStep = {
  __typename?: 'FunnelStep';
  dropOffRate: Scalars['Float']['output'];
  learnersCompleted: Scalars['Int']['output'];
  learnersStarted: Scalars['Int']['output'];
  moduleId: Scalars['ID']['output'];
  moduleName: Scalars['String']['output'];
};

export type GamificationConfig = {
  __typename?: 'GamificationConfig';
  enabled: Scalars['Boolean']['output'];
  leaderboardScope: LeaderboardScope;
  showBadges: Scalars['Boolean']['output'];
  showLeaderboard: Scalars['Boolean']['output'];
  showPoints: Scalars['Boolean']['output'];
  showStreaks: Scalars['Boolean']['output'];
  xpRules: Scalars['JSON']['output'];
};

export type GamificationStats = {
  __typename?: 'GamificationStats';
  activeChallenges: Array<UserChallenge>;
  currentStreak: Scalars['Int']['output'];
  leaderboard: Array<XpLeaderboardEntry>;
  longestStreak: Scalars['Int']['output'];
};

export type GenerateCertExamItemsInput = {
  locale?: InputMaybe<Scalars['String']['input']>;
  moduleId: Scalars['ID']['input'];
  targetBloomLevels: Array<Scalars['String']['input']>;
  targetCount: Scalars['Int']['input'];
  targetDifficulty: Scalars['String']['input'];
};

export type GenerateCourseInput = {
  estimatedHours?: InputMaybe<Scalars['Int']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  prompt: Scalars['String']['input'];
  targetAudienceLevel?: InputMaybe<Scalars['String']['input']>;
};

export type GenerateExamItemsInput = {
  bloomLevels: Array<BloomLevel>;
  count: Scalars['Int']['input'];
  courseId: Scalars['ID']['input'];
  domainTag: Scalars['String']['input'];
  moduleId?: InputMaybe<Scalars['ID']['input']>;
  targetDifficulty?: InputMaybe<Scalars['Float']['input']>;
};

export type GenerateScimTokenInput = {
  description: Scalars['String']['input'];
  expiresInDays?: InputMaybe<Scalars['Int']['input']>;
};

export type GenerateScimTokenResult = {
  __typename?: 'GenerateScimTokenResult';
  rawToken: Scalars['String']['output'];
  token: ScimToken;
};

export type GeneratedModule = {
  __typename?: 'GeneratedModule';
  contentItemTitles: Array<Scalars['String']['output']>;
  description: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type GroupChallenge = {
  __typename?: 'GroupChallenge';
  challengeType: ChallengeType;
  courseId?: Maybe<Scalars['String']['output']>;
  createdBy: Scalars['ID']['output'];
  description?: Maybe<Scalars['String']['output']>;
  endDate: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  maxParticipants: Scalars['Int']['output'];
  participantCount: Scalars['Int']['output'];
  startDate: Scalars['String']['output'];
  status: ChallengeStatus;
  targetScore: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export type GroupChallengeConnection = {
  __typename?: 'GroupChallengeConnection';
  edges: Array<GroupChallengeEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type GroupChallengeEdge = {
  __typename?: 'GroupChallengeEdge';
  cursor: Scalars['String']['output'];
  node: GroupChallenge;
};

export type ImportJob = {
  __typename?: 'ImportJob';
  estimatedMinutes?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  lessonCount: Scalars['Int']['output'];
  status: ImportStatus;
};

export enum ImportStatus {
  Cancelled = 'CANCELLED',
  Complete = 'COMPLETE',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Running = 'RUNNING'
}

export type InProgressCourse = {
  __typename?: 'InProgressCourse';
  courseId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  instructorName?: Maybe<Scalars['String']['output']>;
  lastAccessedAt?: Maybe<Scalars['String']['output']>;
  progress: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export type IngestYoutubeLessonInput = {
  lessonId: Scalars['ID']['input'];
  youtubeUrl: Scalars['String']['input'];
};

export type InstructorPayout = {
  __typename?: 'InstructorPayout';
  grossRevenue: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  instructorPayout: Scalars['Int']['output'];
  paidAt?: Maybe<Scalars['String']['output']>;
  periodMonth: Scalars['String']['output'];
  platformCut: Scalars['Int']['output'];
  status: Scalars['String']['output'];
};

export enum InvitationStatus {
  Accepted = 'ACCEPTED',
  Expired = 'EXPIRED',
  Pending = 'PENDING',
  Revoked = 'REVOKED'
}

export type InviteUserInput = {
  email: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  role: Scalars['String']['input'];
};

export type JoinSessionResult = {
  __typename?: 'JoinSessionResult';
  roomUrl?: Maybe<Scalars['String']['output']>;
  session: LiveSession;
  token?: Maybe<Scalars['String']['output']>;
};

/** Knowledge graph topology coverage for a credential requirement */
export type KnowledgePathCoverage = {
  __typename?: 'KnowledgePathCoverage';
  conceptIds: Array<Scalars['ID']['output']>;
  coverageScore: Scalars['Float']['output'];
  covered: Scalars['Boolean']['output'];
  missingConcepts: Array<Scalars['ID']['output']>;
  pathDepth: Scalars['Int']['output'];
};

/**
 * KnowledgeSource — an information source attached to a course.
 * Modelled after NotebookLM: users can attach DOCX, PDF, URLs, YouTube, or raw text.
 */
export type KnowledgeSource = {
  __typename?: 'KnowledgeSource';
  chunkCount: Scalars['Int']['output'];
  courseId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  errorMessage?: Maybe<Scalars['String']['output']>;
  /** Presigned MinIO URL for viewing the original file (PDF, DOCX, TXT). Null for URL/YouTube/Text sources. */
  fileUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  /** Original file name, URL, or YouTube link */
  origin?: Maybe<Scalars['String']['output']>;
  /** Preview of first 500 chars */
  preview?: Maybe<Scalars['String']['output']>;
  /** Full extracted plaintext (may be large — use with care) */
  rawContent?: Maybe<Scalars['String']['output']>;
  sourceType: SourceType;
  status: SourceStatus;
  tenantId: Scalars['ID']['output'];
  title: Scalars['String']['output'];
};

export type LeaderboardEntry = {
  __typename?: 'LeaderboardEntry';
  badgeCount: Scalars['Int']['output'];
  displayName: Scalars['String']['output'];
  rank: Scalars['Int']['output'];
  totalPoints: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
};

export enum LeaderboardScope {
  Department = 'DEPARTMENT',
  Global = 'GLOBAL',
  Tenant = 'TENANT'
}

export type LearnerAnalyticsDetail = {
  __typename?: 'LearnerAnalyticsDetail';
  activityTimeline: Array<ActivityEntry>;
  avgQuizScore: Scalars['Float']['output'];
  coursesCompleted: Scalars['Int']['output'];
  coursesEnrolled: Scalars['Int']['output'];
  email: Scalars['String']['output'];
  name: Scalars['String']['output'];
  totalLearningHours: Scalars['Float']['output'];
  userId: Scalars['ID']['output'];
};

export type LearnerSkillProgress = {
  __typename?: 'LearnerSkillProgress';
  evidenceCount: Scalars['Int']['output'];
  lastActivityAt?: Maybe<Scalars['String']['output']>;
  masteryLevel: MasteryLevel;
  skillId: Scalars['ID']['output'];
};

export type LearnerVelocityRow = {
  __typename?: 'LearnerVelocityRow';
  displayName: Scalars['String']['output'];
  lessonsPerWeek: Scalars['Float']['output'];
  userId: Scalars['ID']['output'];
  weeklyTrend: Array<TrendPoint>;
};

/**
 * Result of a shortestPath query between two concepts.
 * concepts: ordered list of ConceptNodes along the path (start inclusive, end inclusive).
 * steps: number of edges in the path (= length of path).
 */
export type LearningPath = {
  __typename?: 'LearningPath';
  concepts: Array<ConceptNode>;
  steps: Scalars['Int']['output'];
};

export type Lesson = {
  __typename?: 'Lesson';
  assets: Array<LessonAsset>;
  citations: Array<LessonCitation>;
  courseId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  instructorId: Scalars['ID']['output'];
  lessonDate?: Maybe<Scalars['String']['output']>;
  moduleId?: Maybe<Scalars['ID']['output']>;
  pipeline?: Maybe<LessonPipeline>;
  series?: Maybe<Scalars['String']['output']>;
  status: LessonStatus;
  title: Scalars['String']['output'];
  type: LessonType;
  updatedAt: Scalars['String']['output'];
};

export type LessonAsset = {
  __typename?: 'LessonAsset';
  assetType: LessonAssetType;
  fileUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lessonId: Scalars['ID']['output'];
  mediaAssetId?: Maybe<Scalars['ID']['output']>;
  metadata?: Maybe<Scalars['JSON']['output']>;
  sourceUrl?: Maybe<Scalars['String']['output']>;
};

export enum LessonAssetType {
  Audio = 'AUDIO',
  Notes = 'NOTES',
  Video = 'VIDEO',
  Whiteboard = 'WHITEBOARD'
}

export type LessonCitation = {
  __typename?: 'LessonCitation';
  bookName: Scalars['String']['output'];
  column?: Maybe<Scalars['String']['output']>;
  confidence?: Maybe<Scalars['Float']['output']>;
  graphSourceId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  knowledgeSourceId?: Maybe<Scalars['ID']['output']>;
  lessonId: Scalars['ID']['output'];
  matchStatus: CitationMatchStatus;
  page?: Maybe<Scalars['String']['output']>;
  paragraph?: Maybe<Scalars['String']['output']>;
  part?: Maybe<Scalars['String']['output']>;
  resolvedText?: Maybe<Scalars['String']['output']>;
  sourceText: Scalars['String']['output'];
};

export type LessonPipeline = {
  __typename?: 'LessonPipeline';
  config?: Maybe<Scalars['JSON']['output']>;
  createdAt: Scalars['String']['output'];
  currentRun?: Maybe<LessonPipelineRun>;
  id: Scalars['ID']['output'];
  lessonId: Scalars['ID']['output'];
  nodes: Scalars['JSON']['output'];
  status: PipelineStatus;
  templateName?: Maybe<Scalars['String']['output']>;
};

export enum LessonPipelineArchetype {
  Sequential = 'SEQUENTIAL',
  Thematic = 'THEMATIC'
}

export type LessonPipelineInput = {
  archetype: LessonPipelineArchetype;
  language?: InputMaybe<Scalars['String']['input']>;
  maxCitations?: InputMaybe<Scalars['Int']['input']>;
  prompt: Scalars['String']['input'];
};

export type LessonPipelineResult = {
  __typename?: 'LessonPipelineResult';
  createdAt: Scalars['String']['output'];
  fileUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  moduleName: Scalars['String']['output'];
  outputData?: Maybe<Scalars['JSON']['output']>;
  outputType: Scalars['String']['output'];
  runId: Scalars['ID']['output'];
};

export type LessonPipelineRun = {
  __typename?: 'LessonPipelineRun';
  completedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lessonId?: Maybe<Scalars['ID']['output']>;
  logs?: Maybe<Scalars['JSON']['output']>;
  pipelineId: Scalars['ID']['output'];
  results: Array<LessonPipelineResult>;
  runNumber: Scalars['Int']['output'];
  startedAt?: Maybe<Scalars['String']['output']>;
  status: RunStatus;
  triggeredBy: Scalars['String']['output'];
};

export type LessonPipelineTemplate = {
  __typename?: 'LessonPipelineTemplate';
  config: Scalars['JSON']['output'];
  createdAt: Scalars['String']['output'];
  createdBy?: Maybe<Scalars['ID']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isSystem: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  nodes: Scalars['JSON']['output'];
  tenantId: Scalars['ID']['output'];
  updatedAt: Scalars['String']['output'];
};

export enum LessonStatus {
  Draft = 'DRAFT',
  Processing = 'PROCESSING',
  Published = 'PUBLISHED',
  Ready = 'READY'
}

export enum LessonStepType {
  AiChat = 'AI_CHAT',
  Discussion = 'DISCUSSION',
  Quiz = 'QUIZ',
  Summary = 'SUMMARY',
  Video = 'VIDEO'
}

export enum LessonType {
  Sequential = 'SEQUENTIAL',
  Thematic = 'THEMATIC'
}

export type LibraryActivation = {
  __typename?: 'LibraryActivation';
  activatedAt: Scalars['String']['output'];
  /** The course ID created in the tenant's catalog, populated after activation */
  courseId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  libraryCourseId: Scalars['ID']['output'];
};

export type LibraryCourse = {
  __typename?: 'LibraryCourse';
  description: Scalars['String']['output'];
  durationMinutes: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  /** True if the current tenant has already activated this course */
  isActivated: Scalars['Boolean']['output'];
  licenseType: LibraryLicense;
  priceCents: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  topic: LibraryTopic;
};

export enum LibraryLicense {
  Free = 'FREE',
  Paid = 'PAID'
}

export enum LibraryTopic {
  Aml = 'AML',
  Cybersecurity = 'CYBERSECURITY',
  Dei = 'DEI',
  Gdpr = 'GDPR',
  HarassmentPrevention = 'HARASSMENT_PREVENTION',
  Hipaa = 'HIPAA',
  Soc2 = 'SOC2'
}

export type LicenseCourseInput = {
  courseId: Scalars['ID']['input'];
  durationMonths?: InputMaybe<Scalars['Int']['input']>;
  licenseType: LicenseType;
  maxSeats?: InputMaybe<Scalars['Int']['input']>;
};

export enum LicenseStatus {
  Active = 'ACTIVE',
  Expired = 'EXPIRED',
  Revoked = 'REVOKED'
}

export enum LicenseType {
  PerSeat = 'PER_SEAT',
  TimeLimited = 'TIME_LIMITED',
  Unlimited = 'UNLIMITED'
}

export type ListUsersInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  role?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type LiveSession = {
  __typename?: 'LiveSession';
  contentItemId: Scalars['ID']['output'];
  courseId?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  instructorId?: Maybe<Scalars['ID']['output']>;
  maxParticipants?: Maybe<Scalars['Int']['output']>;
  meetingName: Scalars['String']['output'];
  participantCount?: Maybe<Scalars['Int']['output']>;
  recordingUrl?: Maybe<Scalars['String']['output']>;
  scheduledAt: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

/** LTI 1.3 registered platform (Canvas, Moodle, Blackboard, etc.) */
export type LtiPlatform = {
  __typename?: 'LtiPlatform';
  authLoginUrl: Scalars['String']['output'];
  authTokenUrl: Scalars['String']['output'];
  clientId: Scalars['String']['output'];
  deploymentId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  keySetUrl: Scalars['String']['output'];
  platformName: Scalars['String']['output'];
  platformUrl: Scalars['String']['output'];
};

export type MarketplaceListing = {
  __typename?: 'MarketplaceListing';
  categories: Array<Scalars['String']['output']>;
  courseId: Scalars['ID']['output'];
  currency: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  flatRatePrice?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  isPublished: Scalars['Boolean']['output'];
  previewUrl?: Maybe<Scalars['String']['output']>;
  pricePerSeat?: Maybe<Scalars['Float']['output']>;
  pricingModel: PricingModel;
  publisherName: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type MarketplacePurchase = {
  __typename?: 'MarketplacePurchase';
  amountCents: Scalars['Int']['output'];
  courseId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  purchasedAt: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

/**
 * Mastery level enum for skill tree nodes.
 * Mirrors the frontend MasteryLevel type for full-stack consistency.
 */
export enum MasteryLevel {
  Attempted = 'ATTEMPTED',
  Familiar = 'FAMILIAR',
  Mastered = 'MASTERED',
  None = 'NONE',
  Proficient = 'PROFICIENT'
}

export type MediaAsset = {
  __typename?: 'MediaAsset';
  altText?: Maybe<Scalars['String']['output']>;
  captionsUrl?: Maybe<Scalars['String']['output']>;
  contentType: Scalars['String']['output'];
  courseId: Scalars['ID']['output'];
  downloadUrl?: Maybe<Scalars['String']['output']>;
  fileKey: Scalars['String']['output'];
  /**
   * Presigned URL for the HLS master manifest (.m3u8).
   * Null until HLS transcoding completes (non-blocking background step).
   * Valid for 1 hour after generation.
   */
  hlsManifestUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** 3D model metadata. Non-null only when this asset is a MODEL_3D asset. */
  model3d?: Maybe<Model3DInfo>;
  status: MediaStatus;
  /**
   * Available subtitle tracks for this media asset.
   * Populated after AI subtitle translation completes for one or more target languages.
   */
  subtitleTracks: Array<SubtitleTrack>;
  title: Scalars['String']['output'];
};

/** Upload receipt returned by uploadModel3D mutation. */
export type MediaAssetUpload = {
  __typename?: 'MediaAssetUpload';
  assetId: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  uploadUrl: Scalars['String']['output'];
};

export enum MediaStatus {
  Error = 'ERROR',
  Processing = 'PROCESSING',
  Ready = 'READY',
  Uploading = 'UPLOADING'
}

export type MentorPathMatch = {
  __typename?: 'MentorPathMatch';
  mentorId: Scalars['ID']['output'];
  pathOverlapScore: Scalars['Float']['output'];
  sharedConcepts: Array<Scalars['String']['output']>;
};

export type MergeConceptsInput = {
  keepTarget: Scalars['Boolean']['input'];
  sourceConceptId: Scalars['ID']['input'];
  targetConceptId: Scalars['ID']['input'];
};

export enum MessageRole {
  Assistant = 'ASSISTANT',
  System = 'SYSTEM',
  Tool = 'TOOL',
  User = 'USER'
}

/** Message types */
export enum MessageType {
  Audio = 'AUDIO',
  Image = 'IMAGE',
  Text = 'TEXT',
  Video = 'VIDEO'
}

/** An ordered collection of MICROLESSON content items forming a learning path. */
export type MicrolearningPath = {
  __typename?: 'MicrolearningPath';
  contentItemIds: Array<Scalars['ID']['output']>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  itemCount: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  topicClusterId?: Maybe<Scalars['ID']['output']>;
};

/**
 * Structured content for a MICROLESSON content item.
 * Enforced max duration: 420 seconds (7 minutes).
 */
export type MicrolessonContent = {
  __typename?: 'MicrolessonContent';
  body: Scalars['String']['output'];
  conceptName: Scalars['String']['output'];
  durationSeconds: Scalars['Int']['output'];
  objective: Scalars['String']['output'];
  quizQuestion?: Maybe<MicrolessonQuizQuestion>;
};

export type MicrolessonQuizOption = {
  __typename?: 'MicrolessonQuizOption';
  isCorrect: Scalars['Boolean']['output'];
  text: Scalars['String']['output'];
};

export type MicrolessonQuizQuestion = {
  __typename?: 'MicrolessonQuizQuestion';
  explanation?: Maybe<Scalars['String']['output']>;
  options: Array<MicrolessonQuizOption>;
  question: Scalars['String']['output'];
};

/** 3D model metadata — populated only when assetType is MODEL_3D. */
export type Model3DInfo = {
  __typename?: 'Model3DInfo';
  /** Animation clips embedded in the 3D file. */
  animations: Array<ModelAnimation>;
  /** Format identifier: gltf | glb | obj | fbx */
  format: Scalars['String']['output'];
  /** Triangle count used for LOD hints. Null until poly_count is set. */
  polyCount?: Maybe<Scalars['Int']['output']>;
};

/** A single animation clip embedded in a 3D model file. */
export type ModelAnimation = {
  __typename?: 'ModelAnimation';
  duration: Scalars['Float']['output'];
  name: Scalars['String']['output'];
};

export type Module = {
  __typename?: 'Module';
  contentItems: Array<ContentItem>;
  course: Course;
  courseId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  orderIndex: Scalars['Int']['output'];
  title: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  acceptInvitation: OrgMember;
  activateAgentTemplate: AgentTemplate;
  activateAssessmentCampaign: Scalars['Boolean']['output'];
  activateLibraryCourse: LibraryActivation;
  activatePoll: SessionPoll;
  addCompetencyGoal: CompetencyGoal;
  /**
   * Upload a local file (DOCX / PDF / TXT) as a knowledge source.
   * The content is passed as a base64-encoded string so it can travel through
   * the GraphQL gateway without a multipart transport layer.
   */
  addFileSource: KnowledgeSource;
  addLessonAsset: LessonAsset;
  addLessonStep: CourseLessonPlan;
  /** Add a message to a discussion */
  addMessage: DiscussionMessage;
  addTeamMember: Scalars['Boolean']['output'];
  /** Add raw text as a knowledge source. */
  addTextSource: KnowledgeSource;
  /**
   * Add a URL as a knowledge source.
   * The system fetches the page, extracts text, chunks it and embeds it.
   */
  addUrlSource: KnowledgeSource;
  /**
   * Add a YouTube video as a knowledge source.
   * The system fetches the auto-generated transcript and indexes it.
   */
  addYoutubeSource: KnowledgeSource;
  adminBulkEnroll: Scalars['Int']['output'];
  adminEnrollUser: AdminEnrollmentRecord;
  adminUnenrollUser: Scalars['Boolean']['output'];
  approvePilotRequest: Scalars['Boolean']['output'];
  assignAssetToAnchor: VisualAnchor;
  assignCpdCreditsToCourse: Scalars['Boolean']['output'];
  bulkImportUsers: BulkImportResult;
  calibrateExamItems: Scalars['Boolean']['output'];
  cancelAgentExecution: AgentExecution;
  cancelImport: Scalars['Boolean']['output'];
  cancelLessonPipelineRun: LessonPipelineRun;
  cancelLiveSession: LiveSession;
  checkDomainVerification: CustomDomain;
  /** Delete all xAPI statements older than the given number of days. SUPER_ADMIN only. */
  clearXapiStatements: Scalars['Int']['output'];
  cloneComplianceCourse: ComplianceCourse;
  closePoll: PollResults;
  /**
   * Run k-means++ clustering on all concepts for a given course (default k=5).
   * Returns the resulting TopicCluster nodes. Requires INSTRUCTOR or higher role.
   */
  clusterTopics: Array<TopicCluster>;
  /** Compact a collaborative document's CRDT state (remove tombstones, merge operations) */
  compactCollabDocument: CollabDocument;
  completeAssessmentCampaign: AssessmentResult;
  completeOnboarding: OnboardingState;
  confirmMediaUpload: MediaAsset;
  confirmVisualAssetUpload: VisualAsset;
  createAgentTemplate: AgentTemplate;
  createAnnotation: Annotation;
  createAnnouncement: Announcement;
  createApiKey: ApiKeyCreated;
  createAssessmentCampaign: AssessmentCampaign;
  createBadge: Badge;
  /** Create a new badge definition for the tenant */
  createBadgeDefinition: OpenBadgeDefinition;
  createBreakoutRooms: Array<BreakoutRoom>;
  createChallenge: GroupChallenge;
  createChavrutaPartnerSession: ChavrutaPartnerSession;
  createCheckoutSession: CheckoutSession;
  createConcept: Concept;
  createContentItem: ContentItem;
  createCourse: Course;
  createCourseListing: CourseListing;
  createCpdCreditType: CpdCreditType;
  /** Create a new discussion */
  createDiscussion: Discussion;
  createDocumentVersion: DocumentVersion;
  createEmbedding: Embedding;
  createExamBlueprint: ExamBlueprint;
  createExamItem: ExamItem;
  createLesson: Lesson;
  createLessonPlan: CourseLessonPlan;
  createLiveSession: LiveSession;
  /** Creates a new ordered microlearning path from existing MICROLESSON content items. */
  createMicrolearningPath: MicrolearningPath;
  createModule: Module;
  createOrgBadge: OrgBadge;
  createOrganization: Organization;
  createPeerReviewRubric: PeerReviewRubric;
  createPerson: Person;
  createPipelineTemplate: LessonPipelineTemplate;
  createPoll: SessionPoll;
  createProgram: CredentialProgram;
  /** Create a new spaced-repetition card for the authenticated user. */
  createReviewCard: SrsCard;
  createRole: Role;
  createSavedSearch: SavedSearch;
  createScenarioTemplate: ScenarioTemplate;
  createSkillPath: SkillPath;
  /**
   * Create a new skill profile defining required concepts for a role/goal.
   * Only instructors and admins may create profiles.
   */
  createSkillProfile: SkillProfile;
  createSource: Source;
  createTerm: Term;
  createTopicCluster: TopicCluster;
  createUser: User;
  createVisualAnchor: VisualAnchor;
  createWebhook: Webhook;
  deactivateAgentTemplate: AgentTemplate;
  deactivateLibraryCourse: Scalars['Boolean']['output'];
  deactivateUser: Scalars['Boolean']['output'];
  delegateRole: RoleDelegation;
  deleteAgentTemplate: Scalars['Boolean']['output'];
  deleteAnnotation: Scalars['Boolean']['output'];
  deleteAnnouncement: Scalars['Boolean']['output'];
  deleteBadge: Scalars['Boolean']['output'];
  deleteConcept: Scalars['Boolean']['output'];
  deleteCourse: Scalars['Boolean']['output'];
  deleteEmbedding: Scalars['Boolean']['output'];
  deleteEmbeddingsByContentItem: Scalars['Int']['output'];
  /** Remove a knowledge source (and its embeddings). */
  deleteKnowledgeSource: Scalars['Boolean']['output'];
  deleteLesson: Scalars['Boolean']['output'];
  deleteModule: Scalars['Boolean']['output'];
  deleteOrgBadge: Scalars['Boolean']['output'];
  deletePipelineTemplate: Scalars['Boolean']['output'];
  deleteRole: Scalars['Boolean']['output'];
  deleteSavedSearch: Scalars['Boolean']['output'];
  deleteVisualAnchor: Scalars['Boolean']['output'];
  deleteWebhook: Scalars['Boolean']['output'];
  disconnectCrm: Scalars['Boolean']['output'];
  endLiveSession: LiveSession;
  endProctoringSession: ProctoringSession;
  endSession: Scalars['Boolean']['output'];
  enrollCourse: UserCourse;
  enrollInProgram: ProgramEnrollment;
  exportAnalytics: ExportResult;
  exportAuditLog: AuditExportResult;
  exportCourseAsScorm: Scalars['String']['output'];
  exportCourseAsScorm2004: ScormExportResult;
  exportCpdReport: Scalars['String']['output'];
  finishScormSession: Scalars['Boolean']['output'];
  flagExamQuestion: Scalars['Boolean']['output'];
  flagProctoringEvent: ProctoringSession;
  followUser: Scalars['Boolean']['output'];
  forkCourse: Course;
  generateBIApiKey: Scalars['String']['output'];
  generateCertExamItems: CertExamGenResult;
  generateComplianceReport: ComplianceReportResult;
  generateCourseFromPrompt: CourseGenerationResult;
  /** Generate an AI-powered summary for a discussion thread */
  generateDiscussionSummary: DiscussionSummary;
  generateEmbedding: Scalars['Boolean']['output'];
  generateExamItems: ExamItemGenerationResult;
  generateLesson: AgentLessonPipelineResult;
  generateScimToken: GenerateScimTokenResult;
  /** Generate a new xAPI LRS bearer token. Returns the raw token (shown once). */
  generateXapiToken: Scalars['String']['output'];
  gradeQuizSubmission: QuizResult;
  importFromDrive: ImportJob;
  importFromWebsite: ImportJob;
  importFromYoutube: ImportJob;
  importScormPackage: ScormImportResult;
  ingestContent: ContentIngestionResult;
  ingestYoutubeLesson: EnrichedLesson;
  initScormSession: ScormSession;
  inviteUser: OrgInvitation;
  /** Manually issue a badge to a user (admin or instructor action) */
  issueBadge: OpenBadgeAssertion;
  /**
   * Issue a badge gated on knowledge graph topology coverage (GAP-8).
   * Throws if coverage < 70% mastery threshold.
   */
  issueGraphGroundedBadge: OpenBadgeAssertion;
  joinChallenge: ChallengeParticipant;
  /** Join a discussion as a participant */
  joinDiscussion: Scalars['Boolean']['output'];
  joinLiveSession: JoinSessionResult;
  /** Leave a discussion */
  leaveDiscussion: Scalars['Boolean']['output'];
  licenseCourse: CourseLicense;
  /** Like or unlike a message */
  likeMessage: Scalars['Boolean']['output'];
  linkConcepts: ConceptRelationship;
  markAllNotificationDeliveriesRead: Scalars['Int']['output'];
  markContentViewed: Scalars['Boolean']['output'];
  markNotificationDeliveryRead: NotificationDelivery;
  /**
   * Merge two concept nodes in the knowledge graph.
   * Moves all edges from the source concept to the target, then deletes the source.
   * Returns the merged target concept.
   */
  mergeConceptGraphNodes: Concept;
  /**
   * Promote an annotation from PERSONAL or SHARED layer to INSTRUCTOR layer,
   * making it visible to all students. Requires INSTRUCTOR, ORG_ADMIN or SUPER_ADMIN role.
   */
  promoteAnnotation: Annotation;
  publishAnnouncement: Announcement;
  publishCourse: Course;
  publishEnrichedLesson: EnrichedLesson;
  publishLesson: Lesson;
  publishLessonPlan: CourseLessonPlan;
  publishListing: Scalars['Boolean']['output'];
  publishPortal: Scalars['Boolean']['output'];
  publishToMarketplace: MarketplaceListing;
  purchaseCourse: PaymentIntentResult;
  /**
   * Record a review for a card identified by ID using the given quality rating.
   * Alias for submitReview with positional card-id argument.
   */
  recordReview: SrsCard;
  /**
   * Records the authenticated learner's choice within a scenario and returns
   * the next scenario node. Returns null when the chosen branch has ended.
   */
  recordScenarioChoice?: Maybe<ScenarioNode>;
  regeneratePartnerApiKey: RegeneratedApiKey;
  /** Register a new LTI 1.3 platform for the current tenant. */
  registerLtiPlatform: LtiPlatform;
  /**
   * F-11: Register a W3C Push API subscription for Web Push delivery.
   * Accepts the full PushSubscription JSON (endpoint + keys).
   */
  registerPushSubscription: PushRegistration;
  registerPushToken: PushRegistration;
  registerWhatsApp: WhatsAppRegistration;
  /**
   * Re-generate embeddings for all READY knowledge sources in a course.
   * Useful after embedding model changes or corruption recovery.
   */
  reindexCourseEmbeddings: ReindexResult;
  rejectPilotRequest: Scalars['Boolean']['output'];
  removeCompetencyGoal: Scalars['Boolean']['output'];
  removeCustomDomain: Scalars['Boolean']['output'];
  removeMember: Scalars['Boolean']['output'];
  removeTeamMember: Scalars['Boolean']['output'];
  reorderLessonSteps: CourseLessonPlan;
  reorderModules: Array<Module>;
  replyToAnnotation: Annotation;
  requestContentTranslation: ContentTranslation;
  requestDomainVerification: DomainVerificationInfo;
  requestPayout: Scalars['Boolean']['output'];
  requestPeerMatch: PeerMatchRequest;
  requestRefund: PurchaseDetail;
  resetNotificationTemplate: NotificationTemplate;
  resetUserPassword: Scalars['Boolean']['output'];
  resolveAnnotation: Annotation;
  resolveAtRiskFlag: Scalars['Boolean']['output'];
  respondToPeerMatch: PeerMatchRequest;
  restoreRun: LessonPipelineRun;
  retireExamItem: ExamItem;
  retryPipelineModule: LessonPipelineRun;
  revokeApiKey: Scalars['Boolean']['output'];
  revokeBIApiKey: Scalars['Boolean']['output'];
  /** Revoke a previously issued badge (cannot be undone) */
  revokeBadge: Scalars['Boolean']['output'];
  revokeCourseLicense: Scalars['Boolean']['output'];
  revokeDelegation: Scalars['Boolean']['output'];
  revokeInvitation: Scalars['Boolean']['output'];
  revokeScimToken: Scalars['Boolean']['output'];
  /** Revoke an existing xAPI token. */
  revokeXapiToken: Scalars['Boolean']['output'];
  rollbackToVersion: Scalars['Boolean']['output'];
  saveAtRiskThresholds: AtRiskThresholds;
  saveLessonPipeline: LessonPipeline;
  savePortalLayout: PortalPage;
  scheduleGdprErasure: Scalars['Boolean']['output'];
  /**
   * Schedule a concept for spaced-repetition review. Creates a card and
   * optionally sets an explicit initial due date. Defaults to SM2 algorithm.
   * Alias surface for createReviewCard with extended options.
   */
  scheduleReview: SrsCard;
  sendMessage: AgentMessage;
  sendRoleplayMessage: Scalars['Boolean']['output'];
  setBlockAnchorTimestamp: EnrichedTranscriptBlock;
  skipOnboarding: OnboardingState;
  startAgentExecution: AgentExecution;
  startAgentSession: AgentSession;
  startExamSession: ExamSession;
  startLessonPipelineRun: LessonPipelineRun;
  startLiveSession: StartLiveSessionResult;
  startProctoringSession: ProctoringSession;
  startRoleplaySession: ScenarioSession;
  submitAssessmentResponse: Scalars['Boolean']['output'];
  submitChallengeScore: ChallengeParticipant;
  submitExam: ExamResult;
  submitExamAnswer: Scalars['Boolean']['output'];
  submitForPeerReview: Array<PeerReviewAssignment>;
  submitPeerReview: Scalars['Boolean']['output'];
  submitPilotRequest: PilotRequest;
  /**
   * Record a review result using the SM-2 quality scale (0–5) and return
   * the updated card with its new due date and interval.
   */
  submitReview: SrsCard;
  submitTextAssignment: TextSubmission;
  suspendUser: User;
  syncAnchors: SyncResult;
  testWebhook: WebhookDelivery;
  /** Enable or disable an LTI platform. */
  toggleLtiPlatform: LtiPlatform;
  unenrollCourse: Scalars['Boolean']['output'];
  unfollowUser: Scalars['Boolean']['output'];
  unpublishCourse: Course;
  unpublishFromMarketplace: Scalars['Boolean']['output'];
  unpublishPortal: Scalars['Boolean']['output'];
  unregisterPushToken: Scalars['Boolean']['output'];
  updateAgentTemplate: AgentTemplate;
  updateAnnotation: Annotation;
  updateAnnouncement: Announcement;
  updateBadge: Badge;
  updateConcept: Concept;
  updateConsent: Scalars['Boolean']['output'];
  updateCourse: Course;
  updateCourseComplianceSettings: ComplianceCourse;
  updateExamBlueprint: ExamBlueprint;
  updateExamItem: ExamItem;
  updateGamificationConfig: GamificationConfig;
  updateLesson: Lesson;
  updateLessonCitation: LessonCitation;
  /**
   * Update the mastery level for a skill tree node (concept) for the current user.
   * Stored in the user_skill_mastery table (created by migration 0011).
   */
  updateMasteryLevel: SkillTreeNode;
  updateMediaAltText: MediaAsset;
  updateMemberRole: OrgMember;
  updateModule: Module;
  updateMySkillProgress: LearnerSkillProgress;
  updateNotificationPreference: NotificationPreference;
  updateNotificationTemplate: NotificationTemplate;
  updateOnboardingStep: OnboardingState;
  updateOrgBadge: OrgBadge;
  updatePipelineTemplate: LessonPipelineTemplate;
  updateProfileVisibility: UserPreferences;
  updateProgram: CredentialProgram;
  updateRole: Role;
  updateScormSession: Scalars['Boolean']['output'];
  updateSecuritySettings: SecuritySettings;
  updateTenantBranding: TenantBranding;
  updateTenantLanguageSettings: TenantLanguageSettings;
  updateTenantPlan: Tenant;
  updateTenantSocialLinks: TenantSocialLinks;
  updateUser: User;
  updateUserPreferences: User;
  updateVisualAnchor: VisualAnchor;
  updateWebhook: Webhook;
  /**
   * Initiates a 3D model upload. Returns a presigned PUT URL valid for 15 minutes.
   * Supported formats: gltf, glb, obj, fbx.
   */
  uploadModel3D: MediaAssetUpload;
  verifyWhatsApp: WhatsAppVerification;
  voidExamSession: Scalars['Boolean']['output'];
  votePoll: Scalars['Boolean']['output'];
};


export type MutationAcceptInvitationArgs = {
  token: Scalars['String']['input'];
};


export type MutationActivateAgentTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationActivateAssessmentCampaignArgs = {
  campaignId: Scalars['ID']['input'];
};


export type MutationActivateLibraryCourseArgs = {
  libraryCourseId: Scalars['ID']['input'];
};


export type MutationActivatePollArgs = {
  pollId: Scalars['ID']['input'];
};


export type MutationAddCompetencyGoalArgs = {
  targetConceptName: Scalars['String']['input'];
  targetLevel?: InputMaybe<Scalars['String']['input']>;
};


export type MutationAddFileSourceArgs = {
  input: AddFileSourceInput;
};


export type MutationAddLessonAssetArgs = {
  input: AddLessonAssetInput;
  lessonId: Scalars['ID']['input'];
};


export type MutationAddLessonStepArgs = {
  input: AddLessonStepInput;
};


export type MutationAddMessageArgs = {
  discussionId: Scalars['ID']['input'];
  input: AddMessageInput;
};


export type MutationAddTeamMemberArgs = {
  memberId: Scalars['ID']['input'];
};


export type MutationAddTextSourceArgs = {
  input: AddTextSourceInput;
};


export type MutationAddUrlSourceArgs = {
  input: AddUrlSourceInput;
};


export type MutationAddYoutubeSourceArgs = {
  input: AddYoutubeSourceInput;
};


export type MutationAdminBulkEnrollArgs = {
  courseId: Scalars['ID']['input'];
  userIds: Array<Scalars['ID']['input']>;
};


export type MutationAdminEnrollUserArgs = {
  courseId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationAdminUnenrollUserArgs = {
  courseId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationApprovePilotRequestArgs = {
  requestId: Scalars['ID']['input'];
};


export type MutationAssignAssetToAnchorArgs = {
  anchorId: Scalars['ID']['input'];
  visualAssetId: Scalars['ID']['input'];
};


export type MutationAssignCpdCreditsToCourseArgs = {
  courseId: Scalars['ID']['input'];
  creditHours: Scalars['Float']['input'];
  creditTypeId: Scalars['ID']['input'];
};


export type MutationBulkImportUsersArgs = {
  csvData: Scalars['String']['input'];
};


export type MutationCalibrateExamItemsArgs = {
  blueprintId: Scalars['ID']['input'];
};


export type MutationCancelAgentExecutionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCancelImportArgs = {
  jobId: Scalars['ID']['input'];
};


export type MutationCancelLessonPipelineRunArgs = {
  runId: Scalars['ID']['input'];
};


export type MutationCancelLiveSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationCheckDomainVerificationArgs = {
  domain: Scalars['String']['input'];
};


export type MutationClearXapiStatementsArgs = {
  olderThanDays: Scalars['Int']['input'];
};


export type MutationCloneComplianceCourseArgs = {
  courseId: Scalars['ID']['input'];
};


export type MutationClosePollArgs = {
  pollId: Scalars['ID']['input'];
};


export type MutationClusterTopicsArgs = {
  courseId: Scalars['ID']['input'];
  k?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationCompactCollabDocumentArgs = {
  documentId: Scalars['ID']['input'];
};


export type MutationCompleteAssessmentCampaignArgs = {
  campaignId: Scalars['ID']['input'];
};


export type MutationConfirmMediaUploadArgs = {
  courseId: Scalars['ID']['input'];
  fileKey: Scalars['String']['input'];
  title: Scalars['String']['input'];
};


export type MutationConfirmVisualAssetUploadArgs = {
  courseId: Scalars['ID']['input'];
  declaredMimeType: Scalars['String']['input'];
  declaredSize: Scalars['Int']['input'];
  fileKey: Scalars['String']['input'];
  originalName: Scalars['String']['input'];
};


export type MutationCreateAgentTemplateArgs = {
  input: CreateAgentTemplateInput;
};


export type MutationCreateAnnotationArgs = {
  input: CreateAnnotationInput;
};


export type MutationCreateAnnouncementArgs = {
  input: CreateAnnouncementInput;
};


export type MutationCreateApiKeyArgs = {
  input: CreateApiKeyInput;
};


export type MutationCreateAssessmentCampaignArgs = {
  dueDate?: InputMaybe<Scalars['String']['input']>;
  targetUserId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};


export type MutationCreateBadgeArgs = {
  input: CreateBadgeInput;
};


export type MutationCreateBadgeDefinitionArgs = {
  criteriaUrl?: InputMaybe<Scalars['String']['input']>;
  description: Scalars['String']['input'];
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationCreateBreakoutRoomsArgs = {
  rooms: Array<CreateBreakoutRoomInput>;
  sessionId: Scalars['ID']['input'];
};


export type MutationCreateChallengeArgs = {
  input: CreateChallengeInput;
};


export type MutationCreateChavrutaPartnerSessionArgs = {
  input: CreateChavrutaPartnerSessionInput;
};


export type MutationCreateCheckoutSessionArgs = {
  listingId: Scalars['ID']['input'];
};


export type MutationCreateConceptArgs = {
  input: CreateConceptInput;
};


export type MutationCreateContentItemArgs = {
  input: CreateContentItemInput;
};


export type MutationCreateCourseArgs = {
  input: CreateCourseInput;
};


export type MutationCreateCourseListingArgs = {
  courseId: Scalars['ID']['input'];
  currency: Scalars['String']['input'];
  priceCents: Scalars['Int']['input'];
  revenueSplitPercent?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationCreateCpdCreditTypeArgs = {
  creditHoursPerHour: Scalars['Float']['input'];
  name: Scalars['String']['input'];
  regulatoryBody: Scalars['String']['input'];
};


export type MutationCreateDiscussionArgs = {
  input: CreateDiscussionInput;
};


export type MutationCreateDocumentVersionArgs = {
  mediaAssetId: Scalars['ID']['input'];
  summary?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateEmbeddingArgs = {
  input: CreateEmbeddingInput;
};


export type MutationCreateExamBlueprintArgs = {
  input: CreateExamBlueprintInput;
};


export type MutationCreateExamItemArgs = {
  input: CreateExamItemInput;
};


export type MutationCreateLessonArgs = {
  input: CreateLessonInput;
};


export type MutationCreateLessonPlanArgs = {
  input: CreateLessonPlanInput;
};


export type MutationCreateLiveSessionArgs = {
  contentItemId: Scalars['ID']['input'];
  meetingName: Scalars['String']['input'];
  scheduledAt: Scalars['String']['input'];
};


export type MutationCreateMicrolearningPathArgs = {
  contentItemIds: Array<Scalars['ID']['input']>;
  title: Scalars['String']['input'];
  topicClusterId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationCreateModuleArgs = {
  input: CreateModuleInput;
};


export type MutationCreateOrgBadgeArgs = {
  input: CreateOrgBadgeInput;
};


export type MutationCreateOrganizationArgs = {
  input: CreateOrganizationInput;
};


export type MutationCreatePeerReviewRubricArgs = {
  input: CreateRubricInput;
};


export type MutationCreatePersonArgs = {
  input: CreatePersonInput;
};


export type MutationCreatePipelineTemplateArgs = {
  input: CreatePipelineTemplateInput;
};


export type MutationCreatePollArgs = {
  options: Array<Scalars['String']['input']>;
  question: Scalars['String']['input'];
  sessionId: Scalars['ID']['input'];
};


export type MutationCreateProgramArgs = {
  badgeEmoji?: InputMaybe<Scalars['String']['input']>;
  description: Scalars['String']['input'];
  requiredCourseIds: Array<Scalars['ID']['input']>;
  title: Scalars['String']['input'];
  totalHours?: InputMaybe<Scalars['Int']['input']>;
};


export type MutationCreateReviewCardArgs = {
  conceptName: Scalars['String']['input'];
};


export type MutationCreateRoleArgs = {
  input: CreateRoleInput;
};


export type MutationCreateSavedSearchArgs = {
  input: CreateSavedSearchInput;
};


export type MutationCreateScenarioTemplateArgs = {
  characterPersona: Scalars['String']['input'];
  difficultyLevel: Scalars['String']['input'];
  domain: Scalars['String']['input'];
  maxTurns?: InputMaybe<Scalars['Int']['input']>;
  sceneDescription: Scalars['String']['input'];
  title: Scalars['String']['input'];
};


export type MutationCreateSkillPathArgs = {
  input: CreateSkillPathInput;
};


export type MutationCreateSkillProfileArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  requiredConcepts: Array<Scalars['String']['input']>;
  roleName: Scalars['String']['input'];
};


export type MutationCreateSourceArgs = {
  input: CreateSourceInput;
};


export type MutationCreateTermArgs = {
  input: CreateTermInput;
};


export type MutationCreateTopicClusterArgs = {
  input: CreateTopicClusterInput;
};


export type MutationCreateUserArgs = {
  input: CreateUserInput;
};


export type MutationCreateVisualAnchorArgs = {
  input: CreateVisualAnchorInput;
};


export type MutationCreateWebhookArgs = {
  input: CreateWebhookInput;
};


export type MutationDeactivateAgentTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeactivateLibraryCourseArgs = {
  libraryCourseId: Scalars['ID']['input'];
};


export type MutationDeactivateUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDelegateRoleArgs = {
  roleId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
  validUntil?: InputMaybe<Scalars['String']['input']>;
};


export type MutationDeleteAgentTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteAnnotationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteAnnouncementArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteBadgeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteConceptArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCourseArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteEmbeddingArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteEmbeddingsByContentItemArgs = {
  contentItemId: Scalars['ID']['input'];
};


export type MutationDeleteKnowledgeSourceArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteLessonArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteModuleArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteOrgBadgeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeletePipelineTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteRoleArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSavedSearchArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteVisualAnchorArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteWebhookArgs = {
  id: Scalars['ID']['input'];
};


export type MutationEndLiveSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationEndProctoringSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationEndSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationEnrollCourseArgs = {
  courseId: Scalars['ID']['input'];
};


export type MutationEnrollInProgramArgs = {
  programId: Scalars['ID']['input'];
};


export type MutationExportAnalyticsArgs = {
  input: ExportAnalyticsInput;
};


export type MutationExportAuditLogArgs = {
  format?: AuditExportFormat;
  fromDate: Scalars['String']['input'];
  toDate: Scalars['String']['input'];
};


export type MutationExportCourseAsScormArgs = {
  courseId: Scalars['ID']['input'];
};


export type MutationExportCourseAsScorm2004Args = {
  courseId: Scalars['ID']['input'];
};


export type MutationExportCpdReportArgs = {
  format: CpdExportFormat;
};


export type MutationFinishScormSessionArgs = {
  data: Scalars['String']['input'];
  sessionId: Scalars['ID']['input'];
};


export type MutationFlagExamQuestionArgs = {
  itemId: Scalars['ID']['input'];
  sessionId: Scalars['ID']['input'];
};


export type MutationFlagProctoringEventArgs = {
  detail?: InputMaybe<Scalars['String']['input']>;
  sessionId: Scalars['ID']['input'];
  type: ProctoringFlagType;
};


export type MutationFollowUserArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationForkCourseArgs = {
  courseId: Scalars['ID']['input'];
};


export type MutationGenerateBiApiKeyArgs = {
  description: Scalars['String']['input'];
};


export type MutationGenerateCertExamItemsArgs = {
  input: GenerateCertExamItemsInput;
};


export type MutationGenerateComplianceReportArgs = {
  asOf?: InputMaybe<Scalars['String']['input']>;
  courseIds: Array<Scalars['ID']['input']>;
};


export type MutationGenerateCourseFromPromptArgs = {
  input: GenerateCourseInput;
};


export type MutationGenerateDiscussionSummaryArgs = {
  discussionId: Scalars['ID']['input'];
};


export type MutationGenerateEmbeddingArgs = {
  entityId: Scalars['ID']['input'];
  entityType: Scalars['String']['input'];
  text: Scalars['String']['input'];
};


export type MutationGenerateExamItemsArgs = {
  input: GenerateExamItemsInput;
};


export type MutationGenerateLessonArgs = {
  input: LessonPipelineInput;
};


export type MutationGenerateScimTokenArgs = {
  input: GenerateScimTokenInput;
};


export type MutationGenerateXapiTokenArgs = {
  description: Scalars['String']['input'];
  lrsEndpoint?: InputMaybe<Scalars['String']['input']>;
};


export type MutationGradeQuizSubmissionArgs = {
  answers: Scalars['JSON']['input'];
  contentItemId: Scalars['ID']['input'];
};


export type MutationImportFromDriveArgs = {
  input: DriveImportInput;
};


export type MutationImportFromWebsiteArgs = {
  input: WebsiteImportInput;
};


export type MutationImportFromYoutubeArgs = {
  input: YoutubeImportInput;
};


export type MutationImportScormPackageArgs = {
  fileKey: Scalars['String']['input'];
};


export type MutationIngestContentArgs = {
  courseId: Scalars['ID']['input'];
  file: Scalars['Upload']['input'];
};


export type MutationIngestYoutubeLessonArgs = {
  input: IngestYoutubeLessonInput;
};


export type MutationInitScormSessionArgs = {
  contentItemId: Scalars['ID']['input'];
};


export type MutationInviteUserArgs = {
  input: InviteUserInput;
};


export type MutationIssueBadgeArgs = {
  badgeDefinitionId: Scalars['ID']['input'];
  evidenceUrl?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['ID']['input'];
};


export type MutationIssueGraphGroundedBadgeArgs = {
  courseId: Scalars['ID']['input'];
  definitionId: Scalars['ID']['input'];
  requiredConceptIds: Array<Scalars['ID']['input']>;
};


export type MutationJoinChallengeArgs = {
  challengeId: Scalars['ID']['input'];
};


export type MutationJoinDiscussionArgs = {
  discussionId: Scalars['ID']['input'];
};


export type MutationJoinLiveSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationLeaveDiscussionArgs = {
  discussionId: Scalars['ID']['input'];
};


export type MutationLicenseCourseArgs = {
  input: LicenseCourseInput;
};


export type MutationLikeMessageArgs = {
  messageId: Scalars['ID']['input'];
};


export type MutationLinkConceptsArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  fromId: Scalars['ID']['input'];
  relationshipType: Scalars['String']['input'];
  strength?: InputMaybe<Scalars['Float']['input']>;
  toId: Scalars['ID']['input'];
};


export type MutationMarkContentViewedArgs = {
  contentItemId: Scalars['ID']['input'];
};


export type MutationMarkNotificationDeliveryReadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationMergeConceptGraphNodesArgs = {
  input: MergeConceptsInput;
};


export type MutationPromoteAnnotationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishAnnouncementArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishCourseArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishEnrichedLessonArgs = {
  lessonId: Scalars['ID']['input'];
};


export type MutationPublishLessonArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishLessonPlanArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishListingArgs = {
  courseId: Scalars['ID']['input'];
};


export type MutationPublishToMarketplaceArgs = {
  input: PublishToMarketplaceInput;
};


export type MutationPurchaseCourseArgs = {
  courseId: Scalars['ID']['input'];
};


export type MutationRecordReviewArgs = {
  cardId: Scalars['ID']['input'];
  quality: Scalars['Int']['input'];
};


export type MutationRecordScenarioChoiceArgs = {
  choiceId: Scalars['String']['input'];
  fromContentItemId: Scalars['ID']['input'];
  scenarioRootId: Scalars['ID']['input'];
};


export type MutationRegeneratePartnerApiKeyArgs = {
  partnerId: Scalars['ID']['input'];
};


export type MutationRegisterLtiPlatformArgs = {
  input: RegisterLtiPlatformInput;
};


export type MutationRegisterPushSubscriptionArgs = {
  subscriptionJson: Scalars['String']['input'];
};


export type MutationRegisterPushTokenArgs = {
  expoPushToken?: InputMaybe<Scalars['String']['input']>;
  platform: PushPlatform;
  webPushSubscription?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRegisterWhatsAppArgs = {
  countryCode: Scalars['String']['input'];
  phoneNumber: Scalars['String']['input'];
};


export type MutationReindexCourseEmbeddingsArgs = {
  courseId: Scalars['ID']['input'];
};


export type MutationRejectPilotRequestArgs = {
  reason?: InputMaybe<Scalars['String']['input']>;
  requestId: Scalars['ID']['input'];
};


export type MutationRemoveCompetencyGoalArgs = {
  goalId: Scalars['ID']['input'];
};


export type MutationRemoveCustomDomainArgs = {
  domainId: Scalars['ID']['input'];
};


export type MutationRemoveMemberArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationRemoveTeamMemberArgs = {
  memberId: Scalars['ID']['input'];
};


export type MutationReorderLessonStepsArgs = {
  planId: Scalars['ID']['input'];
  stepIds: Array<Scalars['ID']['input']>;
};


export type MutationReorderModulesArgs = {
  courseId: Scalars['ID']['input'];
  moduleIds: Array<Scalars['ID']['input']>;
};


export type MutationReplyToAnnotationArgs = {
  annotationId: Scalars['ID']['input'];
  content: Scalars['String']['input'];
};


export type MutationRequestContentTranslationArgs = {
  contentItemId: Scalars['ID']['input'];
  targetLocale: Scalars['String']['input'];
};


export type MutationRequestDomainVerificationArgs = {
  domain: Scalars['String']['input'];
};


export type MutationRequestPeerMatchArgs = {
  courseId?: InputMaybe<Scalars['String']['input']>;
  matchedUserId: Scalars['ID']['input'];
};


export type MutationRequestRefundArgs = {
  purchaseId: Scalars['ID']['input'];
};


export type MutationResetNotificationTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationResetUserPasswordArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationResolveAnnotationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationResolveAtRiskFlagArgs = {
  flagId: Scalars['ID']['input'];
};


export type MutationRespondToPeerMatchArgs = {
  accept: Scalars['Boolean']['input'];
  requestId: Scalars['ID']['input'];
};


export type MutationRestoreRunArgs = {
  runId: Scalars['ID']['input'];
};


export type MutationRetireExamItemArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRetryPipelineModuleArgs = {
  moduleType: PipelineModuleType;
  runId: Scalars['ID']['input'];
};


export type MutationRevokeApiKeyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRevokeBiApiKeyArgs = {
  tokenId: Scalars['ID']['input'];
};


export type MutationRevokeBadgeArgs = {
  assertionId: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
};


export type MutationRevokeCourseLicenseArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRevokeDelegationArgs = {
  delegationId: Scalars['ID']['input'];
};


export type MutationRevokeInvitationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRevokeScimTokenArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRevokeXapiTokenArgs = {
  tokenId: Scalars['ID']['input'];
};


export type MutationRollbackToVersionArgs = {
  versionId: Scalars['ID']['input'];
};


export type MutationSaveAtRiskThresholdsArgs = {
  input: AtRiskThresholdsInput;
};


export type MutationSaveLessonPipelineArgs = {
  input: SaveLessonPipelineInput;
  lessonId: Scalars['ID']['input'];
};


export type MutationSavePortalLayoutArgs = {
  blocksJson: Scalars['String']['input'];
  title: Scalars['String']['input'];
};


export type MutationScheduleGdprErasureArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationScheduleReviewArgs = {
  algorithm?: InputMaybe<AlgorithmType>;
  conceptName: Scalars['String']['input'];
  initialDueDate?: InputMaybe<Scalars['DateTime']['input']>;
};


export type MutationSendMessageArgs = {
  content: Scalars['String']['input'];
  sessionId: Scalars['ID']['input'];
};


export type MutationSendRoleplayMessageArgs = {
  message: Scalars['String']['input'];
  sessionId: Scalars['ID']['input'];
};


export type MutationSetBlockAnchorTimestampArgs = {
  input: SetBlockAnchorTimestampInput;
};


export type MutationStartAgentExecutionArgs = {
  input: StartAgentExecutionInput;
};


export type MutationStartAgentSessionArgs = {
  context: Scalars['JSON']['input'];
  templateType: TemplateType;
};


export type MutationStartExamSessionArgs = {
  blueprintId: Scalars['ID']['input'];
};


export type MutationStartLessonPipelineRunArgs = {
  pipelineId: Scalars['ID']['input'];
};


export type MutationStartLiveSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationStartProctoringSessionArgs = {
  assessmentId: Scalars['ID']['input'];
};


export type MutationStartRoleplaySessionArgs = {
  scenarioId: Scalars['ID']['input'];
};


export type MutationSubmitAssessmentResponseArgs = {
  campaignId: Scalars['ID']['input'];
  criteriaScores: Scalars['String']['input'];
  narrative?: InputMaybe<Scalars['String']['input']>;
  raterRole: RaterRole;
};


export type MutationSubmitChallengeScoreArgs = {
  challengeId: Scalars['ID']['input'];
  score: Scalars['Int']['input'];
};


export type MutationSubmitExamArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationSubmitExamAnswerArgs = {
  answer: Scalars['JSON']['input'];
  itemId: Scalars['ID']['input'];
  sessionId: Scalars['ID']['input'];
};


export type MutationSubmitForPeerReviewArgs = {
  contentItemId: Scalars['ID']['input'];
  submissionText: Scalars['String']['input'];
};


export type MutationSubmitPeerReviewArgs = {
  assignmentId: Scalars['ID']['input'];
  criteriaScores: Scalars['String']['input'];
  feedback?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSubmitPilotRequestArgs = {
  input: PilotRequestInput;
};


export type MutationSubmitReviewArgs = {
  cardId: Scalars['ID']['input'];
  quality: Scalars['Int']['input'];
};


export type MutationSubmitTextAssignmentArgs = {
  contentItemId: Scalars['ID']['input'];
  courseId: Scalars['ID']['input'];
  textContent: Scalars['String']['input'];
};


export type MutationSuspendUserArgs = {
  suspended: Scalars['Boolean']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationSyncAnchorsArgs = {
  mediaAssetId: Scalars['ID']['input'];
};


export type MutationTestWebhookArgs = {
  id: Scalars['ID']['input'];
};


export type MutationToggleLtiPlatformArgs = {
  id: Scalars['ID']['input'];
  isActive: Scalars['Boolean']['input'];
};


export type MutationUnenrollCourseArgs = {
  courseId: Scalars['ID']['input'];
};


export type MutationUnfollowUserArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationUnpublishCourseArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUnpublishFromMarketplaceArgs = {
  listingId: Scalars['ID']['input'];
};


export type MutationUnregisterPushTokenArgs = {
  platform: PushPlatform;
};


export type MutationUpdateAgentTemplateArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAgentTemplateInput;
};


export type MutationUpdateAnnotationArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAnnotationInput;
};


export type MutationUpdateAnnouncementArgs = {
  id: Scalars['ID']['input'];
  input: UpdateAnnouncementInput;
};


export type MutationUpdateBadgeArgs = {
  id: Scalars['ID']['input'];
  input: UpdateBadgeInput;
};


export type MutationUpdateConceptArgs = {
  id: Scalars['ID']['input'];
  input: UpdateConceptInput;
};


export type MutationUpdateConsentArgs = {
  input: UpdateConsentInput;
};


export type MutationUpdateCourseArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCourseInput;
};


export type MutationUpdateCourseComplianceSettingsArgs = {
  complianceDueDate?: InputMaybe<Scalars['String']['input']>;
  courseId: Scalars['ID']['input'];
  isCompliance: Scalars['Boolean']['input'];
};


export type MutationUpdateExamBlueprintArgs = {
  id: Scalars['ID']['input'];
  input: UpdateExamBlueprintInput;
};


export type MutationUpdateExamItemArgs = {
  id: Scalars['ID']['input'];
  input: UpdateExamItemInput;
};


export type MutationUpdateGamificationConfigArgs = {
  input: UpdateGamificationConfigInput;
};


export type MutationUpdateLessonArgs = {
  id: Scalars['ID']['input'];
  input: UpdateLessonInput;
};


export type MutationUpdateLessonCitationArgs = {
  citationId: Scalars['ID']['input'];
  input: UpdateCitationInput;
};


export type MutationUpdateMasteryLevelArgs = {
  level: MasteryLevel;
  nodeId: Scalars['ID']['input'];
};


export type MutationUpdateMediaAltTextArgs = {
  altText: Scalars['String']['input'];
  mediaId: Scalars['ID']['input'];
};


export type MutationUpdateMemberRoleArgs = {
  role: Scalars['String']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationUpdateModuleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateModuleInput;
};


export type MutationUpdateMySkillProgressArgs = {
  masteryLevel: MasteryLevel;
  skillId: Scalars['ID']['input'];
};


export type MutationUpdateNotificationPreferenceArgs = {
  input: UpdateNotificationPreferenceInput;
};


export type MutationUpdateNotificationTemplateArgs = {
  id: Scalars['ID']['input'];
  input: UpdateNotificationTemplateInput;
};


export type MutationUpdateOnboardingStepArgs = {
  input: UpdateOnboardingStepInput;
};


export type MutationUpdateOrgBadgeArgs = {
  id: Scalars['ID']['input'];
  input: UpdateOrgBadgeInput;
};


export type MutationUpdatePipelineTemplateArgs = {
  id: Scalars['ID']['input'];
  input: UpdatePipelineTemplateInput;
};


export type MutationUpdateProfileVisibilityArgs = {
  isPublic: Scalars['Boolean']['input'];
};


export type MutationUpdateProgramArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  published?: InputMaybe<Scalars['Boolean']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateRoleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateRoleInput;
};


export type MutationUpdateScormSessionArgs = {
  data: Scalars['String']['input'];
  sessionId: Scalars['ID']['input'];
};


export type MutationUpdateSecuritySettingsArgs = {
  input: UpdateSecuritySettingsInput;
};


export type MutationUpdateTenantBrandingArgs = {
  input: UpdateTenantBrandingInput;
};


export type MutationUpdateTenantLanguageSettingsArgs = {
  input: UpdateTenantLanguageSettingsInput;
};


export type MutationUpdateTenantPlanArgs = {
  input: UpdateTenantPlanInput;
};


export type MutationUpdateTenantSocialLinksArgs = {
  input: UpdateTenantSocialLinksInput;
};


export type MutationUpdateUserArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
};


export type MutationUpdateUserPreferencesArgs = {
  input: UpdateUserPreferencesInput;
};


export type MutationUpdateVisualAnchorArgs = {
  id: Scalars['ID']['input'];
  input: UpdateVisualAnchorInput;
};


export type MutationUpdateWebhookArgs = {
  id: Scalars['ID']['input'];
  input: UpdateWebhookInput;
};


export type MutationUploadModel3DArgs = {
  contentLength: Scalars['Int']['input'];
  courseId: Scalars['ID']['input'];
  filename: Scalars['String']['input'];
  format: Scalars['String']['input'];
  lessonId: Scalars['ID']['input'];
};


export type MutationVerifyWhatsAppArgs = {
  code: Scalars['String']['input'];
};


export type MutationVoidExamSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationVotePollArgs = {
  optionIndex: Scalars['Int']['input'];
  pollId: Scalars['ID']['input'];
};

export type Notification = {
  __typename?: 'Notification';
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  payload?: Maybe<Scalars['JSON']['output']>;
  readAt?: Maybe<Scalars['DateTime']['output']>;
  title: Scalars['String']['output'];
  type: NotificationType;
  userId: Scalars['ID']['output'];
};

export type NotificationAnalytics = {
  __typename?: 'NotificationAnalytics';
  byChannel: Array<ChannelAnalytics>;
  byType: Array<TypeAnalytics>;
  totalDelivered: Scalars['Int']['output'];
  totalFailed: Scalars['Int']['output'];
  totalSent: Scalars['Int']['output'];
};

export enum NotificationChannel {
  Email = 'EMAIL',
  InApp = 'IN_APP',
  PushMobile = 'PUSH_MOBILE',
  PushWeb = 'PUSH_WEB',
  Whatsapp = 'WHATSAPP'
}

export type NotificationDelivery = {
  __typename?: 'NotificationDelivery';
  body: Scalars['String']['output'];
  channel: NotificationChannel;
  createdAt: Scalars['DateTime']['output'];
  deliveredAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  notificationType: Scalars['String']['output'];
  readAt?: Maybe<Scalars['DateTime']['output']>;
  sentAt?: Maybe<Scalars['DateTime']['output']>;
  status: DeliveryStatus;
  title: Scalars['String']['output'];
};

export type NotificationDeliveryConnection = {
  __typename?: 'NotificationDeliveryConnection';
  edges: Array<NotificationDeliveryEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type NotificationDeliveryEdge = {
  __typename?: 'NotificationDeliveryEdge';
  cursor: Scalars['String']['output'];
  node: NotificationDelivery;
};

export type NotificationPreference = {
  __typename?: 'NotificationPreference';
  channel: NotificationChannel;
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  notificationType: NotificationType;
};

export type NotificationTemplate = {
  __typename?: 'NotificationTemplate';
  bodyHtml: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
  subject: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  variables: Array<Scalars['String']['output']>;
};

export enum NotificationType {
  Announcement = 'ANNOUNCEMENT',
  AtRiskAlert = 'AT_RISK_ALERT',
  BadgeIssued = 'BADGE_ISSUED',
  CourseEnrolled = 'COURSE_ENROLLED',
  DiscussionReply = 'DISCUSSION_REPLY',
  LessonAvailable = 'LESSON_AVAILABLE',
  PeerFollowedActivity = 'PEER_FOLLOWED_ACTIVITY',
  PeerReviewAssigned = 'PEER_REVIEW_ASSIGNED',
  PeerReviewReceived = 'PEER_REVIEW_RECEIVED',
  SessionStarting = 'SESSION_STARTING',
  SrsReviewDue = 'SRS_REVIEW_DUE',
  StreakReminder = 'STREAK_REMINDER',
  UserFollowed = 'USER_FOLLOWED'
}

export enum OcrMethod {
  EmbeddedText = 'EMBEDDED_TEXT',
  Moondream = 'MOONDREAM',
  None = 'NONE',
  Paddle = 'PADDLE',
  Tesseract = 'TESSERACT',
  Trocr = 'TROCR'
}

export type OnboardingState = {
  __typename?: 'OnboardingState';
  completed: Scalars['Boolean']['output'];
  currentStep: Scalars['Int']['output'];
  data?: Maybe<Scalars['JSON']['output']>;
  role: Scalars['String']['output'];
  skipped: Scalars['Boolean']['output'];
  totalSteps: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
};

export type OpenBadge = {
  __typename?: 'OpenBadge';
  badgeDefinitionId: Scalars['ID']['output'];
  definition: OpenBadgeDefinition;
  evidenceUrl?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  issuedAt: Scalars['String']['output'];
  proof: Scalars['JSON']['output'];
  recipientId: Scalars['ID']['output'];
  revoked: Scalars['Boolean']['output'];
  revokedAt?: Maybe<Scalars['String']['output']>;
  revokedReason?: Maybe<Scalars['String']['output']>;
  tenantId: Scalars['ID']['output'];
  vcDocument: Scalars['String']['output'];
};

/** OpenBadges 3.0 assertion — one earned credential per user */
export type OpenBadgeAssertion = {
  __typename?: 'OpenBadgeAssertion';
  badgeDefinitionId: Scalars['ID']['output'];
  badgeDescription: Scalars['String']['output'];
  badgeName: Scalars['String']['output'];
  /** Resolved badge definition (eager-loaded with the assertion) */
  definition?: Maybe<OpenBadgeDefinition>;
  evidenceUrl?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  issuedAt: Scalars['String']['output'];
  recipientId: Scalars['ID']['output'];
  revoked: Scalars['Boolean']['output'];
  revokedAt?: Maybe<Scalars['String']['output']>;
  revokedReason?: Maybe<Scalars['String']['output']>;
  /** LinkedIn certifications deep-link */
  shareUrl: Scalars['String']['output'];
  /** W3C VC JSON document (serialized), null when not yet signed */
  vcDocument?: Maybe<Scalars['String']['output']>;
  /** Public JSON-LD URL (no auth) — shareable */
  verifyUrl: Scalars['String']['output'];
};

/** OpenBadges 3.0 badge definition (issuer-managed, tenant-scoped) */
export type OpenBadgeDefinition = {
  __typename?: 'OpenBadgeDefinition';
  createdAt: Scalars['String']['output'];
  criteriaUrl?: Maybe<Scalars['String']['output']>;
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  issuerId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  version: Scalars['String']['output'];
};

export type OrgAnalytics = {
  __typename?: 'OrgAnalytics';
  activeLearners: Scalars['Int']['output'];
  completionRate: Scalars['Float']['output'];
  dailySnapshots: Array<AnalyticsSnapshot>;
  topCourses: Array<CourseAnalyticsItem>;
  totalEnrollments: Scalars['Int']['output'];
  totalLearningHours: Scalars['Float']['output'];
};

export type OrgBadge = {
  __typename?: 'OrgBadge';
  autoAwardCriteria?: Maybe<Scalars['JSON']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  iconUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  xpRequired: Scalars['Int']['output'];
};

export enum OrgExportFormat {
  Csv = 'CSV',
  Pdf = 'PDF'
}

export type OrgInvitation = {
  __typename?: 'OrgInvitation';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  expiresAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  role: Scalars['String']['output'];
  status: InvitationStatus;
};

export type OrgMember = {
  __typename?: 'OrgMember';
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  joinedAt: Scalars['DateTime']['output'];
  lastActiveAt?: Maybe<Scalars['DateTime']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  role: Scalars['String']['output'];
};

export type OrgOnboardingChecklist = {
  __typename?: 'OrgOnboardingChecklist';
  brandingConfigured: Scalars['Boolean']['output'];
  completionPercentage: Scalars['Int']['output'];
  domainConfigured: Scalars['Boolean']['output'];
  firstCourseCreated: Scalars['Boolean']['output'];
  firstUserInvited: Scalars['Boolean']['output'];
  ssoConfigured: Scalars['Boolean']['output'];
};

export enum OrgType {
  College = 'COLLEGE',
  Corporate = 'CORPORATE',
  Defense = 'DEFENSE',
  Government = 'GOVERNMENT',
  University = 'UNIVERSITY'
}

export type Organization = {
  __typename?: 'Organization';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  memberCount: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  onboardingChecklist?: Maybe<OrgOnboardingChecklist>;
  plan: TenantPlan;
  provisioningStatus: ProvisioningStatus;
  slug: Scalars['String']['output'];
  trialEndsAt?: Maybe<Scalars['DateTime']['output']>;
};

export type OrganizationDomain = {
  __typename?: 'OrganizationDomain';
  createdAt: Scalars['DateTime']['output'];
  domain: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  verified: Scalars['Boolean']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type PartnerDashboard = {
  __typename?: 'PartnerDashboard';
  apiKeyMasked: Scalars['String']['output'];
  revenueByMonth: Array<RevenueByMonth>;
  status: Scalars['String']['output'];
  totalRevenue: Scalars['Int']['output'];
};

export enum PassingMethod {
  IrtTheta = 'IRT_THETA',
  Percentage = 'PERCENTAGE',
  ScaledScore = 'SCALED_SCORE'
}

export type PaymentIntentResult = {
  __typename?: 'PaymentIntentResult';
  clientSecret: Scalars['String']['output'];
  paymentIntentId: Scalars['String']['output'];
};

export type PeerMatch = {
  __typename?: 'PeerMatch';
  complementarySkills: Array<Scalars['String']['output']>;
  matchReason: Scalars['String']['output'];
  sharedCourseCount: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
};

export type PeerMatchRequest = {
  __typename?: 'PeerMatchRequest';
  courseId?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  matchReason?: Maybe<Scalars['String']['output']>;
  matchedUserId: Scalars['ID']['output'];
  requesterId: Scalars['ID']['output'];
  status: Scalars['String']['output'];
};

export type PeerReviewAssignment = {
  __typename?: 'PeerReviewAssignment';
  contentItemId: Scalars['ID']['output'];
  contentItemTitle: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  feedback?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  score?: Maybe<Scalars['Int']['output']>;
  status: PeerReviewStatus;
  submissionText?: Maybe<Scalars['String']['output']>;
  submitterDisplayName?: Maybe<Scalars['String']['output']>;
  submitterId: Scalars['ID']['output'];
};

export type PeerReviewRubric = {
  __typename?: 'PeerReviewRubric';
  contentItemId: Scalars['ID']['output'];
  criteria: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isAnonymous: Scalars['Boolean']['output'];
  minReviewers: Scalars['Int']['output'];
};

export enum PeerReviewStatus {
  Pending = 'PENDING',
  Rated = 'RATED',
  Submitted = 'SUBMITTED'
}

export type PeerReviewSubmission = {
  __typename?: 'PeerReviewSubmission';
  contentItemId: Scalars['ID']['output'];
  contentItemTitle: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  feedback?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  score?: Maybe<Scalars['Int']['output']>;
  status: PeerReviewStatus;
};

export type Person = {
  __typename?: 'Person';
  bio?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  tenantId: Scalars['ID']['output'];
  updatedAt: Scalars['String']['output'];
};

export type PilotRequest = {
  __typename?: 'PilotRequest';
  contactEmail: Scalars['String']['output'];
  contactName: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  estimatedUsers?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  orgName: Scalars['String']['output'];
  orgType: OrgType;
  status: PilotRequestStatus;
  useCase?: Maybe<Scalars['String']['output']>;
};

export type PilotRequestInput = {
  contactEmail: Scalars['String']['input'];
  contactName: Scalars['String']['input'];
  contactPhone?: InputMaybe<Scalars['String']['input']>;
  estimatedUsers: Scalars['Int']['input'];
  orgName: Scalars['String']['input'];
  orgType: OrgType;
  useCase: Scalars['String']['input'];
};

export enum PilotRequestStatus {
  Approved = 'APPROVED',
  Expired = 'EXPIRED',
  Pending = 'PENDING',
  Rejected = 'REJECTED'
}

export enum PipelineModuleType {
  Asr = 'ASR',
  CitationVerifier = 'CITATION_VERIFIER',
  ContentCleaning = 'CONTENT_CLEANING',
  DiagramGenerator = 'DIAGRAM_GENERATOR',
  Ingestion = 'INGESTION',
  NerSourceLinking = 'NER_SOURCE_LINKING',
  PublishShare = 'PUBLISH_SHARE',
  QaGate = 'QA_GATE',
  StructuredNotes = 'STRUCTURED_NOTES',
  Summarization = 'SUMMARIZATION'
}

export enum PipelineStatus {
  Completed = 'COMPLETED',
  Draft = 'DRAFT',
  Failed = 'FAILED',
  Ready = 'READY',
  Running = 'RUNNING'
}

export type PlagiarismReport = {
  __typename?: 'PlagiarismReport';
  checkedAt: Scalars['DateTime']['output'];
  highestSimilarity: Scalars['Float']['output'];
  isFlagged: Scalars['Boolean']['output'];
  similarSubmissions: Array<SimilarSubmission>;
  submissionId: Scalars['ID']['output'];
};

export type PlatformStats = {
  __typename?: 'PlatformStats';
  avgEngagementScore: Scalars['Float']['output'];
  totalCoursesCreated: Scalars['Int']['output'];
  totalLearners: Scalars['Int']['output'];
  totalTenants: Scalars['Int']['output'];
};

export type PollOptionResult = {
  __typename?: 'PollOptionResult';
  count: Scalars['Int']['output'];
  percentage: Scalars['Float']['output'];
  text: Scalars['String']['output'];
};

export type PollResults = {
  __typename?: 'PollResults';
  options: Array<PollOptionResult>;
  pollId: Scalars['ID']['output'];
  question: Scalars['String']['output'];
  totalVotes: Scalars['Int']['output'];
};

export type PortalBlock = {
  __typename?: 'PortalBlock';
  config: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  order: Scalars['Int']['output'];
  type: Scalars['String']['output'];
};

export type PortalPage = {
  __typename?: 'PortalPage';
  blocks: Array<PortalBlock>;
  id: Scalars['ID']['output'];
  published: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type PresignedUploadUrl = {
  __typename?: 'PresignedUploadUrl';
  expiresAt: Scalars['String']['output'];
  fileKey: Scalars['String']['output'];
  uploadUrl: Scalars['String']['output'];
};

export enum PricingModel {
  FlatRate = 'FLAT_RATE',
  Free = 'FREE',
  PerSeat = 'PER_SEAT'
}

/** A flag event captured during a proctored assessment session. */
export type ProctoringFlag = {
  __typename?: 'ProctoringFlag';
  detail?: Maybe<Scalars['String']['output']>;
  timestamp: Scalars['String']['output'];
  type: ProctoringFlagType;
};

export enum ProctoringFlagType {
  CopyPaste = 'COPY_PASTE',
  FaceNotDetected = 'FACE_NOT_DETECTED',
  GazeAway = 'GAZE_AWAY',
  MultipleFaces = 'MULTIPLE_FACES',
  TabSwitch = 'TAB_SWITCH'
}

export type ProctoringSession = {
  __typename?: 'ProctoringSession';
  assessmentId: Scalars['ID']['output'];
  endedAt?: Maybe<Scalars['String']['output']>;
  flagCount: Scalars['Int']['output'];
  flags: Array<ProctoringFlag>;
  id: Scalars['ID']['output'];
  startedAt?: Maybe<Scalars['String']['output']>;
  status: ProctoringSessionStatus;
  userId: Scalars['ID']['output'];
};

export enum ProctoringSessionStatus {
  Active = 'ACTIVE',
  Completed = 'COMPLETED',
  Flagged = 'FLAGGED',
  Pending = 'PENDING'
}

export type ProgramEnrollment = {
  __typename?: 'ProgramEnrollment';
  certificateId?: Maybe<Scalars['ID']['output']>;
  completedAt?: Maybe<Scalars['String']['output']>;
  enrolledAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  programId: Scalars['ID']['output'];
  userId: Scalars['ID']['output'];
};

export type ProgramProgress = {
  __typename?: 'ProgramProgress';
  completedCourseIds: Array<Scalars['ID']['output']>;
  completedCourses: Scalars['Int']['output'];
  percentComplete: Scalars['Float']['output'];
  totalCourses: Scalars['Int']['output'];
};

export enum ProvisioningStatus {
  Active = 'ACTIVE',
  Failed = 'FAILED',
  Provisioning = 'PROVISIONING',
  Suspended = 'SUSPENDED'
}

export type PublicCourse = {
  __typename?: 'PublicCourse';
  completedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
};

export type PublicProfile = {
  __typename?: 'PublicProfile';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  badgesCount: Scalars['Int']['output'];
  bio?: Maybe<Scalars['String']['output']>;
  completedCourses: Array<PublicCourse>;
  completedCoursesCount: Scalars['Int']['output'];
  conceptsMastered: Scalars['Int']['output'];
  currentStreak: Scalars['Int']['output'];
  displayName: Scalars['String']['output'];
  joinedAt: Scalars['DateTime']['output'];
  longestStreak: Scalars['Int']['output'];
  totalLearningMinutes: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
};

export type PublicTenantBranding = {
  __typename?: 'PublicTenantBranding';
  accentColor: Scalars['String']['output'];
  faviconUrl: Scalars['String']['output'];
  logoUrl: Scalars['String']['output'];
  organizationName: Scalars['String']['output'];
  primaryColor: Scalars['String']['output'];
  tagline?: Maybe<Scalars['String']['output']>;
};

export type PublishToMarketplaceInput = {
  categories?: InputMaybe<Array<Scalars['String']['input']>>;
  courseId: Scalars['ID']['input'];
  currency?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  flatRatePrice?: InputMaybe<Scalars['Float']['input']>;
  previewUrl?: InputMaybe<Scalars['String']['input']>;
  pricePerSeat?: InputMaybe<Scalars['Float']['input']>;
  pricingModel: PricingModel;
  title: Scalars['String']['input'];
};

export type PurchaseDetail = {
  __typename?: 'PurchaseDetail';
  courseTitle: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  listingId: Scalars['ID']['output'];
  price: Scalars['Float']['output'];
  status: PurchaseStatus;
};

export enum PurchaseStatus {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Refunded = 'REFUNDED'
}

export enum PushPlatform {
  Android = 'ANDROID',
  Ios = 'IOS',
  Web = 'WEB'
}

export type PushRegistration = {
  __typename?: 'PushRegistration';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  platform: PushPlatform;
};

export enum QualityTier {
  AiGenerated = 'AI_GENERATED',
  Calibrated = 'CALIBRATED',
  PilotTested = 'PILOT_TESTED',
  SmeReviewed = 'SME_REVIEWED'
}

export type Query = {
  __typename?: 'Query';
  _health: Scalars['String']['output'];
  activeAnnouncements: Array<Announcement>;
  activeChallenges: GroupChallengeConnection;
  /**
   * Return a time-budget-aware adaptive learning path for the given course.
   * Unmastered content ranks highest; items that fit within timeBudgetMinutes
   * receive a +0.2 priority bonus. Requires authentication.
   */
  adaptiveLearningPath: AdaptiveLearningPath;
  adminAnnouncements: AnnouncementResult;
  adminAuditLog: AuditLogResult;
  adminBadges: Array<Badge>;
  adminCourseEnrollments: Array<AdminEnrollmentRecord>;
  adminDashboardStats: AdminDashboardStats;
  adminNotificationTemplates: Array<NotificationTemplate>;
  adminOverview: AdminOverview;
  adminUsers: AdminUsersResult;
  agentExecution?: Maybe<AgentExecution>;
  agentExecutionsByAgent: Array<AgentExecution>;
  agentExecutionsByUser: Array<AgentExecution>;
  agentSession?: Maybe<AgentSession>;
  agentTemplate?: Maybe<AgentTemplate>;
  agentTemplates: Array<AgentTemplate>;
  agentTemplatesByType: Array<AgentTemplate>;
  aiUsageStats: AiUsageStats;
  allPayouts: Array<InstructorPayout>;
  allPilotRequests: Array<PilotRequest>;
  allTenantSubscriptions: Array<TenantSubscription>;
  annotation?: Maybe<Annotation>;
  annotations: Array<Annotation>;
  annotationsByAsset: Array<Annotation>;
  annotationsByUser: Array<Annotation>;
  apiKeys: Array<ApiKey>;
  assessmentResult?: Maybe<AssessmentResult>;
  atRiskLearners: Array<AtRiskLearner>;
  atRiskThresholds: AtRiskThresholds;
  /** List all badge definitions for the tenant (admin/instructor only) */
  badgeDefinitions: Array<OpenBadgeDefinition>;
  biApiTokens: Array<BiApiToken>;
  brandedLoginData?: Maybe<BrandedLoginData>;
  breakoutRooms: Array<BreakoutRoom>;
  campaignsToRespond: Array<AssessmentCampaign>;
  certificateDownloadUrl: Scalars['String']['output'];
  challengeLeaderboard: Array<ChallengeParticipant>;
  chavrutaPartnerMatches: Array<ChavrutaPartnerMatch>;
  cohortInsights: CohortInsightsResult;
  cohortRetention: Array<CohortMetrics>;
  complianceCourses: Array<ComplianceCourse>;
  concept?: Maybe<Concept>;
  conceptByName?: Maybe<Concept>;
  concepts: Array<Concept>;
  contentItem?: Maybe<ContentItem>;
  contentItemsByModule: Array<ContentItem>;
  contentTranslation?: Maybe<ContentTranslation>;
  course?: Maybe<Course>;
  courseAnalytics: CourseAnalytics;
  courseEnrollmentCount: Scalars['Int']['output'];
  courseKnowledgeSources: Array<KnowledgeSource>;
  courseLessonPlan?: Maybe<CourseLessonPlan>;
  courseLicenses: Array<CourseLicense>;
  courseListings: CourseListingConnection;
  courseReadiness: CourseReadiness;
  courses: Array<Course>;
  coursesByInstructor: Array<Course>;
  cpdCreditTypes: Array<CpdCreditType>;
  crmConnection?: Maybe<CrmConnection>;
  crmSyncLog: Array<CrmSyncLogEntry>;
  customDomains: Array<CustomDomain>;
  /**
   * Returns the next unviewed MICROLESSON for the authenticated user today.
   * Returns null when no lessons are available.
   */
  dailyMicrolesson?: Maybe<ContentItem>;
  /** Get a single discussion by ID */
  discussion?: Maybe<Discussion>;
  /** Get all messages in a discussion */
  discussionMessages: Array<DiscussionMessage>;
  /** Get all discussions for a course */
  discussions: Array<Discussion>;
  /** Return cards that are due for review now (dueDate <= current time). */
  dueReviews: Array<SrsCard>;
  embedding?: Maybe<Embedding>;
  embeddingsByContentItem: Array<Embedding>;
  enrichedLesson?: Maybe<EnrichedLesson>;
  examBlueprint?: Maybe<ExamBlueprint>;
  examBlueprintAnalytics: BlueprintAnalytics;
  examBlueprints: Array<ExamBlueprint>;
  examItemBank: ExamItemConnection;
  examItemStatistics?: Maybe<ExamItemStatistics>;
  examReliabilityReport: ExamReliabilityReport;
  examResult?: Maybe<ExamResult>;
  examSession: ExamSession;
  exportTenantAnalytics: Scalars['String']['output'];
  gamificationConfig: GamificationConfig;
  getDocumentVersions: Array<DocumentVersion>;
  /** Alias for dueReviews — returns cards due for review up to the given limit. */
  getDueCards: Array<SrsCard>;
  getPresignedUploadUrl: PresignedUploadUrl;
  getVisualAnchors: Array<VisualAnchor>;
  getVisualAssets: Array<VisualAsset>;
  instructorEarnings: EarningsSummary;
  /** Check knowledge graph topology coverage for a course before badge issuance. */
  knowledgePathCoverage: KnowledgePathCoverage;
  knowledgeSource?: Maybe<KnowledgeSource>;
  leaderboard: Array<LeaderboardEntry>;
  learnerDetail?: Maybe<LearnerAnalyticsDetail>;
  learnerVelocity: Array<LearnerVelocityRow>;
  /**
   * Find the shortest learning path between two concepts identified by name.
   * Returns null when no path exists between the two concepts.
   * Uses Apache AGE shortestPath() traversing RELATED_TO and PREREQUISITE_OF edges.
   */
  learningPath?: Maybe<LearningPath>;
  lesson?: Maybe<Lesson>;
  lessonPipelineRun?: Maybe<LessonPipelineRun>;
  lessonPipelineRuns: Array<LessonPipelineRun>;
  lessonsByCourse: Array<Lesson>;
  libraryCourses: Array<LibraryCourse>;
  listAtRiskLearners: Array<AtRiskLearner>;
  listUsers: UserConnection;
  liveSession?: Maybe<LiveSession>;
  liveSessionById?: Maybe<LiveSession>;
  liveSessions: Array<LiveSession>;
  /** List all LTI platforms for the current tenant. ORG_ADMIN only. */
  ltiPlatforms: Array<LtiPlatform>;
  marketplaceListing?: Maybe<MarketplaceListing>;
  marketplaceListings: Array<MarketplaceListing>;
  me?: Maybe<User>;
  mentorsByPathTopology: Array<MentorPathMatch>;
  /** Lists all microlearning paths for the authenticated user's tenant. */
  microlearningPaths: Array<MicrolearningPath>;
  module?: Maybe<Module>;
  modulesByCourse: Array<Module>;
  myActivityFeed: Array<ActivityFeedItem>;
  myAgentSessions: Array<AgentSession>;
  myBadges: Array<UserBadge>;
  myCampaigns: Array<AssessmentCampaign>;
  myCertificates: Array<Certificate>;
  myChallengePariticipations: Array<ChallengeParticipant>;
  myChavrutaPartnerSessions: Array<ChavrutaPartnerSession>;
  myCompetencyGoals: Array<CompetencyGoal>;
  myCourseLessonPlans: Array<CourseLessonPlan>;
  myCourseProgress: CourseProgress;
  myCpdReport: CpdReport;
  /** Get all discussions the current user has participated in */
  myDiscussions: Array<Discussion>;
  myEnrollments: Array<UserCourse>;
  myExamResults: Array<ExamResult>;
  myExamSessions: Array<ExamSession>;
  myFollowers: Array<Scalars['ID']['output']>;
  myFollowing: Array<Scalars['ID']['output']>;
  myGamificationStats: GamificationStats;
  myInProgressCourses: Array<InProgressCourse>;
  /**
   * Return a personalized learning path toward the named concept.
   * Nodes are ordered from prerequisite to target; isCompleted reflects user progress.
   */
  myLearningPath?: Maybe<AutoPath>;
  myLibraryActivations: Array<LibraryActivation>;
  myNotificationHistory: NotificationDeliveryConnection;
  myNotificationPreferences: Array<NotificationPreference>;
  myOnboardingState?: Maybe<OnboardingState>;
  /** List all non-revoked badges earned by the current user */
  myOpenBadges: Array<OpenBadgeAssertion>;
  myOrganization: Organization;
  myPartnerDashboard: PartnerDashboard;
  myPayouts: Array<InstructorPayout>;
  myPeerMatchRequests: Array<PeerMatchRequest>;
  myPortal?: Maybe<PortalPage>;
  myProgramEnrollments: Array<ProgramEnrollment>;
  myPurchases: Array<MarketplacePurchase>;
  myQuizResults: Array<QuizResult>;
  myRank: Scalars['Int']['output'];
  myRecommendedCourses: Array<RecommendedCourse>;
  myReviewAssignments: Array<PeerReviewAssignment>;
  /**
   * Returns the ordered list of choices the authenticated user has made
   * for the given scenario tree (identified by its root content item ID).
   */
  myScenarioProgress: Array<ScenarioProgressEntry>;
  myScenarioSession?: Maybe<ScenarioSession>;
  myScormSession?: Maybe<ScormSession>;
  mySecuritySettings: SecuritySettings;
  mySkillProgress: Array<LearnerSkillProgress>;
  myStats: UserStats;
  mySubmissions: Array<PeerReviewSubmission>;
  mySubscription?: Maybe<TenantSubscription>;
  myTeamMemberProgress: Array<TeamMemberProgress>;
  myTeamOverview: TeamOverview;
  myTenantBranding: TenantBranding;
  myTenantLanguageSettings: TenantLanguageSettings;
  myTenantUsage?: Maybe<TenantUsage>;
  myTextSubmissions: Array<TextSubmission>;
  /**
   * Return the current user's top mastered topics (for Dashboard mastery widget).
   * Uses existing user_skill_mastery table.
   */
  myTopMasteryTopics: Array<UserMasteryTopic>;
  myTotalPoints: Scalars['Int']['output'];
  myUsage?: Maybe<UsageSnapshot>;
  notificationDeliveryAnalytics: NotificationAnalytics;
  orgAnalytics: OrgAnalytics;
  orgAtRiskLearners: Array<AtRiskLearnerItem>;
  orgBadges: Array<OrgBadge>;
  orgInvitations: Array<OrgInvitation>;
  orgMembers: Array<OrgMember>;
  organizationDomains: Array<OrganizationDomain>;
  peerMatches: Array<PeerMatch>;
  peerReviewRubric?: Maybe<PeerReviewRubric>;
  person?: Maybe<Person>;
  personByName?: Maybe<Person>;
  pipelineTemplates: Array<LessonPipelineTemplate>;
  platformLiveStats?: Maybe<PlatformStats>;
  pollResults: PollResults;
  /**
   * Find the deepest prerequisite chain leading into a named concept.
   * Returns nodes ordered from root prerequisite to the target concept.
   */
  prerequisiteChain: Array<ConceptNode>;
  proctoringReport: Array<ProctoringSession>;
  proctoringSession?: Maybe<ProctoringSession>;
  program?: Maybe<CredentialProgram>;
  programProgress: ProgramProgress;
  programs: Array<CredentialProgram>;
  publicBranding?: Maybe<PublicTenantBranding>;
  publicPortal?: Maybe<PortalPage>;
  publicProfile?: Maybe<PublicProfile>;
  purchases: Array<PurchaseDetail>;
  relatedConcepts: Array<RelatedConcept>;
  /**
   * Collect all distinct concepts reachable from a named concept within `depth` hops
   * (default depth 2, max 5) via RELATED_TO edges using COLLECT(DISTINCT ...) aggregation.
   */
  relatedConceptsByName: Array<ConceptNode>;
  role?: Maybe<Role>;
  roles: Array<Role>;
  runningExecutions: Array<AgentExecution>;
  savedSearches: Array<SavedSearch>;
  /** Returns the scenario node data for a given SCENARIO-type ContentItem. */
  scenarioNode?: Maybe<ScenarioNode>;
  scenarioTemplates: Array<ScenarioTemplate>;
  scimSyncLog: Array<ScimSyncEntry>;
  scimTokens: Array<ScimToken>;
  searchCourses: Array<Course>;
  searchSemantic: Array<SemanticResult>;
  searchUsers: Array<PublicProfile>;
  searchVisualAssets: Array<VisualAssetSearchResult>;
  semanticSearch: Array<SimilarityResult>;
  semanticSearchByContentItem: Array<SimilarityResult>;
  sessionAttendees: SessionAttendeeConnection;
  sessionPolls: Array<SessionPoll>;
  skill?: Maybe<Skill>;
  skillGapAnalysis: SkillGapAnalysis;
  skillPaths: Array<SkillPath>;
  /** List all skill profiles available within the current tenant. */
  skillProfiles: Array<SkillProfile>;
  /**
   * Fetch the skill tree for a course (derived from concept graph relationships).
   * Returns nodes enriched with the current user's mastery level.
   */
  skillTree: SkillTree;
  skills: Array<Skill>;
  socialFeed: Array<SocialFeedItem>;
  socialRecommendations: Array<SocialRecommendation>;
  source?: Maybe<Source>;
  /** Count of cards currently due — used by the Dashboard badge. */
  srsQueueCount: Scalars['Int']['output'];
  submissionPlagiarismReport?: Maybe<PlagiarismReport>;
  tenant?: Maybe<Tenant>;
  tenantAnalytics: TenantAnalytics;
  tenantLeaderboard: Array<XpLeaderboardEntry>;
  tenantSocialLinks?: Maybe<TenantSocialLinks>;
  tenantUsage?: Maybe<UsageSnapshot>;
  tenants: Array<Tenant>;
  term?: Maybe<Term>;
  termByName?: Maybe<Term>;
  topicCluster?: Maybe<TopicCluster>;
  topicClustersByCourse: Array<TopicCluster>;
  trialStatus: TrialStatus;
  user?: Maybe<User>;
  userDelegations: Array<RoleDelegation>;
  users: Array<User>;
  /**
   * Verify a badge assertion by ID — public (no auth required).
   * Checks signature validity, revocation status and expiry.
   */
  verifyBadge: BadgeVerificationResult;
  verifyCertificate?: Maybe<Certificate>;
  verifyErasure?: Maybe<ErasureVerification>;
  /**
   * Verify a badge assertion — returns true if valid, false otherwise.
   * Simpler scalar alternative to verifyBadge for quick validity checks.
   */
  verifyOpenBadge: Scalars['Boolean']['output'];
  webhookDeliveries: Array<WebhookDelivery>;
  webhooks: Array<Webhook>;
  /** Return total count of xAPI statements for this tenant (optionally filtered by since). */
  xapiStatementCount: Scalars['Int']['output'];
  /** Query recent xAPI statements stored in the self-hosted LRS. */
  xapiStatements: Array<XapiStatementResult>;
  /** List all xAPI tokens for this tenant. ORG_ADMIN only. */
  xapiTokens: Array<XapiToken>;
};


export type QueryActiveChallengesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  courseId?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAdaptiveLearningPathArgs = {
  courseId: Scalars['ID']['input'];
  timeBudgetMinutes?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAdminAnnouncementsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAdminAuditLogArgs = {
  action?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  since?: InputMaybe<Scalars['String']['input']>;
  until?: InputMaybe<Scalars['String']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryAdminCourseEnrollmentsArgs = {
  courseId: Scalars['ID']['input'];
};


export type QueryAdminUsersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  role?: InputMaybe<UserRole>;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAgentExecutionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAgentExecutionsByAgentArgs = {
  agentId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryAgentExecutionsByUserArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  userId: Scalars['ID']['input'];
};


export type QueryAgentSessionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAgentTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAgentTemplatesByTypeArgs = {
  template: Scalars['String']['input'];
};


export type QueryAllPayoutsArgs = {
  month?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAllPilotRequestsArgs = {
  status?: InputMaybe<PilotRequestStatus>;
};


export type QueryAnnotationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAnnotationsArgs = {
  assetId?: InputMaybe<Scalars['ID']['input']>;
  layer?: InputMaybe<AnnotationLayer>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryAnnotationsByAssetArgs = {
  assetId: Scalars['ID']['input'];
  layer?: InputMaybe<AnnotationLayer>;
};


export type QueryAnnotationsByUserArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  userId: Scalars['ID']['input'];
};


export type QueryAssessmentResultArgs = {
  campaignId: Scalars['ID']['input'];
};


export type QueryAtRiskLearnersArgs = {
  courseId: Scalars['ID']['input'];
};


export type QueryBrandedLoginDataArgs = {
  slug: Scalars['String']['input'];
};


export type QueryBreakoutRoomsArgs = {
  sessionId: Scalars['ID']['input'];
};


export type QueryCertificateDownloadUrlArgs = {
  certId: Scalars['ID']['input'];
};


export type QueryChallengeLeaderboardArgs = {
  challengeId: Scalars['ID']['input'];
};


export type QueryChavrutaPartnerMatchesArgs = {
  input: FindChavrutaPartnerInput;
};


export type QueryCohortInsightsArgs = {
  conceptId: Scalars['ID']['input'];
  courseId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCohortRetentionArgs = {
  weeksBack?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryConceptArgs = {
  id: Scalars['ID']['input'];
};


export type QueryConceptByNameArgs = {
  name: Scalars['String']['input'];
};


export type QueryConceptsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryContentItemArgs = {
  id: Scalars['ID']['input'];
};


export type QueryContentItemsByModuleArgs = {
  moduleId: Scalars['ID']['input'];
};


export type QueryContentTranslationArgs = {
  contentItemId: Scalars['ID']['input'];
  locale: Scalars['String']['input'];
};


export type QueryCourseArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCourseAnalyticsArgs = {
  courseId: Scalars['ID']['input'];
};


export type QueryCourseEnrollmentCountArgs = {
  courseId: Scalars['ID']['input'];
};


export type QueryCourseKnowledgeSourcesArgs = {
  courseId: Scalars['ID']['input'];
};


export type QueryCourseLessonPlanArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCourseListingsArgs = {
  filters?: InputMaybe<CourseListingFiltersInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  tenantId: Scalars['ID']['input'];
};


export type QueryCourseReadinessArgs = {
  courseId: Scalars['ID']['input'];
};


export type QueryCoursesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCoursesByInstructorArgs = {
  instructorId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCrmSyncLogArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryDiscussionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDiscussionMessagesArgs = {
  discussionId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryDiscussionsArgs = {
  courseId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryDueReviewsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEmbeddingArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEmbeddingsByContentItemArgs = {
  contentItemId: Scalars['ID']['input'];
};


export type QueryEnrichedLessonArgs = {
  lessonId: Scalars['ID']['input'];
};


export type QueryExamBlueprintArgs = {
  id: Scalars['ID']['input'];
};


export type QueryExamBlueprintAnalyticsArgs = {
  blueprintId: Scalars['ID']['input'];
};


export type QueryExamBlueprintsArgs = {
  courseId: Scalars['ID']['input'];
};


export type QueryExamItemBankArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  courseId: Scalars['ID']['input'];
  filters?: InputMaybe<ExamItemFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryExamItemStatisticsArgs = {
  itemId: Scalars['ID']['input'];
};


export type QueryExamReliabilityReportArgs = {
  blueprintId: Scalars['ID']['input'];
};


export type QueryExamResultArgs = {
  sessionId: Scalars['ID']['input'];
};


export type QueryExamSessionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryExportTenantAnalyticsArgs = {
  format: ExportFormat;
  period: AnalyticsPeriod;
};


export type QueryGetDocumentVersionsArgs = {
  mediaAssetId: Scalars['ID']['input'];
};


export type QueryGetDueCardsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetPresignedUploadUrlArgs = {
  contentType: Scalars['String']['input'];
  courseId: Scalars['ID']['input'];
  fileName: Scalars['String']['input'];
};


export type QueryGetVisualAnchorsArgs = {
  mediaAssetId: Scalars['ID']['input'];
};


export type QueryGetVisualAssetsArgs = {
  courseId: Scalars['ID']['input'];
};


export type QueryKnowledgePathCoverageArgs = {
  courseId: Scalars['ID']['input'];
  requiredConceptIds: Array<Scalars['ID']['input']>;
};


export type QueryKnowledgeSourceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryLearnerDetailArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryLearnerVelocityArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  period: AnalyticsPeriod;
};


export type QueryLearningPathArgs = {
  from: Scalars['String']['input'];
  to: Scalars['String']['input'];
};


export type QueryLessonArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLessonPipelineRunArgs = {
  runId: Scalars['ID']['input'];
};


export type QueryLessonPipelineRunsArgs = {
  lessonId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryLessonsByCourseArgs = {
  courseId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryLibraryCoursesArgs = {
  topic?: InputMaybe<LibraryTopic>;
};


export type QueryListAtRiskLearnersArgs = {
  threshold?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryListUsersArgs = {
  input?: InputMaybe<ListUsersInput>;
};


export type QueryLiveSessionArgs = {
  contentItemId: Scalars['ID']['input'];
};


export type QueryLiveSessionByIdArgs = {
  sessionId: Scalars['ID']['input'];
};


export type QueryLiveSessionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMarketplaceListingArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMarketplaceListingsArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  pricingModel?: InputMaybe<PricingModel>;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMentorsByPathTopologyArgs = {
  courseId: Scalars['ID']['input'];
};


export type QueryModuleArgs = {
  id: Scalars['ID']['input'];
};


export type QueryModulesByCourseArgs = {
  courseId: Scalars['ID']['input'];
};


export type QueryMyActivityFeedArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyCourseLessonPlansArgs = {
  courseId: Scalars['ID']['input'];
};


export type QueryMyCourseProgressArgs = {
  courseId: Scalars['ID']['input'];
};


export type QueryMyCpdReportArgs = {
  endDate?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMyDiscussionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyExamResultsArgs = {
  courseId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMyExamSessionsArgs = {
  blueprintId: Scalars['ID']['input'];
};


export type QueryMyFollowersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyFollowingArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyInProgressCoursesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyLearningPathArgs = {
  targetConceptName: Scalars['String']['input'];
};


export type QueryMyNotificationHistoryArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  channels?: InputMaybe<Array<NotificationChannel>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  types?: InputMaybe<Array<NotificationType>>;
};


export type QueryMyPartnerDashboardArgs = {
  partnerId: Scalars['ID']['input'];
};


export type QueryMyQuizResultsArgs = {
  contentItemId: Scalars['ID']['input'];
};


export type QueryMyRecommendedCoursesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyScenarioProgressArgs = {
  scenarioRootId: Scalars['ID']['input'];
};


export type QueryMyScenarioSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type QueryMyScormSessionArgs = {
  contentItemId: Scalars['ID']['input'];
};


export type QueryMyTenantUsageArgs = {
  year?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyTextSubmissionsArgs = {
  contentItemId: Scalars['ID']['input'];
};


export type QueryMyTopMasteryTopicsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryNotificationDeliveryAnalyticsArgs = {
  endDate: Scalars['DateTime']['input'];
  startDate: Scalars['DateTime']['input'];
};


export type QueryOrgAnalyticsArgs = {
  dateRange: DateRangeInput;
};


export type QueryOrgAtRiskLearnersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryOrgInvitationsArgs = {
  status?: InputMaybe<InvitationStatus>;
};


export type QueryOrgMembersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryOrganizationDomainsArgs = {
  orgId: Scalars['ID']['input'];
};


export type QueryPeerMatchesArgs = {
  courseId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPeerReviewRubricArgs = {
  contentItemId: Scalars['ID']['input'];
};


export type QueryPersonArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPersonByNameArgs = {
  name: Scalars['String']['input'];
};


export type QueryPollResultsArgs = {
  pollId: Scalars['ID']['input'];
};


export type QueryPrerequisiteChainArgs = {
  conceptName: Scalars['String']['input'];
};


export type QueryProctoringReportArgs = {
  assessmentId: Scalars['ID']['input'];
};


export type QueryProctoringSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type QueryProgramArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProgramProgressArgs = {
  programId: Scalars['ID']['input'];
};


export type QueryPublicBrandingArgs = {
  slug: Scalars['String']['input'];
};


export type QueryPublicProfileArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryPurchasesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRelatedConceptsArgs = {
  conceptId: Scalars['ID']['input'];
  depth?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRelatedConceptsByNameArgs = {
  conceptName: Scalars['String']['input'];
  depth?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryRoleArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRunningExecutionsArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryScenarioNodeArgs = {
  contentItemId: Scalars['ID']['input'];
};


export type QueryScimSyncLogArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySearchCoursesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QuerySearchSemanticArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QuerySearchUsersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QuerySearchVisualAssetsArgs = {
  courseId: Scalars['ID']['input'];
  query: Scalars['String']['input'];
};


export type QuerySemanticSearchArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  minSimilarity?: InputMaybe<Scalars['Float']['input']>;
  query: Array<Scalars['Float']['input']>;
};


export type QuerySemanticSearchByContentItemArgs = {
  contentItemId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Array<Scalars['Float']['input']>;
};


export type QuerySessionAttendeesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  sessionId: Scalars['ID']['input'];
};


export type QuerySessionPollsArgs = {
  sessionId: Scalars['ID']['input'];
};


export type QuerySkillArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySkillGapAnalysisArgs = {
  pathId: Scalars['ID']['input'];
};


export type QuerySkillPathsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySkillTreeArgs = {
  courseId: Scalars['ID']['input'];
};


export type QuerySkillsArgs = {
  category?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySocialFeedArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySocialRecommendationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySourceArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySubmissionPlagiarismReportArgs = {
  submissionId: Scalars['ID']['input'];
};


export type QueryTenantArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTenantAnalyticsArgs = {
  period: AnalyticsPeriod;
};


export type QueryTenantLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTenantUsageArgs = {
  tenantId: Scalars['ID']['input'];
};


export type QueryTenantsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryTermArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTermByNameArgs = {
  name: Scalars['String']['input'];
};


export type QueryTopicClusterArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTopicClustersByCourseArgs = {
  courseId: Scalars['ID']['input'];
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserDelegationsArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryUsersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryVerifyBadgeArgs = {
  assertionId: Scalars['ID']['input'];
};


export type QueryVerifyCertificateArgs = {
  code: Scalars['String']['input'];
};


export type QueryVerifyErasureArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryVerifyOpenBadgeArgs = {
  assertionId: Scalars['ID']['input'];
};


export type QueryWebhookDeliveriesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  webhookId: Scalars['ID']['input'];
};


export type QueryXapiStatementCountArgs = {
  since?: InputMaybe<Scalars['String']['input']>;
};


export type QueryXapiStatementsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  since?: InputMaybe<Scalars['String']['input']>;
};

export type QuizItemResult = {
  __typename?: 'QuizItemResult';
  correct: Scalars['Boolean']['output'];
  explanation?: Maybe<Scalars['String']['output']>;
  itemIndex: Scalars['Int']['output'];
  partialScore?: Maybe<Scalars['Float']['output']>;
};

export type QuizResult = {
  __typename?: 'QuizResult';
  id: Scalars['ID']['output'];
  itemResults: Array<QuizItemResult>;
  passed: Scalars['Boolean']['output'];
  score: Scalars['Float']['output'];
  submittedAt: Scalars['DateTime']['output'];
};

export enum RaterRole {
  DirectReport = 'DIRECT_REPORT',
  Manager = 'MANAGER',
  Peer = 'PEER',
  Self = 'SELF'
}

export type RecommendedCourse = {
  __typename?: 'RecommendedCourse';
  courseId: Scalars['ID']['output'];
  instructorName?: Maybe<Scalars['String']['output']>;
  reason: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type RegeneratedApiKey = {
  __typename?: 'RegeneratedApiKey';
  newApiKey: Scalars['String']['output'];
};

/** Input for registering a new LTI 1.3 platform */
export type RegisterLtiPlatformInput = {
  authLoginUrl: Scalars['String']['input'];
  authTokenUrl: Scalars['String']['input'];
  clientId: Scalars['String']['input'];
  deploymentId: Scalars['String']['input'];
  keySetUrl: Scalars['String']['input'];
  platformName: Scalars['String']['input'];
  platformUrl: Scalars['String']['input'];
};

export type ReindexResult = {
  __typename?: 'ReindexResult';
  embeddingsGenerated: Scalars['Int']['output'];
  errors: Array<Scalars['String']['output']>;
  sourcesProcessed: Scalars['Int']['output'];
};

export type RelatedConcept = {
  __typename?: 'RelatedConcept';
  concept: Concept;
  strength: Scalars['Float']['output'];
};

export type RevenueByMonth = {
  __typename?: 'RevenueByMonth';
  amount: Scalars['Int']['output'];
  month: Scalars['String']['output'];
};

export type RiskFactor = {
  __typename?: 'RiskFactor';
  description: Scalars['String']['output'];
  key: Scalars['String']['output'];
};

export enum RiskLevel {
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM'
}

export type Role = {
  __typename?: 'Role';
  createdAt: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isSystem: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  permissions: Array<Scalars['String']['output']>;
  tenantId: Scalars['ID']['output'];
  updatedAt: Scalars['String']['output'];
  userCount: Scalars['Int']['output'];
};

export type RoleDelegation = {
  __typename?: 'RoleDelegation';
  createdAt: Scalars['String']['output'];
  delegatedBy: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  roleId: Scalars['ID']['output'];
  userId: Scalars['ID']['output'];
  validUntil?: Maybe<Scalars['String']['output']>;
};

export enum RunStatus {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Running = 'RUNNING'
}

/** An SM-2 spaced-repetition review card tracking when a concept is next due. */
export type SrsCard = {
  __typename?: 'SRSCard';
  conceptName: Scalars['String']['output'];
  dueDate: Scalars['DateTime']['output'];
  easeFactor: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  intervalDays: Scalars['Int']['output'];
  lastReviewedAt?: Maybe<Scalars['DateTime']['output']>;
  repetitions: Scalars['Int']['output'];
};

export type SaveLessonPipelineInput = {
  config?: InputMaybe<Scalars['JSON']['input']>;
  nodes: Scalars['JSON']['input'];
  templateName?: InputMaybe<Scalars['String']['input']>;
};

export type SavedSearch = {
  __typename?: 'SavedSearch';
  createdAt: Scalars['String']['output'];
  filters?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  query: Scalars['String']['output'];
  tenantId: Scalars['ID']['output'];
  userId: Scalars['ID']['output'];
};

export enum ScanStatus {
  Clean = 'CLEAN',
  Error = 'ERROR',
  Infected = 'INFECTED',
  Pending = 'PENDING',
  Scanning = 'SCANNING'
}

/** A single choice option within a scenario node. */
export type ScenarioChoice = {
  __typename?: 'ScenarioChoice';
  id: Scalars['ID']['output'];
  /**
   * ID of the next ContentItem to navigate to when this choice is selected.
   * null means this choice leads to the end of the branch.
   */
  nextContentItemId?: Maybe<Scalars['ID']['output']>;
  text: Scalars['String']['output'];
};

export type ScenarioEvaluation = {
  __typename?: 'ScenarioEvaluation';
  areasForImprovement: Array<Scalars['String']['output']>;
  criteriaScores: Array<EvaluationCriterionScore>;
  overallScore: Scalars['Float']['output'];
  strengths: Array<Scalars['String']['output']>;
  summary: Scalars['String']['output'];
};

/** A scenario node parsed from a SCENARIO-type ContentItem. */
export type ScenarioNode = {
  __typename?: 'ScenarioNode';
  choices: Array<ScenarioChoice>;
  description: Scalars['String']['output'];
  /**
   * Only present on terminal nodes (isEndNode = true).
   * One of: SUCCESS | FAILURE | NEUTRAL
   */
  endingType?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isEndNode: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
};

/** A single step in a learner's path through a branching scenario. */
export type ScenarioProgressEntry = {
  __typename?: 'ScenarioProgressEntry';
  choiceId: Scalars['String']['output'];
  choiceText: Scalars['String']['output'];
  chosenAt: Scalars['String']['output'];
  fromContentItemId: Scalars['ID']['output'];
};

export type ScenarioSession = {
  __typename?: 'ScenarioSession';
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  evaluation?: Maybe<ScenarioEvaluation>;
  id: Scalars['ID']['output'];
  scenarioId: Scalars['ID']['output'];
  startedAt: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  turnCount: Scalars['Int']['output'];
};

export type ScenarioTemplate = {
  __typename?: 'ScenarioTemplate';
  difficultyLevel: Scalars['String']['output'];
  domain: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isBuiltin: Scalars['Boolean']['output'];
  maxTurns: Scalars['Int']['output'];
  sceneDescription: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type ScimSyncEntry = {
  __typename?: 'ScimSyncEntry';
  createdAt: Scalars['DateTime']['output'];
  errorMessage?: Maybe<Scalars['String']['output']>;
  externalId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  operation: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type ScimToken = {
  __typename?: 'ScimToken';
  createdAt: Scalars['DateTime']['output'];
  description: Scalars['String']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
};

export type ScormExportResult = {
  __typename?: 'ScormExportResult';
  downloadUrl: Scalars['String']['output'];
  expiresAt: Scalars['String']['output'];
  fileSizeBytes: Scalars['Int']['output'];
};

export type ScormImportResult = {
  __typename?: 'ScormImportResult';
  courseId: Scalars['ID']['output'];
  itemCount: Scalars['Int']['output'];
  version?: Maybe<ScormVersion>;
};

export type ScormSession = {
  __typename?: 'ScormSession';
  completedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lessonStatus: Scalars['String']['output'];
  scoreRaw?: Maybe<Scalars['Float']['output']>;
  suspendData?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export enum ScormVersion {
  Cmi5 = 'CMI5',
  Scorm_12 = 'SCORM_12',
  Scorm_2004 = 'SCORM_2004'
}

export type SecuritySettings = {
  __typename?: 'SecuritySettings';
  ipAllowlist: Array<Scalars['String']['output']>;
  loginAttemptLockoutThreshold: Scalars['Int']['output'];
  maxConcurrentSessions: Scalars['Int']['output'];
  mfaRequired: Scalars['Boolean']['output'];
  mfaRequiredForAdmins: Scalars['Boolean']['output'];
  passwordExpiryDays?: Maybe<Scalars['Int']['output']>;
  passwordMinLength: Scalars['Int']['output'];
  passwordRequireSpecialChars: Scalars['Boolean']['output'];
  sessionTimeoutMinutes: Scalars['Int']['output'];
};

export type SemanticResult = {
  __typename?: 'SemanticResult';
  entityId: Scalars['ID']['output'];
  entityType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  similarity: Scalars['Float']['output'];
  /** Timestamp in seconds for transcript_segment results; null for concepts. */
  startTime?: Maybe<Scalars['Float']['output']>;
  text: Scalars['String']['output'];
};

export type SessionAttendee = {
  __typename?: 'SessionAttendee';
  joinedAt: Scalars['DateTime']['output'];
  role: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type SessionAttendeeConnection = {
  __typename?: 'SessionAttendeeConnection';
  edges: Array<SessionAttendeeEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type SessionAttendeeEdge = {
  __typename?: 'SessionAttendeeEdge';
  cursor: Scalars['String']['output'];
  node: SessionAttendee;
};

export type SessionPoll = {
  __typename?: 'SessionPoll';
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  options: Array<Scalars['String']['output']>;
  question: Scalars['String']['output'];
  sessionId: Scalars['ID']['output'];
};

export type SetBlockAnchorTimestampInput = {
  blockId: Scalars['ID']['input'];
  endTime?: InputMaybe<Scalars['Float']['input']>;
  startTime: Scalars['Float']['input'];
};

export type SimilarSubmission = {
  __typename?: 'SimilarSubmission';
  similarity: Scalars['Float']['output'];
  submissionId: Scalars['ID']['output'];
  submittedAt: Scalars['DateTime']['output'];
  userId: Scalars['ID']['output'];
};

export type SimilarityResult = {
  __typename?: 'SimilarityResult';
  distance: Scalars['Float']['output'];
  embedding: Embedding;
  similarity: Scalars['Float']['output'];
};

export type Skill = {
  __typename?: 'Skill';
  category: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  level: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  parentSkillId?: Maybe<Scalars['ID']['output']>;
  prerequisites: Array<Skill>;
  slug: Scalars['String']['output'];
};

export type SkillGapAnalysis = {
  __typename?: 'SkillGapAnalysis';
  completionPct: Scalars['Float']['output'];
  gapSkills: Array<Skill>;
  masteredSkills: Scalars['Int']['output'];
  targetPathId: Scalars['ID']['output'];
  totalSkills: Scalars['Int']['output'];
};

export type SkillPath = {
  __typename?: 'SkillPath';
  description?: Maybe<Scalars['String']['output']>;
  estimatedHours?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  isPublished: Scalars['Boolean']['output'];
  skillIds: Array<Scalars['ID']['output']>;
  targetRole?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

/** A brief view of a skill profile (role/goal definition). */
export type SkillProfile = {
  __typename?: 'SkillProfile';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  requiredConceptsCount: Scalars['Int']['output'];
  roleName: Scalars['String']['output'];
};

/** Complete skill tree for a course — nodes + edges. */
export type SkillTree = {
  __typename?: 'SkillTree';
  edges: Array<SkillTreeEdge>;
  nodes: Array<SkillTreeNode>;
};

/** An edge in the skill tree connecting two nodes. */
export type SkillTreeEdge = {
  __typename?: 'SkillTreeEdge';
  source: Scalars['ID']['output'];
  target: Scalars['ID']['output'];
};

/**
 * A single node in the visual skill tree.
 * Derived from Concept vertices in the Apache AGE graph, enriched with mastery data.
 */
export type SkillTreeNode = {
  __typename?: 'SkillTreeNode';
  connections: Array<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  masteryLevel: MasteryLevel;
  type: Scalars['String']['output'];
};

export type SocialFeedItem = {
  __typename?: 'SocialFeedItem';
  actorId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  objectId: Scalars['ID']['output'];
  objectTitle: Scalars['String']['output'];
  objectType: Scalars['String']['output'];
  verb: Scalars['String']['output'];
};

export type SocialRecommendation = {
  __typename?: 'SocialRecommendation';
  contentItemId: Scalars['ID']['output'];
  contentTitle: Scalars['String']['output'];
  followersCount: Scalars['Int']['output'];
  isMutualFollower: Scalars['Boolean']['output'];
};

export type Source = {
  __typename?: 'Source';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  tenantId: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  type: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  url?: Maybe<Scalars['String']['output']>;
};

export enum SourceStatus {
  Failed = 'FAILED',
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Ready = 'READY'
}

export enum SourceType {
  FileDocx = 'FILE_DOCX',
  FilePdf = 'FILE_PDF',
  FileTxt = 'FILE_TXT',
  Text = 'TEXT',
  Url = 'URL',
  Youtube = 'YOUTUBE'
}

export type SsoProvider = {
  __typename?: 'SsoProvider';
  iconUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type StartAgentExecutionInput = {
  agentId: Scalars['ID']['input'];
  input: Scalars['JSON']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  userId: Scalars['ID']['input'];
};

export type StartLiveSessionResult = {
  __typename?: 'StartLiveSessionResult';
  sessionId: Scalars['ID']['output'];
  startedAt: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  anchorCreated: VisualAnchor;
  anchorDeleted: Scalars['ID']['output'];
  /** Subscribe to new annotations on a specific asset in real-time */
  annotationAdded: Annotation;
  examSessionStatusChanged: ExamSession;
  examTimeUpdate: ExamTimeEvent;
  executionStatusChanged: AgentExecution;
  lessonPipelineProgress: LessonPipelineRun;
  /** Subscribe to new messages in a discussion */
  messageAdded: DiscussionMessage;
  messageStream: AgentMessage;
  notificationReceived: Notification;
  pollUpdated: PollResults;
  /** User created event */
  userCreated: User;
  /** Real-time user status updates */
  userStatusChanged: UserStatus;
  /** User updated event */
  userUpdated: User;
};


export type SubscriptionAnchorCreatedArgs = {
  mediaAssetId: Scalars['ID']['input'];
};


export type SubscriptionAnchorDeletedArgs = {
  mediaAssetId: Scalars['ID']['input'];
};


export type SubscriptionAnnotationAddedArgs = {
  assetId: Scalars['ID']['input'];
};


export type SubscriptionExamSessionStatusChangedArgs = {
  sessionId: Scalars['ID']['input'];
};


export type SubscriptionExamTimeUpdateArgs = {
  sessionId: Scalars['ID']['input'];
};


export type SubscriptionExecutionStatusChangedArgs = {
  executionId: Scalars['ID']['input'];
};


export type SubscriptionLessonPipelineProgressArgs = {
  runId: Scalars['ID']['input'];
};


export type SubscriptionMessageAddedArgs = {
  discussionId: Scalars['ID']['input'];
};


export type SubscriptionMessageStreamArgs = {
  sessionId: Scalars['ID']['input'];
};


export type SubscriptionNotificationReceivedArgs = {
  userId: Scalars['ID']['input'];
};


export type SubscriptionPollUpdatedArgs = {
  pollId: Scalars['ID']['input'];
};


export type SubscriptionUserCreatedArgs = {
  tenantId: Scalars['ID']['input'];
};


export type SubscriptionUserStatusChangedArgs = {
  userId: Scalars['ID']['input'];
};


export type SubscriptionUserUpdatedArgs = {
  tenantId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type SubscriptionPlan = {
  __typename?: 'SubscriptionPlan';
  billingPeriodMonths: Scalars['Int']['output'];
  features: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  maxYau?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  priceUsdCents: Scalars['Int']['output'];
};

export enum SubscriptionStatus {
  Active = 'ACTIVE',
  Canceled = 'CANCELED',
  PastDue = 'PAST_DUE',
  Pilot = 'PILOT',
  Trialing = 'TRIALING'
}

/** An available subtitle track for a media asset. */
export type SubtitleTrack = {
  __typename?: 'SubtitleTrack';
  /** Human-readable label for display in the player UI. */
  label: Scalars['String']['output'];
  /** BCP-47 language code, e.g. "he", "fr", "de". */
  language: Scalars['String']['output'];
  /** Presigned URL of the WebVTT subtitle file (valid for 15 minutes). */
  src: Scalars['String']['output'];
};

export type SyncResult = {
  __typename?: 'SyncResult';
  broken: Scalars['Int']['output'];
  synced: Scalars['Int']['output'];
};

export type TeamMemberProgress = {
  __typename?: 'TeamMemberProgress';
  avgCompletionPct: Scalars['Float']['output'];
  coursesEnrolled: Scalars['Int']['output'];
  displayName: Scalars['String']['output'];
  isAtRisk: Scalars['Boolean']['output'];
  lastActiveAt?: Maybe<Scalars['DateTime']['output']>;
  level: Scalars['Int']['output'];
  totalXp: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
};

export type TeamOverview = {
  __typename?: 'TeamOverview';
  atRiskCount: Scalars['Int']['output'];
  avgCompletionPct: Scalars['Float']['output'];
  avgXpThisWeek: Scalars['Float']['output'];
  memberCount: Scalars['Int']['output'];
  topCourseTitle?: Maybe<Scalars['String']['output']>;
};

export enum TemplateType {
  ChavrutaDebate = 'CHAVRUTA_DEBATE',
  CitationVerifier = 'CITATION_VERIFIER',
  ContentCleaning = 'CONTENT_CLEANING',
  Custom = 'CUSTOM',
  DebateFacilitator = 'DEBATE_FACILITATOR',
  DiagramGenerator = 'DIAGRAM_GENERATOR',
  Explain = 'EXPLAIN',
  ExplanationGenerator = 'EXPLANATION_GENERATOR',
  HebrewNer = 'HEBREW_NER',
  LessonIngestion = 'LESSON_INGESTION',
  LessonPipelineOrchestrator = 'LESSON_PIPELINE_ORCHESTRATOR',
  LessonSummarization = 'LESSON_SUMMARIZATION',
  QaGate = 'QA_GATE',
  QuizAssess = 'QUIZ_ASSESS',
  QuizGenerator = 'QUIZ_GENERATOR',
  ResearchScout = 'RESEARCH_SCOUT',
  RoleplaySimulator = 'ROLEPLAY_SIMULATOR',
  StructuredNotes = 'STRUCTURED_NOTES',
  Summarize = 'SUMMARIZE',
  Tutor = 'TUTOR'
}

export type Tenant = {
  __typename?: 'Tenant';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  plan: TenantPlan;
  slug: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type TenantAnalytics = {
  __typename?: 'TenantAnalytics';
  activeLearnersTrend: Array<TrendPoint>;
  avgLearningVelocity: Scalars['Float']['output'];
  completionRateTrend: Array<TrendPoint>;
  topCourses: Array<CourseCompletionMetric>;
  totalEnrollments: Scalars['Int']['output'];
};

export type TenantBranding = {
  __typename?: 'TenantBranding';
  accentColor: Scalars['String']['output'];
  backgroundColor: Scalars['String']['output'];
  customCss?: Maybe<Scalars['String']['output']>;
  faviconUrl: Scalars['String']['output'];
  fontFamily: Scalars['String']['output'];
  hideEduSphereBranding: Scalars['Boolean']['output'];
  logoMarkUrl?: Maybe<Scalars['String']['output']>;
  logoUrl: Scalars['String']['output'];
  organizationName: Scalars['String']['output'];
  primaryColor: Scalars['String']['output'];
  privacyPolicyUrl?: Maybe<Scalars['String']['output']>;
  secondaryColor: Scalars['String']['output'];
  supportEmail?: Maybe<Scalars['String']['output']>;
  tagline?: Maybe<Scalars['String']['output']>;
  termsOfServiceUrl?: Maybe<Scalars['String']['output']>;
  welcomeMessage?: Maybe<Scalars['String']['output']>;
};

export type TenantLanguageSettings = {
  __typename?: 'TenantLanguageSettings';
  defaultLanguage: Scalars['String']['output'];
  supportedLanguages: Array<Scalars['String']['output']>;
};

export enum TenantPlan {
  Enterprise = 'ENTERPRISE',
  Free = 'FREE',
  Professional = 'PROFESSIONAL',
  Starter = 'STARTER'
}

export type TenantSocialLinks = {
  __typename?: 'TenantSocialLinks';
  facebookUrl?: Maybe<Scalars['String']['output']>;
  githubUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  instagramUrl?: Maybe<Scalars['String']['output']>;
  linkedinUrl?: Maybe<Scalars['String']['output']>;
  twitterUrl?: Maybe<Scalars['String']['output']>;
  whatsappUrl?: Maybe<Scalars['String']['output']>;
  youtubeUrl?: Maybe<Scalars['String']['output']>;
};

export type TenantSubscription = {
  __typename?: 'TenantSubscription';
  currentPeriodEnd: Scalars['String']['output'];
  currentPeriodStart: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  maxYau?: Maybe<Scalars['Int']['output']>;
  pilotEndsAt?: Maybe<Scalars['String']['output']>;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  tenantId: Scalars['ID']['output'];
  yauCount: Scalars['Int']['output'];
};

export type TenantUsage = {
  __typename?: 'TenantUsage';
  activeUsers: Scalars['Int']['output'];
  agentSessions: Scalars['Int']['output'];
  apiCalls: Scalars['Int']['output'];
  coursesCreated: Scalars['Int']['output'];
  storageUsedMb: Scalars['Float']['output'];
};

export type Term = {
  __typename?: 'Term';
  createdAt: Scalars['String']['output'];
  definition: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  tenantId: Scalars['ID']['output'];
  updatedAt: Scalars['String']['output'];
};

/** Character range within a text document — used for INLINE_COMMENT and SUGGESTION types */
export type TextRange = {
  __typename?: 'TextRange';
  end: Scalars['Int']['output'];
  rangeType?: Maybe<Scalars['String']['output']>;
  start: Scalars['Int']['output'];
};

/** Input for text range — required for INLINE_COMMENT and SUGGESTION annotation types */
export type TextRangeInput = {
  end: Scalars['Int']['input'];
  rangeType?: InputMaybe<Scalars['String']['input']>;
  start: Scalars['Int']['input'];
};

export type TextSubmission = {
  __typename?: 'TextSubmission';
  contentItemId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  plagiarismReport?: Maybe<PlagiarismReport>;
  submittedAt: Scalars['DateTime']['output'];
  wordCount: Scalars['Int']['output'];
};

export type TopicCluster = {
  __typename?: 'TopicCluster';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  tenantId: Scalars['ID']['output'];
  updatedAt: Scalars['String']['output'];
};

export enum TranslationStatus {
  Completed = 'COMPLETED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Processing = 'PROCESSING'
}

export type TrendPoint = {
  __typename?: 'TrendPoint';
  date: Scalars['String']['output'];
  value: Scalars['Float']['output'];
};

export type TrialStatus = {
  __typename?: 'TrialStatus';
  daysRemaining: Scalars['Int']['output'];
  gracePeriodEndsAt?: Maybe<Scalars['DateTime']['output']>;
  isInGracePeriod: Scalars['Boolean']['output'];
  isTrialing: Scalars['Boolean']['output'];
  trialEndsAt?: Maybe<Scalars['DateTime']['output']>;
};

export type TypeAnalytics = {
  __typename?: 'TypeAnalytics';
  delivered: Scalars['Int']['output'];
  failed: Scalars['Int']['output'];
  notificationType: Scalars['String']['output'];
  sent: Scalars['Int']['output'];
};

export type UpdateAgentTemplateInput = {
  name?: InputMaybe<Scalars['String']['input']>;
  parameters?: InputMaybe<Scalars['JSON']['input']>;
  systemPrompt?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateAnnotationInput = {
  content?: InputMaybe<Scalars['JSON']['input']>;
  isResolved?: InputMaybe<Scalars['Boolean']['input']>;
  spatialData?: InputMaybe<Scalars['JSON']['input']>;
};

export type UpdateAnnouncementInput = {
  body?: InputMaybe<Scalars['String']['input']>;
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  priority?: InputMaybe<Scalars['String']['input']>;
  publishAt?: InputMaybe<Scalars['String']['input']>;
  targetAudience?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateBadgeInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  conditionType?: InputMaybe<Scalars['String']['input']>;
  conditionValue?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  iconEmoji?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  pointsReward?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateCitationInput = {
  bookName?: InputMaybe<Scalars['String']['input']>;
  column?: InputMaybe<Scalars['String']['input']>;
  matchStatus?: InputMaybe<CitationMatchStatus>;
  page?: InputMaybe<Scalars['String']['input']>;
  paragraph?: InputMaybe<Scalars['String']['input']>;
  part?: InputMaybe<Scalars['String']['input']>;
  sourceText?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateConceptInput = {
  definition?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  sourceIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UpdateConsentInput = {
  consentType: ConsentType;
  given: Scalars['Boolean']['input'];
};

export type UpdateCourseInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  estimatedHours?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  thumbnailUrl?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateExamBlueprintInput = {
  bloomDistribution?: InputMaybe<Scalars['JSON']['input']>;
  catMaxItems?: InputMaybe<Scalars['Int']['input']>;
  catMinItems?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  domainDistribution?: InputMaybe<Scalars['JSON']['input']>;
  isAdaptive?: InputMaybe<Scalars['Boolean']['input']>;
  maxRetakes?: InputMaybe<Scalars['Int']['input']>;
  passingMethod?: InputMaybe<PassingMethod>;
  passingScore?: InputMaybe<Scalars['Float']['input']>;
  retakeCooldownHours?: InputMaybe<Scalars['Int']['input']>;
  shuffleAnswers?: InputMaybe<Scalars['Boolean']['input']>;
  shuffleQuestions?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<BlueprintStatus>;
  timeLimitMinutes?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  totalQuestions?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateExamItemInput = {
  bloomLevel?: InputMaybe<BloomLevel>;
  domainTag?: InputMaybe<Scalars['String']['input']>;
  questionData?: InputMaybe<Scalars['JSON']['input']>;
};

export type UpdateGamificationConfigInput = {
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  leaderboardScope?: InputMaybe<LeaderboardScope>;
  showBadges?: InputMaybe<Scalars['Boolean']['input']>;
  showLeaderboard?: InputMaybe<Scalars['Boolean']['input']>;
  showPoints?: InputMaybe<Scalars['Boolean']['input']>;
  showStreaks?: InputMaybe<Scalars['Boolean']['input']>;
  xpRules?: InputMaybe<Scalars['JSON']['input']>;
};

export type UpdateLessonInput = {
  lessonDate?: InputMaybe<Scalars['String']['input']>;
  series?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<LessonStatus>;
  title?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<LessonType>;
};

export type UpdateModuleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  orderIndex?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateNotificationPreferenceInput = {
  channel: NotificationChannel;
  enabled: Scalars['Boolean']['input'];
  notificationType: NotificationType;
};

export type UpdateNotificationTemplateInput = {
  bodyHtml?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  subject?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateOnboardingStepInput = {
  data?: InputMaybe<Scalars['JSON']['input']>;
  step: Scalars['Int']['input'];
};

export type UpdateOrgBadgeInput = {
  autoAwardCriteria?: InputMaybe<Scalars['JSON']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  iconUrl?: InputMaybe<Scalars['String']['input']>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  xpRequired?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdatePipelineTemplateInput = {
  config?: InputMaybe<Scalars['JSON']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  nodes?: InputMaybe<Scalars['JSON']['input']>;
};

export type UpdateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateSecuritySettingsInput = {
  ipAllowlist?: InputMaybe<Array<Scalars['String']['input']>>;
  loginAttemptLockoutThreshold?: InputMaybe<Scalars['Int']['input']>;
  maxConcurrentSessions?: InputMaybe<Scalars['Int']['input']>;
  mfaRequired?: InputMaybe<Scalars['Boolean']['input']>;
  mfaRequiredForAdmins?: InputMaybe<Scalars['Boolean']['input']>;
  passwordExpiryDays?: InputMaybe<Scalars['Int']['input']>;
  passwordMinLength?: InputMaybe<Scalars['Int']['input']>;
  passwordRequireSpecialChars?: InputMaybe<Scalars['Boolean']['input']>;
  sessionTimeoutMinutes?: InputMaybe<Scalars['Int']['input']>;
};

export type UpdateTenantBrandingInput = {
  accentColor?: InputMaybe<Scalars['String']['input']>;
  backgroundColor?: InputMaybe<Scalars['String']['input']>;
  customCss?: InputMaybe<Scalars['String']['input']>;
  faviconUrl?: InputMaybe<Scalars['String']['input']>;
  fontFamily?: InputMaybe<Scalars['String']['input']>;
  hideEduSphereBranding?: InputMaybe<Scalars['Boolean']['input']>;
  logoMarkUrl?: InputMaybe<Scalars['String']['input']>;
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  organizationName?: InputMaybe<Scalars['String']['input']>;
  primaryColor?: InputMaybe<Scalars['String']['input']>;
  privacyPolicyUrl?: InputMaybe<Scalars['String']['input']>;
  secondaryColor?: InputMaybe<Scalars['String']['input']>;
  supportEmail?: InputMaybe<Scalars['String']['input']>;
  tagline?: InputMaybe<Scalars['String']['input']>;
  termsOfServiceUrl?: InputMaybe<Scalars['String']['input']>;
  welcomeMessage?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateTenantLanguageSettingsInput = {
  defaultLanguage: Scalars['String']['input'];
  supportedLanguages: Array<Scalars['String']['input']>;
};

export type UpdateTenantPlanInput = {
  effectiveDate?: InputMaybe<Scalars['DateTime']['input']>;
  plan: TenantPlan;
  tenantId: Scalars['ID']['input'];
};

export type UpdateTenantSocialLinksInput = {
  facebookUrl?: InputMaybe<Scalars['String']['input']>;
  githubUrl?: InputMaybe<Scalars['String']['input']>;
  instagramUrl?: InputMaybe<Scalars['String']['input']>;
  linkedinUrl?: InputMaybe<Scalars['String']['input']>;
  twitterUrl?: InputMaybe<Scalars['String']['input']>;
  whatsappUrl?: InputMaybe<Scalars['String']['input']>;
  youtubeUrl?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateUserInput = {
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<UserRole>;
};

export type UpdateUserPreferencesInput = {
  emailNotifications?: InputMaybe<Scalars['Boolean']['input']>;
  locale?: InputMaybe<Scalars['String']['input']>;
  pushNotifications?: InputMaybe<Scalars['Boolean']['input']>;
  theme?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateVisualAnchorInput = {
  anchorText?: InputMaybe<Scalars['String']['input']>;
  documentOrder?: InputMaybe<Scalars['Int']['input']>;
  pageEnd?: InputMaybe<Scalars['Int']['input']>;
  pageNumber?: InputMaybe<Scalars['Int']['input']>;
  posH?: InputMaybe<Scalars['Float']['input']>;
  posW?: InputMaybe<Scalars['Float']['input']>;
  posX?: InputMaybe<Scalars['Float']['input']>;
  posXEnd?: InputMaybe<Scalars['Float']['input']>;
  posY?: InputMaybe<Scalars['Float']['input']>;
  posYEnd?: InputMaybe<Scalars['Float']['input']>;
};

export type UpdateWebhookInput = {
  events?: InputMaybe<Array<Scalars['String']['input']>>;
  isActive?: InputMaybe<Scalars['Boolean']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export type UsageSnapshot = {
  __typename?: 'UsageSnapshot';
  activeUsersCount: Scalars['Int']['output'];
  computedAt: Scalars['String']['output'];
  coursesCount: Scalars['Int']['output'];
  storageGb: Scalars['Float']['output'];
  tenantId: Scalars['ID']['output'];
  yauCount: Scalars['Int']['output'];
};

/** External entity stubs */
export type User = {
  __typename?: 'User';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  followersCount: Scalars['Int']['output'];
  followingCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  isFollowedByMe: Scalars['Boolean']['output'];
  lastName: Scalars['String']['output'];
  preferences: UserPreferences;
  role: UserRole;
  tenantId: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type UserBadge = {
  __typename?: 'UserBadge';
  badge: Badge;
  earnedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
};

export type UserChallenge = {
  __typename?: 'UserChallenge';
  challengeId: Scalars['ID']['output'];
  completed: Scalars['Boolean']['output'];
  currentValue: Scalars['Int']['output'];
  description: Scalars['String']['output'];
  endDate: Scalars['DateTime']['output'];
  targetValue: Scalars['Int']['output'];
  title: Scalars['String']['output'];
  xpReward: Scalars['Int']['output'];
};

export type UserConnection = {
  __typename?: 'UserConnection';
  edges: Array<UserEdge>;
  nodes: Array<User>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type UserCourse = {
  __typename?: 'UserCourse';
  completedAt?: Maybe<Scalars['String']['output']>;
  courseId: Scalars['ID']['output'];
  enrolledAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type UserEdge = {
  __typename?: 'UserEdge';
  cursor: Scalars['String']['output'];
  node: User;
};

export type UserMasteryTopic = {
  __typename?: 'UserMasteryTopic';
  level: MasteryLevel;
  topicName: Scalars['String']['output'];
};

export type UserPreferences = {
  __typename?: 'UserPreferences';
  emailNotifications: Scalars['Boolean']['output'];
  isPublicProfile: Scalars['Boolean']['output'];
  locale: Scalars['String']['output'];
  pushNotifications: Scalars['Boolean']['output'];
  theme: Scalars['String']['output'];
};

/** Custom application-level directives (non-federation). */
export enum UserRole {
  Instructor = 'INSTRUCTOR',
  OrgAdmin = 'ORG_ADMIN',
  Researcher = 'RESEARCHER',
  Student = 'STUDENT',
  SuperAdmin = 'SUPER_ADMIN'
}

export type UserStats = {
  __typename?: 'UserStats';
  annotationsCreated: Scalars['Int']['output'];
  conceptsMastered: Scalars['Int']['output'];
  coursesEnrolled: Scalars['Int']['output'];
  currentStreak: Scalars['Int']['output'];
  level: Scalars['Int']['output'];
  longestStreak: Scalars['Int']['output'];
  totalLearningMinutes: Scalars['Int']['output'];
  totalXp: Scalars['Int']['output'];
  weeklyActivity: Array<DayActivity>;
};

export type UserStatus = {
  __typename?: 'UserStatus';
  lastSeen: Scalars['DateTime']['output'];
  online: Scalars['Boolean']['output'];
  userId: Scalars['ID']['output'];
};

export type VisualAnchor = {
  __typename?: 'VisualAnchor';
  anchorText: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  documentOrder: Scalars['Int']['output'];
  endTime?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  isBroken: Scalars['Boolean']['output'];
  mediaAssetId: Scalars['ID']['output'];
  pageEnd?: Maybe<Scalars['Int']['output']>;
  pageNumber?: Maybe<Scalars['Int']['output']>;
  posH?: Maybe<Scalars['Float']['output']>;
  posW?: Maybe<Scalars['Float']['output']>;
  posX?: Maybe<Scalars['Float']['output']>;
  posXEnd?: Maybe<Scalars['Float']['output']>;
  posY?: Maybe<Scalars['Float']['output']>;
  posYEnd?: Maybe<Scalars['Float']['output']>;
  startTime?: Maybe<Scalars['Float']['output']>;
  updatedAt: Scalars['String']['output'];
  visualAsset?: Maybe<VisualAsset>;
  visualAssetId?: Maybe<Scalars['ID']['output']>;
};

export type VisualAsset = {
  __typename?: 'VisualAsset';
  courseId: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  filename: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  metadata: VisualAssetMetadata;
  mimeType: Scalars['String']['output'];
  scanStatus: ScanStatus;
  sizeBytes: Scalars['Int']['output'];
  storageUrl: Scalars['String']['output'];
  webpUrl?: Maybe<Scalars['String']['output']>;
};

export type VisualAssetMetadata = {
  __typename?: 'VisualAssetMetadata';
  altText?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['Int']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
};

export type VisualAssetSearchResult = {
  __typename?: 'VisualAssetSearchResult';
  anchorText?: Maybe<Scalars['String']['output']>;
  asset: VisualAsset;
  thumbnailUrl?: Maybe<Scalars['String']['output']>;
};

export type Webhook = {
  __typename?: 'Webhook';
  createdAt: Scalars['DateTime']['output'];
  events: Array<Scalars['String']['output']>;
  failureCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  lastTriggeredAt?: Maybe<Scalars['DateTime']['output']>;
  url: Scalars['String']['output'];
};

export type WebhookDelivery = {
  __typename?: 'WebhookDelivery';
  attempt: Scalars['Int']['output'];
  createdAt: Scalars['DateTime']['output'];
  deliveredAt?: Maybe<Scalars['DateTime']['output']>;
  eventType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  responseStatus?: Maybe<Scalars['Int']['output']>;
  status: WebhookDeliveryStatus;
};

export enum WebhookDeliveryStatus {
  Delivered = 'DELIVERED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Retrying = 'RETRYING'
}

export type WebsiteImportInput = {
  courseId: Scalars['ID']['input'];
  moduleId: Scalars['ID']['input'];
  siteUrl: Scalars['String']['input'];
};

export type WhatsAppRegistration = {
  __typename?: 'WhatsAppRegistration';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type WhatsAppVerification = {
  __typename?: 'WhatsAppVerification';
  message: Scalars['String']['output'];
  verified: Scalars['Boolean']['output'];
};

export type XapiStatementResult = {
  __typename?: 'XapiStatementResult';
  id: Scalars['ID']['output'];
  objectId: Scalars['String']['output'];
  storedAt: Scalars['String']['output'];
  verb: Scalars['String']['output'];
};

/**
 * xAPI / LRS integration — F-028 xAPI 1.0.3 Self-Hosted LRS
 * Provides token management and statement query access for ORG_ADMINs.
 */
export type XapiToken = {
  __typename?: 'XapiToken';
  createdAt: Scalars['String']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  lrsEndpoint?: Maybe<Scalars['String']['output']>;
};

export type XpLeaderboardEntry = {
  __typename?: 'XpLeaderboardEntry';
  displayName: Scalars['String']['output'];
  level: Scalars['Int']['output'];
  rank: Scalars['Int']['output'];
  totalXp: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
};

export type YoutubeImportInput = {
  courseId: Scalars['ID']['input'];
  moduleId: Scalars['ID']['input'];
  playlistUrl: Scalars['String']['input'];
};

export enum Join__Graph {
  Agent = 'AGENT',
  Annotation = 'ANNOTATION',
  Collaboration = 'COLLABORATION',
  Content = 'CONTENT',
  Core = 'CORE',
  Knowledge = 'KNOWLEDGE'
}

export enum Link__Purpose {
  /** `EXECUTION` features provide metadata necessary for operation execution. */
  Execution = 'EXECUTION',
  /** `SECURITY` features provide metadata necessary to securely resolve fields. */
  Security = 'SECURITY'
}

export type CreateAnnotationMutationVariables = Exact<{
  input: CreateAnnotationInput;
}>;


export type CreateAnnotationMutation = { __typename?: 'Mutation', createAnnotation: { __typename?: 'Annotation', id: string, assetId: string, userId: string, layer: AnnotationLayer, annotationType: AnnotationType, content: unknown, spatialData?: unknown | null, parentId?: string | null, isResolved: boolean, createdAt: string, updatedAt: string } };

export type UpdateAnnotationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateAnnotationInput;
}>;


export type UpdateAnnotationMutation = { __typename?: 'Mutation', updateAnnotation: { __typename?: 'Annotation', id: string, content: unknown, spatialData?: unknown | null, layer: AnnotationLayer, isResolved: boolean, updatedAt: string } };

export type DeleteAnnotationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteAnnotationMutation = { __typename?: 'Mutation', deleteAnnotation: boolean };

export type AnnotationsByAssetQueryVariables = Exact<{
  assetId: Scalars['ID']['input'];
  layer?: InputMaybe<AnnotationLayer>;
}>;


export type AnnotationsByAssetQuery = { __typename?: 'Query', annotationsByAsset: Array<{ __typename?: 'Annotation', id: string, assetId: string, userId: string, layer: AnnotationLayer, annotationType: AnnotationType, content: unknown, spatialData?: unknown | null, parentId?: string | null, isResolved: boolean, createdAt: string, updatedAt: string }> };

export type AnnotationAddedSubscriptionVariables = Exact<{
  assetId: Scalars['ID']['input'];
}>;


export type AnnotationAddedSubscription = { __typename?: 'Subscription', annotationAdded: { __typename?: 'Annotation', id: string, assetId: string, userId: string, layer: AnnotationLayer, annotationType: AnnotationType, content: unknown, spatialData?: unknown | null, createdAt: string, updatedAt: string } };

export type AnnotationsQueryVariables = Exact<{
  assetId: Scalars['ID']['input'];
}>;


export type AnnotationsQuery = { __typename?: 'Query', annotations: Array<{ __typename?: 'Annotation', id: string, layer: AnnotationLayer, annotationType: AnnotationType, content: unknown, spatialData?: unknown | null, parentId?: string | null, userId: string, isResolved: boolean, createdAt: string, updatedAt: string }> };

export type MyAnnotationsQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type MyAnnotationsQuery = { __typename?: 'Query', annotationsByUser: Array<{ __typename?: 'Annotation', id: string, assetId: string, userId: string, layer: AnnotationLayer, annotationType: AnnotationType, content: unknown, spatialData?: unknown | null, parentId?: string | null, isResolved: boolean, createdAt: string, updatedAt: string }> };

export type ReplyToAnnotationMutationVariables = Exact<{
  annotationId: Scalars['ID']['input'];
  content: Scalars['String']['input'];
}>;


export type ReplyToAnnotationMutation = { __typename?: 'Mutation', replyToAnnotation: { __typename?: 'Annotation', id: string, content: unknown, userId: string, parentId?: string | null, layer: AnnotationLayer, annotationType: AnnotationType, createdAt: string, updatedAt: string } };

export type PromoteAnnotationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PromoteAnnotationMutation = { __typename?: 'Mutation', promoteAnnotation: { __typename?: 'Annotation', id: string, layer: AnnotationLayer, updatedAt: string } };

export type ListAtRiskLearnersQueryVariables = Exact<{
  threshold?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListAtRiskLearnersQuery = { __typename?: 'Query', listAtRiskLearners: Array<{ __typename?: 'AtRiskLearner', userId: string, displayName: string, courseId: string, courseTitle: string, daysSinceActive: number, progressPct: number }> };

export type MyOpenBadgesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyOpenBadgesQuery = { __typename?: 'Query', myOpenBadges: Array<{ __typename?: 'OpenBadgeAssertion', id: string, badgeDefinitionId: string, badgeName: string, badgeDescription: string, imageUrl?: string | null, recipientId: string, issuedAt: string, expiresAt?: string | null, evidenceUrl?: string | null, revoked: boolean, revokedAt?: string | null, revokedReason?: string | null, verifyUrl: string, shareUrl: string, vcDocument?: string | null }> };

export type MyCertificatesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyCertificatesQuery = { __typename?: 'Query', myCertificates: Array<{ __typename?: 'Certificate', id: string, courseId: string, courseName: string, issuedAt: string, verificationCode: string, pdfUrl?: string | null }> };

export type CertificateDownloadUrlQueryVariables = Exact<{
  certId: Scalars['ID']['input'];
}>;


export type CertificateDownloadUrlQuery = { __typename?: 'Query', certificateDownloadUrl: string };

export type DiscussionsQueryVariables = Exact<{
  courseId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type DiscussionsQuery = { __typename?: 'Query', discussions: Array<{ __typename?: 'Discussion', id: string, courseId: string, title: string, description?: string | null, creatorId: string, discussionType: DiscussionType, participantCount: number, messageCount: number, createdAt: string, updatedAt: string }> };

export type MyDiscussionsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type MyDiscussionsQuery = { __typename?: 'Query', myDiscussions: Array<{ __typename?: 'Discussion', id: string, courseId: string, title: string, description?: string | null, creatorId: string, discussionType: DiscussionType, participantCount: number, messageCount: number, createdAt: string, updatedAt: string }> };

export type DiscussionQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DiscussionQuery = { __typename?: 'Query', discussion?: { __typename?: 'Discussion', id: string, courseId: string, title: string, description?: string | null, creatorId: string, discussionType: DiscussionType, participantCount: number, messageCount: number, createdAt: string, updatedAt: string, messages: Array<{ __typename?: 'DiscussionMessage', id: string, userId: string, content: string, messageType: MessageType, parentMessageId?: string | null, replyCount: number, createdAt: string }>, participants: Array<{ __typename?: 'DiscussionParticipant', id: string, userId: string, joinedAt: string }> } | null };

export type CreateDiscussionMutationVariables = Exact<{
  input: CreateDiscussionInput;
}>;


export type CreateDiscussionMutation = { __typename?: 'Mutation', createDiscussion: { __typename?: 'Discussion', id: string, courseId: string, title: string, description?: string | null, discussionType: DiscussionType, participantCount: number, messageCount: number, createdAt: string, updatedAt: string } };

export type AddMessageMutationVariables = Exact<{
  discussionId: Scalars['ID']['input'];
  input: AddMessageInput;
}>;


export type AddMessageMutation = { __typename?: 'Mutation', addMessage: { __typename?: 'DiscussionMessage', id: string, discussionId: string, userId: string, content: string, messageType: MessageType, parentMessageId?: string | null, replyCount: number, createdAt: string } };

export type JoinDiscussionMutationVariables = Exact<{
  discussionId: Scalars['ID']['input'];
}>;


export type JoinDiscussionMutation = { __typename?: 'Mutation', joinDiscussion: boolean };

export type LeaveDiscussionMutationVariables = Exact<{
  discussionId: Scalars['ID']['input'];
}>;


export type LeaveDiscussionMutation = { __typename?: 'Mutation', leaveDiscussion: boolean };

export type MessageAddedSubscriptionVariables = Exact<{
  discussionId: Scalars['ID']['input'];
}>;


export type MessageAddedSubscription = { __typename?: 'Subscription', messageAdded: { __typename?: 'DiscussionMessage', id: string, discussionId: string, userId: string, content: string, messageType: MessageType, parentMessageId?: string | null, createdAt: string } };

export type UpdateConsentMutationVariables = Exact<{
  input: UpdateConsentInput;
}>;


export type UpdateConsentMutation = { __typename?: 'Mutation', updateConsent: boolean };

export type UpdateCourseMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateCourseInput;
}>;


export type UpdateCourseMutation = { __typename?: 'Mutation', updateCourse: { __typename?: 'Course', id: string, title: string, description?: string | null, thumbnailUrl?: string | null, estimatedHours?: number | null, isPublished: boolean, updatedAt: string } };

export type CourseReadinessQueryVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type CourseReadinessQuery = { __typename?: 'Query', courseReadiness: { __typename?: 'CourseReadiness', ready: boolean, checks: Array<{ __typename?: 'CourseReadinessCheck', name: string, passed: boolean, message?: string | null }> } };

export type PublishCourseMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PublishCourseMutation = { __typename?: 'Mutation', publishCourse: { __typename?: 'Course', id: string, isPublished: boolean, updatedAt: string } };

export type UnpublishCourseMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type UnpublishCourseMutation = { __typename?: 'Mutation', unpublishCourse: { __typename?: 'Course', id: string, isPublished: boolean, updatedAt: string } };

export type DeleteCourseMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteCourseMutation = { __typename?: 'Mutation', deleteCourse: boolean };

export type CreateModuleMutationVariables = Exact<{
  input: CreateModuleInput;
}>;


export type CreateModuleMutation = { __typename?: 'Mutation', createModule: { __typename?: 'Module', id: string, courseId: string, title: string, description?: string | null, orderIndex: number, createdAt: string } };

export type UpdateModuleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateModuleInput;
}>;


export type UpdateModuleMutation = { __typename?: 'Mutation', updateModule: { __typename?: 'Module', id: string, title: string, description?: string | null, orderIndex: number } };

export type DeleteModuleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteModuleMutation = { __typename?: 'Mutation', deleteModule: boolean };

export type ReorderModulesMutationVariables = Exact<{
  courseId: Scalars['ID']['input'];
  moduleIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type ReorderModulesMutation = { __typename?: 'Mutation', reorderModules: Array<{ __typename?: 'Module', id: string, orderIndex: number }> };

export type CreateContentItemMutationVariables = Exact<{
  input: CreateContentItemInput;
}>;


export type CreateContentItemMutation = { __typename?: 'Mutation', createContentItem: { __typename?: 'ContentItem', id: string, moduleId: string, title: string, contentType: string, content?: string | null, orderIndex: number, createdAt: string } };

export type ForkCourseMutationVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type ForkCourseMutation = { __typename?: 'Mutation', forkCourse: { __typename?: 'Course', id: string, title: string, slug: string, forkedFromId?: string | null } };

export type SearchCoursesQueryVariables = Exact<{
  query: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchCoursesQuery = { __typename?: 'Query', searchCourses: Array<{ __typename?: 'Course', id: string, title: string, description?: string | null, slug: string, isPublished: boolean, estimatedHours?: number | null, thumbnailUrl?: string | null }> };

export type ContentItemQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ContentItemQuery = { __typename?: 'Query', contentItem?: { __typename?: 'ContentItem', id: string, moduleId: string, title: string, contentType: string, content?: string | null, fileId?: string | null, duration?: number | null, orderIndex: number, createdAt: string, updatedAt: string } | null };

export type CourseContentsQueryVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type CourseContentsQuery = { __typename?: 'Query', course?: { __typename?: 'Course', id: string, title: string, description?: string | null, modules: Array<{ __typename?: 'Module', id: string, title: string, orderIndex: number, contentItems: Array<{ __typename?: 'ContentItem', id: string, title: string, contentType: string, orderIndex: number }> }> } | null };

export type CourseDetailQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CourseDetailQuery = { __typename?: 'Query', course?: { __typename?: 'Course', id: string, title: string, description?: string | null, thumbnailUrl?: string | null, estimatedHours?: number | null, isPublished: boolean, instructorId: string, modules: Array<{ __typename?: 'Module', id: string, title: string, orderIndex: number, contentItems: Array<{ __typename?: 'ContentItem', id: string, title: string, contentType: string, duration?: number | null, orderIndex: number }> }> } | null };

export type SearchSemanticByTextQueryVariables = Exact<{
  query: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchSemanticByTextQuery = { __typename?: 'Query', searchSemantic: Array<{ __typename?: 'SemanticResult', id: string, text: string, similarity: number, entityType: string, entityId: string }> };

export type GetPresignedUploadUrlQueryVariables = Exact<{
  fileName: Scalars['String']['input'];
  contentType: Scalars['String']['input'];
  courseId: Scalars['ID']['input'];
}>;


export type GetPresignedUploadUrlQuery = { __typename?: 'Query', getPresignedUploadUrl: { __typename?: 'PresignedUploadUrl', uploadUrl: string, fileKey: string, expiresAt: string } };

export type ConfirmMediaUploadMutationVariables = Exact<{
  fileKey: Scalars['String']['input'];
  courseId: Scalars['ID']['input'];
  title: Scalars['String']['input'];
}>;


export type ConfirmMediaUploadMutation = { __typename?: 'Mutation', confirmMediaUpload: { __typename?: 'MediaAsset', id: string, courseId: string, fileKey: string, title: string, contentType: string, status: MediaStatus, downloadUrl?: string | null, hlsManifestUrl?: string | null } };

export type CreateCourseMutationVariables = Exact<{
  input: CreateCourseInput;
}>;


export type CreateCourseMutation = { __typename?: 'Mutation', createCourse: { __typename?: 'Course', id: string, title: string, slug: string, description?: string | null, isPublished: boolean, estimatedHours?: number | null, createdAt: string } };

export type EnrollCourseMutationVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type EnrollCourseMutation = { __typename?: 'Mutation', enrollCourse: { __typename?: 'UserCourse', id: string, courseId: string, userId: string, status: string, enrolledAt: string } };

export type UnenrollCourseMutationVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type UnenrollCourseMutation = { __typename?: 'Mutation', unenrollCourse: boolean };

export type MyEnrollmentsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyEnrollmentsQuery = { __typename?: 'Query', myEnrollments: Array<{ __typename?: 'UserCourse', id: string, courseId: string, userId: string, status: string, enrolledAt: string, completedAt?: string | null }> };

export type MyCourseProgressQueryVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type MyCourseProgressQuery = { __typename?: 'Query', myCourseProgress: { __typename?: 'CourseProgress', courseId: string, totalItems: number, completedItems: number, percentComplete: number } };

export type MarkContentViewedMutationVariables = Exact<{
  contentItemId: Scalars['ID']['input'];
}>;


export type MarkContentViewedMutation = { __typename?: 'Mutation', markContentViewed: boolean };

export type CoursesDiscoveryQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type CoursesDiscoveryQuery = { __typename?: 'Query', courses: Array<{ __typename?: 'Course', id: string, title: string, description?: string | null, thumbnailUrl?: string | null, estimatedHours?: number | null, isPublished: boolean, instructorId: string, slug: string, createdAt: string }> };

export type SearchCoursesDiscoveryQueryVariables = Exact<{
  query: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchCoursesDiscoveryQuery = { __typename?: 'Query', searchCourses: Array<{ __typename?: 'Course', id: string, title: string, description?: string | null, thumbnailUrl?: string | null, estimatedHours?: number | null, isPublished: boolean, slug: string }> };

export type MyInProgressCoursesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type MyInProgressCoursesQuery = { __typename?: 'Query', myInProgressCourses: Array<{ __typename?: 'InProgressCourse', id: string, courseId: string, title: string, progress: number, lastAccessedAt?: string | null, instructorName?: string | null }> };

export type MyRecommendedCoursesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type MyRecommendedCoursesQuery = { __typename?: 'Query', myRecommendedCourses: Array<{ __typename?: 'RecommendedCourse', courseId: string, title: string, instructorName?: string | null, reason: string }> };

export type MyActivityFeedQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type MyActivityFeedQuery = { __typename?: 'Query', myActivityFeed: Array<{ __typename?: 'ActivityFeedItem', id: string, eventType: ActivityEventType, description: string, occurredAt: string }> };

export type MyStatsWithStreakQueryVariables = Exact<{ [key: string]: never; }>;


export type MyStatsWithStreakQuery = { __typename?: 'Query', myStats: { __typename?: 'UserStats', coursesEnrolled: number, conceptsMastered: number, totalLearningMinutes: number, currentStreak: number, longestStreak: number, totalXp: number, level: number } };

export type MyTopMasteryTopicsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type MyTopMasteryTopicsQuery = { __typename?: 'Query', myTopMasteryTopics: Array<{ __typename?: 'UserMasteryTopic', topicName: string, level: MasteryLevel }> };

export type MyDiscussionsListQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type MyDiscussionsListQuery = { __typename?: 'Query', myDiscussions: Array<{ __typename?: 'Discussion', id: string, title: string, courseId: string, participantCount: number, messageCount: number, createdAt: string }> };

export type DiscussionDetailQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DiscussionDetailQuery = { __typename?: 'Query', discussion?: { __typename?: 'Discussion', id: string, title: string, courseId: string, participantCount: number, messageCount: number, createdAt: string } | null };

export type DiscussionMessagesQueryVariables = Exact<{
  discussionId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type DiscussionMessagesQuery = { __typename?: 'Query', discussionMessages: Array<{ __typename?: 'DiscussionMessage', id: string, userId: string, content: string, messageType: MessageType, parentMessageId?: string | null, likesCount: number, isLikedByMe: boolean, createdAt: string }> };

export type AddDiscussionMessageMutationVariables = Exact<{
  discussionId: Scalars['ID']['input'];
  input: AddMessageInput;
}>;


export type AddDiscussionMessageMutation = { __typename?: 'Mutation', addMessage: { __typename?: 'DiscussionMessage', id: string, content: string, createdAt: string } };

export type LikeMessageMutationVariables = Exact<{
  messageId: Scalars['ID']['input'];
}>;


export type LikeMessageMutation = { __typename?: 'Mutation', likeMessage: boolean };

export type DiscussionMessageAddedSubscriptionVariables = Exact<{
  discussionId: Scalars['ID']['input'];
}>;


export type DiscussionMessageAddedSubscription = { __typename?: 'Subscription', messageAdded: { __typename?: 'DiscussionMessage', id: string, userId: string, content: string, messageType: MessageType, parentMessageId?: string | null, likesCount: number, isLikedByMe: boolean, createdAt: string } };

export type CitationFieldsFragment = { __typename?: 'LessonCitation', id: string, sourceText: string, bookName: string, part?: string | null, page?: string | null, column?: string | null, paragraph?: string | null, matchStatus: CitationMatchStatus, confidence?: number | null, resolvedText?: string | null, knowledgeSourceId?: string | null, graphSourceId?: string | null };

export type EnrichedBlockFieldsFragment = { __typename?: 'EnrichedTranscriptBlock', id: string, lessonId: string, segmentId?: string | null, blockType: EnrichedBlockType, blockOrder: number, content: unknown, startTime?: number | null, endTime?: number | null, citation?: { __typename?: 'LessonCitation', id: string, sourceText: string, bookName: string, part?: string | null, page?: string | null, column?: string | null, paragraph?: string | null, matchStatus: CitationMatchStatus, confidence?: number | null, resolvedText?: string | null, knowledgeSourceId?: string | null, graphSourceId?: string | null } | null, anchor?: { __typename?: 'VisualAnchor', id: string, anchorText: string, startTime?: number | null, endTime?: number | null, visualAssetId?: string | null } | null };

export type EnrichedLessonQueryVariables = Exact<{
  lessonId: Scalars['ID']['input'];
}>;


export type EnrichedLessonQuery = { __typename?: 'Query', enrichedLesson?: { __typename?: 'EnrichedLesson', id: string, youtubeVideoId?: string | null, transcriptReady: boolean, enrichmentStatus: EnrichmentStatus, lesson: { __typename?: 'Lesson', id: string, title: string }, blocks: Array<{ __typename?: 'EnrichedTranscriptBlock', id: string, lessonId: string, segmentId?: string | null, blockType: EnrichedBlockType, blockOrder: number, content: unknown, startTime?: number | null, endTime?: number | null, citation?: { __typename?: 'LessonCitation', id: string, sourceText: string, bookName: string, part?: string | null, page?: string | null, column?: string | null, paragraph?: string | null, matchStatus: CitationMatchStatus, confidence?: number | null, resolvedText?: string | null, knowledgeSourceId?: string | null, graphSourceId?: string | null } | null, anchor?: { __typename?: 'VisualAnchor', id: string, anchorText: string, startTime?: number | null, endTime?: number | null, visualAssetId?: string | null } | null }>, citations: Array<{ __typename?: 'LessonCitation', id: string, sourceText: string, bookName: string, part?: string | null, page?: string | null, column?: string | null, paragraph?: string | null, matchStatus: CitationMatchStatus, confidence?: number | null, resolvedText?: string | null, knowledgeSourceId?: string | null, graphSourceId?: string | null }> } | null };

export type IngestYoutubeLessonMutationVariables = Exact<{
  input: IngestYoutubeLessonInput;
}>;


export type IngestYoutubeLessonMutation = { __typename?: 'Mutation', ingestYoutubeLesson: { __typename?: 'EnrichedLesson', id: string, youtubeVideoId?: string | null, enrichmentStatus: EnrichmentStatus } };

export type UpdateLessonCitationMutationVariables = Exact<{
  citationId: Scalars['ID']['input'];
  input: UpdateCitationInput;
}>;


export type UpdateLessonCitationMutation = { __typename?: 'Mutation', updateLessonCitation: { __typename?: 'LessonCitation', id: string, sourceText: string, bookName: string, part?: string | null, page?: string | null, column?: string | null, paragraph?: string | null, matchStatus: CitationMatchStatus, confidence?: number | null, resolvedText?: string | null, knowledgeSourceId?: string | null, graphSourceId?: string | null } };

export type SetBlockAnchorTimestampMutationVariables = Exact<{
  input: SetBlockAnchorTimestampInput;
}>;


export type SetBlockAnchorTimestampMutation = { __typename?: 'Mutation', setBlockAnchorTimestamp: { __typename?: 'EnrichedTranscriptBlock', id: string, startTime?: number | null, endTime?: number | null } };

export type PublishEnrichedLessonMutationVariables = Exact<{
  lessonId: Scalars['ID']['input'];
}>;


export type PublishEnrichedLessonMutation = { __typename?: 'Mutation', publishEnrichedLesson: { __typename?: 'EnrichedLesson', id: string, enrichmentStatus: EnrichmentStatus } };

export type ConceptQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ConceptQuery = { __typename?: 'Query', concept?: { __typename?: 'Concept', id: string, name: string, definition: string, sourceIds: Array<string>, createdAt: string } | null };

export type GetConceptsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetConceptsQuery = { __typename?: 'Query', concepts: Array<{ __typename?: 'Concept', id: string, name: string, definition: string, sourceIds: Array<string> }> };

export type GetRelatedConceptsQueryVariables = Exact<{
  conceptId: Scalars['ID']['input'];
  depth?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetRelatedConceptsQuery = { __typename?: 'Query', relatedConcepts: Array<{ __typename?: 'RelatedConcept', strength: number, concept: { __typename?: 'Concept', id: string, name: string, definition: string } }> };

export type CreateConceptMutationVariables = Exact<{
  input: CreateConceptInput;
}>;


export type CreateConceptMutation = { __typename?: 'Mutation', createConcept: { __typename?: 'Concept', id: string, name: string, definition: string } };

export type LinkConceptsMutationVariables = Exact<{
  fromId: Scalars['ID']['input'];
  toId: Scalars['ID']['input'];
  relationshipType: Scalars['String']['input'];
  strength?: InputMaybe<Scalars['Float']['input']>;
}>;


export type LinkConceptsMutation = { __typename?: 'Mutation', linkConcepts: { __typename?: 'ConceptRelationship', relationshipType: string, strength?: number | null, fromConcept: { __typename?: 'Concept', id: string, name: string }, toConcept: { __typename?: 'Concept', id: string, name: string } } };

export type SearchSemanticQueryVariables = Exact<{
  query: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchSemanticQuery = { __typename?: 'Query', searchSemantic: Array<{ __typename?: 'SemanticResult', id: string, text: string, similarity: number, entityType: string, entityId: string, startTime?: number | null }> };

export type LearningPathQueryVariables = Exact<{
  from: Scalars['String']['input'];
  to: Scalars['String']['input'];
}>;


export type LearningPathQuery = { __typename?: 'Query', learningPath?: { __typename?: 'LearningPath', steps: number, concepts: Array<{ __typename?: 'ConceptNode', id: string, name: string, type?: string | null }> } | null };

export type RelatedConceptsByNameQueryVariables = Exact<{
  conceptName: Scalars['String']['input'];
  depth?: InputMaybe<Scalars['Int']['input']>;
}>;


export type RelatedConceptsByNameQuery = { __typename?: 'Query', relatedConceptsByName: Array<{ __typename?: 'ConceptNode', id: string, name: string, type?: string | null }> };

export type PrerequisiteChainQueryVariables = Exact<{
  conceptName: Scalars['String']['input'];
}>;


export type PrerequisiteChainQuery = { __typename?: 'Query', prerequisiteChain: Array<{ __typename?: 'ConceptNode', id: string, name: string }> };

export type GetSkillTreeQueryVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type GetSkillTreeQuery = { __typename?: 'Query', skillTree: { __typename?: 'SkillTree', nodes: Array<{ __typename?: 'SkillTreeNode', id: string, label: string, type: string, masteryLevel: MasteryLevel, connections: Array<string> }>, edges: Array<{ __typename?: 'SkillTreeEdge', source: string, target: string }> } };

export type UpdateMasteryLevelMutationVariables = Exact<{
  nodeId: Scalars['ID']['input'];
  level: MasteryLevel;
}>;


export type UpdateMasteryLevelMutation = { __typename?: 'Mutation', updateMasteryLevel: { __typename?: 'SkillTreeNode', id: string, label: string, masteryLevel: MasteryLevel } };

export type MyCourseLessonPlansQueryVariables = Exact<{
  courseId: Scalars['ID']['input'];
}>;


export type MyCourseLessonPlansQuery = { __typename?: 'Query', myCourseLessonPlans: Array<{ __typename?: 'CourseLessonPlan', id: string, courseId: string, title: string, status: CourseLessonPlanStatus, createdAt: string, steps: Array<{ __typename?: 'CourseLessonStep', id: string, stepType: LessonStepType, stepOrder: number, config: unknown }> }> };

export type CourseLessonPlanQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CourseLessonPlanQuery = { __typename?: 'Query', courseLessonPlan?: { __typename?: 'CourseLessonPlan', id: string, courseId: string, title: string, status: CourseLessonPlanStatus, createdAt: string, steps: Array<{ __typename?: 'CourseLessonStep', id: string, stepType: LessonStepType, stepOrder: number, config: unknown }> } | null };

export type CreateLessonPlanMutationVariables = Exact<{
  input: CreateLessonPlanInput;
}>;


export type CreateLessonPlanMutation = { __typename?: 'Mutation', createLessonPlan: { __typename?: 'CourseLessonPlan', id: string, courseId: string, title: string, status: CourseLessonPlanStatus, createdAt: string, steps: Array<{ __typename?: 'CourseLessonStep', id: string, stepType: LessonStepType, stepOrder: number, config: unknown }> } };

export type AddLessonStepMutationVariables = Exact<{
  input: AddLessonStepInput;
}>;


export type AddLessonStepMutation = { __typename?: 'Mutation', addLessonStep: { __typename?: 'CourseLessonPlan', id: string, title: string, status: CourseLessonPlanStatus, steps: Array<{ __typename?: 'CourseLessonStep', id: string, stepType: LessonStepType, stepOrder: number, config: unknown }> } };

export type ReorderLessonStepsMutationVariables = Exact<{
  planId: Scalars['ID']['input'];
  stepIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type ReorderLessonStepsMutation = { __typename?: 'Mutation', reorderLessonSteps: { __typename?: 'CourseLessonPlan', id: string, steps: Array<{ __typename?: 'CourseLessonStep', id: string, stepType: LessonStepType, stepOrder: number }> } };

export type PublishLessonPlanMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PublishLessonPlanMutation = { __typename?: 'Mutation', publishLessonPlan: { __typename?: 'CourseLessonPlan', id: string, status: CourseLessonPlanStatus } };

export type CreateLessonMutationVariables = Exact<{
  input: CreateLessonInput;
}>;


export type CreateLessonMutation = { __typename?: 'Mutation', createLesson: { __typename?: 'Lesson', id: string, courseId: string, title: string, type: LessonType, status: LessonStatus, createdAt: string } };

export type LessonsByCourseQueryVariables = Exact<{
  courseId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type LessonsByCourseQuery = { __typename?: 'Query', lessonsByCourse: Array<{ __typename?: 'Lesson', id: string, title: string, type: LessonType, series?: string | null, lessonDate?: string | null, status: LessonStatus, createdAt: string, assets: Array<{ __typename?: 'LessonAsset', id: string, assetType: LessonAssetType, sourceUrl?: string | null, fileUrl?: string | null }> }> };

export type LessonQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type LessonQuery = { __typename?: 'Query', lesson?: { __typename?: 'Lesson', id: string, courseId: string, moduleId?: string | null, title: string, type: LessonType, series?: string | null, lessonDate?: string | null, instructorId: string, status: LessonStatus, createdAt: string, updatedAt: string, assets: Array<{ __typename?: 'LessonAsset', id: string, assetType: LessonAssetType, sourceUrl?: string | null, fileUrl?: string | null, metadata?: unknown | null }>, pipeline?: { __typename?: 'LessonPipeline', id: string, templateName?: string | null, nodes: unknown, config?: unknown | null, status: PipelineStatus, createdAt: string, currentRun?: { __typename?: 'LessonPipelineRun', id: string, status: RunStatus, startedAt?: string | null, completedAt?: string | null, logs?: unknown | null, results: Array<{ __typename?: 'LessonPipelineResult', id: string, moduleName: string, outputType: string, outputData?: unknown | null, fileUrl?: string | null, createdAt: string }> } | null } | null, citations: Array<{ __typename?: 'LessonCitation', id: string, sourceText: string, bookName: string, part?: string | null, page?: string | null, matchStatus: CitationMatchStatus, confidence?: number | null }> } | null };

export type SaveLessonPipelineMutationVariables = Exact<{
  lessonId: Scalars['ID']['input'];
  input: SaveLessonPipelineInput;
}>;


export type SaveLessonPipelineMutation = { __typename?: 'Mutation', saveLessonPipeline: { __typename?: 'LessonPipeline', id: string, status: PipelineStatus, nodes: unknown, config?: unknown | null, templateName?: string | null } };

export type StartLessonPipelineRunMutationVariables = Exact<{
  pipelineId: Scalars['ID']['input'];
}>;


export type StartLessonPipelineRunMutation = { __typename?: 'Mutation', startLessonPipelineRun: { __typename?: 'LessonPipelineRun', id: string, status: RunStatus, startedAt?: string | null } };

export type CancelLessonPipelineRunMutationVariables = Exact<{
  runId: Scalars['ID']['input'];
}>;


export type CancelLessonPipelineRunMutation = { __typename?: 'Mutation', cancelLessonPipelineRun: { __typename?: 'LessonPipelineRun', id: string, status: RunStatus } };

export type AddLessonAssetMutationVariables = Exact<{
  lessonId: Scalars['ID']['input'];
  input: AddLessonAssetInput;
}>;


export type AddLessonAssetMutation = { __typename?: 'Mutation', addLessonAsset: { __typename?: 'LessonAsset', id: string, assetType: LessonAssetType, sourceUrl?: string | null, fileUrl?: string | null } };

export type PublishLessonMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PublishLessonMutation = { __typename?: 'Mutation', publishLesson: { __typename?: 'Lesson', id: string, status: LessonStatus } };

export type LessonPipelineRunHistoryQueryVariables = Exact<{
  lessonId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type LessonPipelineRunHistoryQuery = { __typename?: 'Query', lessonPipelineRuns: Array<{ __typename?: 'LessonPipelineRun', id: string, runNumber: number, status: RunStatus, triggeredBy: string, completedAt?: string | null, results: Array<{ __typename?: 'LessonPipelineResult', id: string, moduleName: string, outputType: string }> }> };

export type PipelineTemplatesQueryVariables = Exact<{ [key: string]: never; }>;


export type PipelineTemplatesQuery = { __typename?: 'Query', pipelineTemplates: Array<{ __typename?: 'LessonPipelineTemplate', id: string, tenantId: string, name: string, description?: string | null, nodes: unknown, config: unknown, isSystem: boolean, createdBy?: string | null, createdAt: string, updatedAt: string }> };

export type CreatePipelineTemplateMutationVariables = Exact<{
  input: CreatePipelineTemplateInput;
}>;


export type CreatePipelineTemplateMutation = { __typename?: 'Mutation', createPipelineTemplate: { __typename?: 'LessonPipelineTemplate', id: string, name: string, description?: string | null, nodes: unknown, config: unknown, isSystem: boolean, createdAt: string } };

export type UpdatePipelineTemplateMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdatePipelineTemplateInput;
}>;


export type UpdatePipelineTemplateMutation = { __typename?: 'Mutation', updatePipelineTemplate: { __typename?: 'LessonPipelineTemplate', id: string, name: string, description?: string | null, nodes: unknown, config: unknown, updatedAt: string } };

export type DeletePipelineTemplateMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeletePipelineTemplateMutation = { __typename?: 'Mutation', deletePipelineTemplate: boolean };

export type LessonPipelineProgressSubscriptionVariables = Exact<{
  runId: Scalars['ID']['input'];
}>;


export type LessonPipelineProgressSubscription = { __typename?: 'Subscription', lessonPipelineProgress: { __typename?: 'LessonPipelineRun', id: string, status: RunStatus, completedAt?: string | null, results: Array<{ __typename?: 'LessonPipelineResult', id: string, moduleName: string, outputType: string, outputData?: unknown | null, fileUrl?: string | null }> } };

export type MyTeamOverviewQueryVariables = Exact<{ [key: string]: never; }>;


export type MyTeamOverviewQuery = { __typename?: 'Query', myTeamOverview: { __typename?: 'TeamOverview', memberCount: number, avgCompletionPct: number, avgXpThisWeek: number, atRiskCount: number, topCourseTitle?: string | null }, myTeamMemberProgress: Array<{ __typename?: 'TeamMemberProgress', userId: string, displayName: string, coursesEnrolled: number, avgCompletionPct: number, totalXp: number, level: number, lastActiveAt?: string | null, isAtRisk: boolean }> };

export type AddTeamMemberMutationVariables = Exact<{
  memberId: Scalars['ID']['input'];
}>;


export type AddTeamMemberMutation = { __typename?: 'Mutation', addTeamMember: boolean };

export type RemoveTeamMemberMutationVariables = Exact<{
  memberId: Scalars['ID']['input'];
}>;


export type RemoveTeamMemberMutation = { __typename?: 'Mutation', removeTeamMember: boolean };

export type MyNotificationPreferencesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyNotificationPreferencesQuery = { __typename?: 'Query', myNotificationPreferences: Array<{ __typename?: 'NotificationPreference', id: string, notificationType: NotificationType, channel: NotificationChannel, enabled: boolean }> };

export type UpdateNotificationPreferenceMutationVariables = Exact<{
  input: UpdateNotificationPreferenceInput;
}>;


export type UpdateNotificationPreferenceMutation = { __typename?: 'Mutation', updateNotificationPreference: { __typename?: 'NotificationPreference', id: string, notificationType: NotificationType, channel: NotificationChannel, enabled: boolean } };

export type MyNotificationHistoryQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  types?: InputMaybe<Array<NotificationType> | NotificationType>;
  channels?: InputMaybe<Array<NotificationChannel> | NotificationChannel>;
}>;


export type MyNotificationHistoryQuery = { __typename?: 'Query', myNotificationHistory: { __typename?: 'NotificationDeliveryConnection', totalCount: number, edges: Array<{ __typename?: 'NotificationDeliveryEdge', cursor: string, node: { __typename?: 'NotificationDelivery', id: string, notificationType: string, channel: NotificationChannel, title: string, body: string, status: DeliveryStatus, sentAt?: string | null, deliveredAt?: string | null, readAt?: string | null, createdAt: string } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null } } };

export type NotificationDeliveryAnalyticsQueryVariables = Exact<{
  startDate: Scalars['DateTime']['input'];
  endDate: Scalars['DateTime']['input'];
}>;


export type NotificationDeliveryAnalyticsQuery = { __typename?: 'Query', notificationDeliveryAnalytics: { __typename?: 'NotificationAnalytics', totalSent: number, totalDelivered: number, totalFailed: number, byChannel: Array<{ __typename?: 'ChannelAnalytics', channel: NotificationChannel, sent: number, delivered: number, failed: number }>, byType: Array<{ __typename?: 'TypeAnalytics', notificationType: string, sent: number, delivered: number, failed: number }> } };

export type MarkNotificationDeliveryReadMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type MarkNotificationDeliveryReadMutation = { __typename?: 'Mutation', markNotificationDeliveryRead: { __typename?: 'NotificationDelivery', id: string, readAt?: string | null } };

export type MarkAllNotificationDeliveriesReadMutationVariables = Exact<{ [key: string]: never; }>;


export type MarkAllNotificationDeliveriesReadMutation = { __typename?: 'Mutation', markAllNotificationDeliveriesRead: number };

export type NotificationReceivedSubscriptionVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type NotificationReceivedSubscription = { __typename?: 'Subscription', notificationReceived: { __typename?: 'Notification', id: string, type: NotificationType, title: string, body: string, payload?: unknown | null, readAt?: string | null, createdAt: string } };

export type MyOnboardingStateQueryVariables = Exact<{ [key: string]: never; }>;


export type MyOnboardingStateQuery = { __typename?: 'Query', myOnboardingState?: { __typename?: 'OnboardingState', userId: string, currentStep: number, totalSteps: number, completed: boolean, skipped: boolean, role: string, data?: unknown | null } | null };

export type UpdateOnboardingStepMutationVariables = Exact<{
  input: UpdateOnboardingStepInput;
}>;


export type UpdateOnboardingStepMutation = { __typename?: 'Mutation', updateOnboardingStep: { __typename?: 'OnboardingState', userId: string, currentStep: number, totalSteps: number, completed: boolean, skipped: boolean, role: string, data?: unknown | null } };

export type CompleteOnboardingMutationVariables = Exact<{ [key: string]: never; }>;


export type CompleteOnboardingMutation = { __typename?: 'Mutation', completeOnboarding: { __typename?: 'OnboardingState', userId: string, currentStep: number, totalSteps: number, completed: boolean, skipped: boolean, role: string, data?: unknown | null } };

export type SkipOnboardingMutationVariables = Exact<{ [key: string]: never; }>;


export type SkipOnboardingMutation = { __typename?: 'Mutation', skipOnboarding: { __typename?: 'OnboardingState', userId: string, currentStep: number, totalSteps: number, completed: boolean, skipped: boolean, role: string, data?: unknown | null } };

export type MyReviewAssignmentsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyReviewAssignmentsQuery = { __typename?: 'Query', myReviewAssignments: Array<{ __typename?: 'PeerReviewAssignment', id: string, contentItemId: string, contentItemTitle: string, submitterId: string, submitterDisplayName?: string | null, status: PeerReviewStatus, submissionText?: string | null, createdAt: string }> };

export type MySubmissionsQueryVariables = Exact<{ [key: string]: never; }>;


export type MySubmissionsQuery = { __typename?: 'Query', mySubmissions: Array<{ __typename?: 'PeerReviewSubmission', id: string, contentItemId: string, contentItemTitle: string, status: PeerReviewStatus, score?: number | null, feedback?: string | null, createdAt: string }> };

export type PeerReviewRubricQueryVariables = Exact<{
  contentItemId: Scalars['ID']['input'];
}>;


export type PeerReviewRubricQuery = { __typename?: 'Query', peerReviewRubric?: { __typename?: 'PeerReviewRubric', id: string, criteria: string, minReviewers: number, isAnonymous: boolean } | null };

export type SubmitPeerReviewMutationVariables = Exact<{
  assignmentId: Scalars['ID']['input'];
  criteriaScores: Scalars['String']['input'];
  feedback?: InputMaybe<Scalars['String']['input']>;
}>;


export type SubmitPeerReviewMutation = { __typename?: 'Mutation', submitPeerReview: boolean };

export type StartProctoringSessionMutationVariables = Exact<{
  assessmentId: Scalars['ID']['input'];
}>;


export type StartProctoringSessionMutation = { __typename?: 'Mutation', startProctoringSession: { __typename?: 'ProctoringSession', id: string, status: ProctoringSessionStatus, startedAt?: string | null, flagCount: number } };

export type FlagProctoringEventMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
  type: ProctoringFlagType;
  detail?: InputMaybe<Scalars['String']['input']>;
}>;


export type FlagProctoringEventMutation = { __typename?: 'Mutation', flagProctoringEvent: { __typename?: 'ProctoringSession', id: string, status: ProctoringSessionStatus, flagCount: number, flags: Array<{ __typename?: 'ProctoringFlag', type: ProctoringFlagType, timestamp: string, detail?: string | null }> } };

export type EndProctoringSessionMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type EndProctoringSessionMutation = { __typename?: 'Mutation', endProctoringSession: { __typename?: 'ProctoringSession', id: string, status: ProctoringSessionStatus, endedAt?: string | null, flagCount: number, flags: Array<{ __typename?: 'ProctoringFlag', type: ProctoringFlagType, timestamp: string, detail?: string | null }> } };

export type GetProctoringReportQueryVariables = Exact<{
  assessmentId: Scalars['ID']['input'];
}>;


export type GetProctoringReportQuery = { __typename?: 'Query', proctoringReport: Array<{ __typename?: 'ProctoringSession', id: string, userId: string, status: ProctoringSessionStatus, startedAt?: string | null, endedAt?: string | null, flagCount: number, flags: Array<{ __typename?: 'ProctoringFlag', type: ProctoringFlagType, timestamp: string, detail?: string | null }> }> };

export type SavedSearchesQueryVariables = Exact<{ [key: string]: never; }>;


export type SavedSearchesQuery = { __typename?: 'Query', savedSearches: Array<{ __typename?: 'SavedSearch', id: string, name: string, query: string, filters?: string | null, createdAt: string }> };

export type CreateSavedSearchMutationVariables = Exact<{
  input: CreateSavedSearchInput;
}>;


export type CreateSavedSearchMutation = { __typename?: 'Mutation', createSavedSearch: { __typename?: 'SavedSearch', id: string, name: string, query: string, filters?: string | null, createdAt: string } };

export type DeleteSavedSearchMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteSavedSearchMutation = { __typename?: 'Mutation', deleteSavedSearch: boolean };

export type SkillsQueryVariables = Exact<{
  category?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SkillsQuery = { __typename?: 'Query', skills: Array<{ __typename?: 'Skill', id: string, slug: string, name: string, description?: string | null, category: string, level: number, parentSkillId?: string | null, prerequisites: Array<{ __typename?: 'Skill', id: string, name: string, category: string }> }> };

export type SkillPathsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SkillPathsQuery = { __typename?: 'Query', skillPaths: Array<{ __typename?: 'SkillPath', id: string, title: string, description?: string | null, targetRole?: string | null, skillIds: Array<string>, estimatedHours?: number | null, isPublished: boolean }> };

export type MySkillProgressQueryVariables = Exact<{ [key: string]: never; }>;


export type MySkillProgressQuery = { __typename?: 'Query', mySkillProgress: Array<{ __typename?: 'LearnerSkillProgress', skillId: string, masteryLevel: MasteryLevel, evidenceCount: number, lastActivityAt?: string | null }> };

export type SkillGapAnalysisQueryVariables = Exact<{
  pathId: Scalars['ID']['input'];
}>;


export type SkillGapAnalysisQuery = { __typename?: 'Query', skillGapAnalysis: { __typename?: 'SkillGapAnalysis', targetPathId: string, totalSkills: number, masteredSkills: number, completionPct: number, gapSkills: Array<{ __typename?: 'Skill', id: string, name: string, category: string, level: number }> } };

export type UpdateMySkillProgressMutationVariables = Exact<{
  skillId: Scalars['ID']['input'];
  masteryLevel: MasteryLevel;
}>;


export type UpdateMySkillProgressMutation = { __typename?: 'Mutation', updateMySkillProgress: { __typename?: 'LearnerSkillProgress', skillId: string, masteryLevel: MasteryLevel, evidenceCount: number } };

export type TenantSocialLinksQueryVariables = Exact<{ [key: string]: never; }>;


export type TenantSocialLinksQuery = { __typename?: 'Query', tenantSocialLinks?: { __typename?: 'TenantSocialLinks', id: string, linkedinUrl?: string | null, facebookUrl?: string | null, twitterUrl?: string | null, youtubeUrl?: string | null, instagramUrl?: string | null, whatsappUrl?: string | null, githubUrl?: string | null } | null };

export type UpdateTenantSocialLinksMutationVariables = Exact<{
  input: UpdateTenantSocialLinksInput;
}>;


export type UpdateTenantSocialLinksMutation = { __typename?: 'Mutation', updateTenantSocialLinks: { __typename?: 'TenantSocialLinks', id: string, linkedinUrl?: string | null, facebookUrl?: string | null, twitterUrl?: string | null, youtubeUrl?: string | null, instagramUrl?: string | null, whatsappUrl?: string | null, githubUrl?: string | null } };

export type SocialFeedQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SocialFeedQuery = { __typename?: 'Query', socialFeed: Array<{ __typename?: 'SocialFeedItem', id: string, actorId: string, verb: string, objectType: string, objectId: string, objectTitle: string, createdAt: string }> };

export type SocialRecommendationsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SocialRecommendationsQuery = { __typename?: 'Query', socialRecommendations: Array<{ __typename?: 'SocialRecommendation', contentItemId: string, contentTitle: string, followersCount: number, isMutualFollower: boolean }> };

export type MyFollowersQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type MyFollowersQuery = { __typename?: 'Query', myFollowers: Array<string> };

export type MyFollowingQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type MyFollowingQuery = { __typename?: 'Query', myFollowing: Array<string> };

export type SearchUsersQueryVariables = Exact<{
  query: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchUsersQuery = { __typename?: 'Query', searchUsers: Array<{ __typename?: 'PublicProfile', userId: string, displayName: string, bio?: string | null }> };

export type RegisterWhatsAppMutationVariables = Exact<{
  phoneNumber: Scalars['String']['input'];
  countryCode: Scalars['String']['input'];
}>;


export type RegisterWhatsAppMutation = { __typename?: 'Mutation', registerWhatsApp: { __typename?: 'WhatsAppRegistration', success: boolean, message: string } };

export type VerifyWhatsAppMutationVariables = Exact<{
  code: Scalars['String']['input'];
}>;


export type VerifyWhatsAppMutation = { __typename?: 'Mutation', verifyWhatsApp: { __typename?: 'WhatsAppVerification', verified: boolean, message: string } };
