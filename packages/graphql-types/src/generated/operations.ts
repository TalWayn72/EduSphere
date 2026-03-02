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
  join__FieldSet: { input: string; output: string; }
  link__Import: { input: string; output: string; }
  requiresScopes__Scope: { input: string; output: string; }
};

export type AddFileSourceInput = {
  /** Base64-encoded file content  */
  contentBase64: Scalars['String']['input'];
  courseId: Scalars['ID']['input'];
  /** Original filename — used to determine SourceType (pdf/docx/txt)  */
  fileName: Scalars['String']['input'];
  /** MIME type hint (e.g. application/pdf)  */
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
  /** Full YouTube video URL (youtube.com/watch?v=... or youtu.be/...)  */
  url: Scalars['String']['input'];
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

/**
 * Spaced-repetition scheduling algorithm to use when creating or reviewing a card.
 * SM2 uses the classic SuperMemo-2 algorithm (quality 0-5).
 * FSRS uses the FSRS-4.5 algorithm (quality 1-4).
 */
export enum AlgorithmType {
  Fsrs = 'FSRS',
  Sm2 = 'SM2'
}

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
  Link = 'LINK',
  Sketch = 'SKETCH',
  SpatialComment = 'SPATIAL_COMMENT',
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

export type AtRiskLearner = {
  __typename?: 'AtRiskLearner';
  courseId: Scalars['ID']['output'];
  daysSinceLastActivity: Scalars['Int']['output'];
  flaggedAt: Scalars['DateTime']['output'];
  learnerId: Scalars['ID']['output'];
  progressPercent: Scalars['Float']['output'];
  riskFactors: Array<RiskFactor>;
  riskScore: Scalars['Float']['output'];
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

export type Certificate = {
  __typename?: 'Certificate';
  courseId: Scalars['ID']['output'];
  courseName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  issuedAt: Scalars['String']['output'];
  pdfUrl?: Maybe<Scalars['String']['output']>;
  verificationCode: Scalars['String']['output'];
};

export enum CitationMatchStatus {
  Failed = 'FAILED',
  Unverified = 'UNVERIFIED',
  Verified = 'VERIFIED'
}

export type ComplianceCourse = {
  __typename?: 'ComplianceCourse';
  complianceDueDate?: Maybe<Scalars['String']['output']>;
  estimatedHours?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  isCompliance: Scalars['Boolean']['output'];
  isPublished: Scalars['Boolean']['output'];
  slug: Scalars['String']['output'];
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

export type CourseGenerationResult = {
  __typename?: 'CourseGenerationResult';
  courseDescription?: Maybe<Scalars['String']['output']>;
  courseTitle?: Maybe<Scalars['String']['output']>;
  draftCourseId?: Maybe<Scalars['ID']['output']>;
  executionId: Scalars['ID']['output'];
  modules: Array<GeneratedModule>;
  status: Scalars['String']['output'];
};

export type CourseListing = {
  __typename?: 'CourseListing';
  courseId: Scalars['ID']['output'];
  currency: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isPublished: Scalars['Boolean']['output'];
  priceCents: Scalars['Int']['output'];
  revenueSplitPercent: Scalars['Int']['output'];
};

export type CourseProgress = {
  __typename?: 'CourseProgress';
  completedItems: Scalars['Int']['output'];
  courseId: Scalars['ID']['output'];
  percentComplete: Scalars['Float']['output'];
  totalItems: Scalars['Int']['output'];
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
};

export type CreateAnnouncementInput = {
  body: Scalars['String']['input'];
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  priority: Scalars['String']['input'];
  publishAt?: InputMaybe<Scalars['String']['input']>;
  targetAudience: Scalars['String']['input'];
  title: Scalars['String']['input'];
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

export type CreateLessonInput = {
  courseId: Scalars['ID']['input'];
  instructorId: Scalars['ID']['input'];
  lessonDate?: InputMaybe<Scalars['String']['input']>;
  moduleId?: InputMaybe<Scalars['ID']['input']>;
  series?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  type: LessonType;
};

export type CreateModuleInput = {
  courseId: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  orderIndex: Scalars['Int']['input'];
  title: Scalars['String']['input'];
};

export type CreatePersonInput = {
  bio?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateRoleInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  permissions: Array<Scalars['String']['input']>;
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

export type DayActivity = {
  __typename?: 'DayActivity';
  count: Scalars['Int']['output'];
  date: Scalars['String']['output'];
};

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

/** Discussion types */
export enum DiscussionType {
  Chavruta = 'CHAVRUTA',
  Debate = 'DEBATE',
  Forum = 'FORUM'
}

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

export type EvaluationCriterionScore = {
  __typename?: 'EvaluationCriterionScore';
  feedback: Scalars['String']['output'];
  name: Scalars['String']['output'];
  score: Scalars['Float']['output'];
};

export type FunnelStep = {
  __typename?: 'FunnelStep';
  dropOffRate: Scalars['Float']['output'];
  learnersCompleted: Scalars['Int']['output'];
  learnersStarted: Scalars['Int']['output'];
  moduleId: Scalars['ID']['output'];
  moduleName: Scalars['String']['output'];
};

export type GenerateCourseInput = {
  estimatedHours?: InputMaybe<Scalars['Int']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  prompt: Scalars['String']['input'];
  targetAudienceLevel?: InputMaybe<Scalars['String']['input']>;
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
  id: Scalars['ID']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  /** Original file name, URL, or YouTube link  */
  origin?: Maybe<Scalars['String']['output']>;
  /** Preview of first 500 chars  */
  preview?: Maybe<Scalars['String']['output']>;
  /** Full extracted plaintext (may be large — use with care)  */
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
  id: Scalars['ID']['output'];
  lessonId: Scalars['ID']['output'];
  matchStatus: CitationMatchStatus;
  page?: Maybe<Scalars['String']['output']>;
  paragraph?: Maybe<Scalars['String']['output']>;
  part?: Maybe<Scalars['String']['output']>;
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
  logs?: Maybe<Scalars['JSON']['output']>;
  pipelineId: Scalars['ID']['output'];
  results: Array<LessonPipelineResult>;
  startedAt?: Maybe<Scalars['String']['output']>;
  status: RunStatus;
};

export enum LessonStatus {
  Draft = 'DRAFT',
  Processing = 'PROCESSING',
  Published = 'PUBLISHED',
  Ready = 'READY'
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

export type LiveSession = {
  __typename?: 'LiveSession';
  contentItemId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  meetingName: Scalars['String']['output'];
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

export type MarketplacePurchase = {
  __typename?: 'MarketplacePurchase';
  amountCents: Scalars['Int']['output'];
  courseId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  purchasedAt: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

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
  status: MediaStatus;
  title: Scalars['String']['output'];
};

export enum MediaStatus {
  Error = 'ERROR',
  Processing = 'PROCESSING',
  Ready = 'READY',
  Uploading = 'UPLOADING'
}

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
  activateAgentTemplate: AgentTemplate;
  activateAssessmentCampaign: Scalars['Boolean']['output'];
  activateLibraryCourse: LibraryActivation;
  activatePoll: SessionPoll;
  /**
   * Upload a local file (DOCX / PDF / TXT) as a knowledge source.
   * The content is passed as a base64-encoded string so it can travel through
   * the GraphQL gateway without a multipart transport layer.
   */
  addFileSource: KnowledgeSource;
  addLessonAsset: LessonAsset;
  /** Add a message to a discussion */
  addMessage: DiscussionMessage;
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
  assignCpdCreditsToCourse: Scalars['Boolean']['output'];
  bulkImportUsers: BulkImportResult;
  cancelAgentExecution: AgentExecution;
  cancelLessonPipelineRun: LessonPipelineRun;
  closePoll: PollResults;
  completeAssessmentCampaign: AssessmentResult;
  confirmMediaUpload: MediaAsset;
  createAgentTemplate: AgentTemplate;
  createAnnotation: Annotation;
  createAnnouncement: Announcement;
  createAssessmentCampaign: AssessmentCampaign;
  createBadge: Badge;
  /** Create a new badge definition for the tenant */
  createBadgeDefinition: OpenBadgeDefinition;
  createBreakoutRooms: Array<BreakoutRoom>;
  createConcept: Concept;
  createContentItem: ContentItem;
  createCourse: Course;
  createCourseListing: CourseListing;
  createCpdCreditType: CpdCreditType;
  /** Create a new discussion */
  createDiscussion: Discussion;
  createEmbedding: Embedding;
  createLesson: Lesson;
  createLiveSession: LiveSession;
  /** Creates a new ordered microlearning path from existing MICROLESSON content items. */
  createMicrolearningPath: MicrolearningPath;
  createModule: Module;
  createPerson: Person;
  createPoll: SessionPoll;
  createProgram: CredentialProgram;
  /** Create a new spaced-repetition card for the authenticated user. */
  createReviewCard: SrsCard;
  createRole: Role;
  createScenarioTemplate: ScenarioTemplate;
  /**
   * Create a new skill profile defining required concepts for a role/goal.
   * Only instructors and admins may create profiles.
   */
  createSkillProfile: SkillProfile;
  createSource: Source;
  createTerm: Term;
  createTopicCluster: TopicCluster;
  createUser: User;
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
  deleteRole: Scalars['Boolean']['output'];
  disconnectCrm: Scalars['Boolean']['output'];
  endLiveSession: LiveSession;
  endSession: Scalars['Boolean']['output'];
  enrollCourse: UserCourse;
  enrollInProgram: ProgramEnrollment;
  exportAuditLog: AuditExportResult;
  exportCourseAsScorm: Scalars['String']['output'];
  exportCpdReport: Scalars['String']['output'];
  finishScormSession: Scalars['Boolean']['output'];
  followUser: Scalars['Boolean']['output'];
  generateBIApiKey: Scalars['String']['output'];
  generateComplianceReport: ComplianceReportResult;
  generateCourseFromPrompt: CourseGenerationResult;
  generateEmbedding: Scalars['Boolean']['output'];
  generateScimToken: GenerateScimTokenResult;
  /** Generate a new xAPI LRS bearer token. Returns the raw token (shown once). */
  generateXapiToken: Scalars['String']['output'];
  gradeQuizSubmission: QuizResult;
  importScormPackage: ScormImportResult;
  initScormSession: ScormSession;
  /** Manually issue a badge to a user (admin or instructor action) */
  issueBadge: OpenBadgeAssertion;
  /** Join a discussion as a participant */
  joinDiscussion: Scalars['Boolean']['output'];
  joinLiveSession: Scalars['String']['output'];
  /** Leave a discussion */
  leaveDiscussion: Scalars['Boolean']['output'];
  linkConcepts: ConceptRelationship;
  markContentViewed: Scalars['Boolean']['output'];
  publishAnnouncement: Announcement;
  publishCourse: Course;
  publishLesson: Lesson;
  publishListing: Scalars['Boolean']['output'];
  publishPortal: Scalars['Boolean']['output'];
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
  /** Register a new LTI 1.3 platform for the current tenant. */
  registerLtiPlatform: LtiPlatform;
  reorderModules: Array<Module>;
  replyToAnnotation: Annotation;
  requestContentTranslation: ContentTranslation;
  requestPayout: Scalars['Boolean']['output'];
  resetUserPassword: Scalars['Boolean']['output'];
  resolveAnnotation: Annotation;
  resolveAtRiskFlag: Scalars['Boolean']['output'];
  revokeBIApiKey: Scalars['Boolean']['output'];
  /** Revoke a previously issued badge (cannot be undone) */
  revokeBadge: Scalars['Boolean']['output'];
  revokeDelegation: Scalars['Boolean']['output'];
  revokeScimToken: Scalars['Boolean']['output'];
  /** Revoke an existing xAPI token. */
  revokeXapiToken: Scalars['Boolean']['output'];
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
  startAgentExecution: AgentExecution;
  startAgentSession: AgentSession;
  startLessonPipelineRun: LessonPipelineRun;
  startRoleplaySession: ScenarioSession;
  submitAssessmentResponse: Scalars['Boolean']['output'];
  /**
   * Record a review result using the SM-2 quality scale (0–5) and return
   * the updated card with its new due date and interval.
   */
  submitReview: SrsCard;
  submitTextAssignment: TextSubmission;
  /** Enable or disable an LTI platform. */
  toggleLtiPlatform: LtiPlatform;
  unenrollCourse: Scalars['Boolean']['output'];
  unfollowUser: Scalars['Boolean']['output'];
  unpublishCourse: Course;
  unpublishPortal: Scalars['Boolean']['output'];
  updateAgentTemplate: AgentTemplate;
  updateAnnotation: Annotation;
  updateAnnouncement: Announcement;
  updateBadge: Badge;
  updateConcept: Concept;
  updateCourse: Course;
  updateCourseComplianceSettings: ComplianceCourse;
  updateLesson: Lesson;
  updateMediaAltText: MediaAsset;
  updateModule: Module;
  updateProfileVisibility: UserPreferences;
  updateProgram: CredentialProgram;
  updateRole: Role;
  updateScormSession: Scalars['Boolean']['output'];
  updateSecuritySettings: SecuritySettings;
  updateTenantBranding: TenantBranding;
  updateTenantLanguageSettings: TenantLanguageSettings;
  updateUser: User;
  updateUserPreferences: User;
  votePoll: Scalars['Boolean']['output'];
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


export type MutationAddFileSourceArgs = {
  input: AddFileSourceInput;
};


export type MutationAddLessonAssetArgs = {
  input: AddLessonAssetInput;
  lessonId: Scalars['ID']['input'];
};


export type MutationAddMessageArgs = {
  discussionId: Scalars['ID']['input'];
  input: AddMessageInput;
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


export type MutationAssignCpdCreditsToCourseArgs = {
  courseId: Scalars['ID']['input'];
  creditHours: Scalars['Float']['input'];
  creditTypeId: Scalars['ID']['input'];
};


export type MutationBulkImportUsersArgs = {
  csvData: Scalars['String']['input'];
};


export type MutationCancelAgentExecutionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCancelLessonPipelineRunArgs = {
  runId: Scalars['ID']['input'];
};


export type MutationClosePollArgs = {
  pollId: Scalars['ID']['input'];
};


export type MutationCompleteAssessmentCampaignArgs = {
  campaignId: Scalars['ID']['input'];
};


export type MutationConfirmMediaUploadArgs = {
  courseId: Scalars['ID']['input'];
  fileKey: Scalars['String']['input'];
  title: Scalars['String']['input'];
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


export type MutationCreateEmbeddingArgs = {
  input: CreateEmbeddingInput;
};


export type MutationCreateLessonArgs = {
  input: CreateLessonInput;
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


export type MutationCreatePersonArgs = {
  input: CreatePersonInput;
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


export type MutationCreateScenarioTemplateArgs = {
  characterPersona: Scalars['String']['input'];
  difficultyLevel: Scalars['String']['input'];
  domain: Scalars['String']['input'];
  maxTurns?: InputMaybe<Scalars['Int']['input']>;
  sceneDescription: Scalars['String']['input'];
  title: Scalars['String']['input'];
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


export type MutationDeleteRoleArgs = {
  id: Scalars['ID']['input'];
};


export type MutationEndLiveSessionArgs = {
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


export type MutationExportAuditLogArgs = {
  format?: AuditExportFormat;
  fromDate: Scalars['String']['input'];
  toDate: Scalars['String']['input'];
};


export type MutationExportCourseAsScormArgs = {
  courseId: Scalars['ID']['input'];
};


export type MutationExportCpdReportArgs = {
  format: CpdExportFormat;
};


export type MutationFinishScormSessionArgs = {
  data: Scalars['String']['input'];
  sessionId: Scalars['ID']['input'];
};


export type MutationFollowUserArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationGenerateBiApiKeyArgs = {
  description: Scalars['String']['input'];
};


export type MutationGenerateComplianceReportArgs = {
  asOf?: InputMaybe<Scalars['String']['input']>;
  courseIds: Array<Scalars['ID']['input']>;
};


export type MutationGenerateCourseFromPromptArgs = {
  input: GenerateCourseInput;
};


export type MutationGenerateEmbeddingArgs = {
  entityId: Scalars['ID']['input'];
  entityType: Scalars['String']['input'];
  text: Scalars['String']['input'];
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


export type MutationImportScormPackageArgs = {
  fileKey: Scalars['String']['input'];
};


export type MutationInitScormSessionArgs = {
  contentItemId: Scalars['ID']['input'];
};


export type MutationIssueBadgeArgs = {
  badgeDefinitionId: Scalars['ID']['input'];
  evidenceUrl?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['ID']['input'];
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


export type MutationPublishAnnouncementArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishCourseArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishLessonArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishListingArgs = {
  courseId: Scalars['ID']['input'];
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


export type MutationRegisterLtiPlatformArgs = {
  input: RegisterLtiPlatformInput;
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


export type MutationResetUserPasswordArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationResolveAnnotationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationResolveAtRiskFlagArgs = {
  flagId: Scalars['ID']['input'];
};


export type MutationRevokeBiApiKeyArgs = {
  tokenId: Scalars['ID']['input'];
};


export type MutationRevokeBadgeArgs = {
  assertionId: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
};


export type MutationRevokeDelegationArgs = {
  delegationId: Scalars['ID']['input'];
};


export type MutationRevokeScimTokenArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRevokeXapiTokenArgs = {
  tokenId: Scalars['ID']['input'];
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


export type MutationStartAgentExecutionArgs = {
  input: StartAgentExecutionInput;
};


export type MutationStartAgentSessionArgs = {
  context: Scalars['JSON']['input'];
  templateType: TemplateType;
};


export type MutationStartLessonPipelineRunArgs = {
  pipelineId: Scalars['ID']['input'];
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


export type MutationSubmitReviewArgs = {
  cardId: Scalars['ID']['input'];
  quality: Scalars['Int']['input'];
};


export type MutationSubmitTextAssignmentArgs = {
  contentItemId: Scalars['ID']['input'];
  courseId: Scalars['ID']['input'];
  textContent: Scalars['String']['input'];
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


export type MutationUpdateCourseArgs = {
  id: Scalars['ID']['input'];
  input: UpdateCourseInput;
};


export type MutationUpdateCourseComplianceSettingsArgs = {
  complianceDueDate?: InputMaybe<Scalars['String']['input']>;
  courseId: Scalars['ID']['input'];
  isCompliance: Scalars['Boolean']['input'];
};


export type MutationUpdateLessonArgs = {
  id: Scalars['ID']['input'];
  input: UpdateLessonInput;
};


export type MutationUpdateMediaAltTextArgs = {
  altText: Scalars['String']['input'];
  mediaId: Scalars['ID']['input'];
};


export type MutationUpdateModuleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateModuleInput;
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


export type MutationUpdateUserArgs = {
  id: Scalars['ID']['input'];
  input: UpdateUserInput;
};


export type MutationUpdateUserPreferencesArgs = {
  input: UpdateUserPreferencesInput;
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

export enum NotificationType {
  Announcement = 'ANNOUNCEMENT',
  BadgeIssued = 'BADGE_ISSUED',
  CourseEnrolled = 'COURSE_ENROLLED',
  SrsReviewDue = 'SRS_REVIEW_DUE',
  UserFollowed = 'USER_FOLLOWED'
}

/** OpenBadges 3.0 assertion — one earned credential per user */
export type OpenBadgeAssertion = {
  __typename?: 'OpenBadgeAssertion';
  badgeDefinitionId: Scalars['ID']['output'];
  badgeDescription: Scalars['String']['output'];
  badgeName: Scalars['String']['output'];
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
  criteriaUrl?: Maybe<Scalars['String']['output']>;
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  issuerId: Scalars['String']['output'];
  name: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  version: Scalars['String']['output'];
};

export type PaymentIntentResult = {
  __typename?: 'PaymentIntentResult';
  clientSecret: Scalars['String']['output'];
  paymentIntentId: Scalars['String']['output'];
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

export type Query = {
  __typename?: 'Query';
  _health: Scalars['String']['output'];
  activeAnnouncements: Array<Announcement>;
  adminAnnouncements: AnnouncementResult;
  adminAuditLog: AuditLogResult;
  adminBadges: Array<Badge>;
  adminCourseEnrollments: Array<AdminEnrollmentRecord>;
  adminOverview: AdminOverview;
  adminUsers: AdminUsersResult;
  agentExecution?: Maybe<AgentExecution>;
  agentExecutionsByAgent: Array<AgentExecution>;
  agentExecutionsByUser: Array<AgentExecution>;
  agentSession?: Maybe<AgentSession>;
  agentTemplate?: Maybe<AgentTemplate>;
  agentTemplates: Array<AgentTemplate>;
  agentTemplatesByType: Array<AgentTemplate>;
  annotation?: Maybe<Annotation>;
  annotations: Array<Annotation>;
  annotationsByAsset: Array<Annotation>;
  annotationsByUser: Array<Annotation>;
  assessmentResult?: Maybe<AssessmentResult>;
  atRiskLearners: Array<AtRiskLearner>;
  /** List all badge definitions for the tenant (admin/instructor only) */
  badgeDefinitions: Array<OpenBadgeDefinition>;
  biApiTokens: Array<BiApiToken>;
  breakoutRooms: Array<BreakoutRoom>;
  campaignsToRespond: Array<AssessmentCampaign>;
  complianceCourses: Array<ComplianceCourse>;
  concept?: Maybe<Concept>;
  conceptByName?: Maybe<Concept>;
  concepts: Array<Concept>;
  contentItem?: Maybe<ContentItem>;
  contentItemsByModule: Array<ContentItem>;
  contentTranslation?: Maybe<ContentTranslation>;
  course?: Maybe<Course>;
  courseAnalytics: CourseAnalytics;
  courseKnowledgeSources: Array<KnowledgeSource>;
  courseListings: Array<CourseListing>;
  courses: Array<Course>;
  coursesByInstructor: Array<Course>;
  cpdCreditTypes: Array<CpdCreditType>;
  crmConnection?: Maybe<CrmConnection>;
  crmSyncLog: Array<CrmSyncLogEntry>;
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
  /** Alias for dueReviews — returns cards due for review up to the given limit. */
  getDueCards: Array<SrsCard>;
  getPresignedUploadUrl: PresignedUploadUrl;
  instructorEarnings: EarningsSummary;
  knowledgeSource?: Maybe<KnowledgeSource>;
  leaderboard: Array<LeaderboardEntry>;
  /**
   * Find the shortest learning path between two concepts identified by name.
   * Returns null when no path exists between the two concepts.
   * Uses Apache AGE shortestPath() traversing RELATED_TO and PREREQUISITE_OF edges.
   */
  learningPath?: Maybe<LearningPath>;
  lesson?: Maybe<Lesson>;
  lessonPipelineRun?: Maybe<LessonPipelineRun>;
  lessonsByCourse: Array<Lesson>;
  libraryCourses: Array<LibraryCourse>;
  liveSession?: Maybe<LiveSession>;
  /** List all LTI platforms for the current tenant. ORG_ADMIN only. */
  ltiPlatforms: Array<LtiPlatform>;
  me?: Maybe<User>;
  /** Lists all microlearning paths for the authenticated user's tenant. */
  microlearningPaths: Array<MicrolearningPath>;
  module?: Maybe<Module>;
  modulesByCourse: Array<Module>;
  myAgentSessions: Array<AgentSession>;
  myBadges: Array<UserBadge>;
  myCampaigns: Array<AssessmentCampaign>;
  myCertificates: Array<Certificate>;
  myCourseProgress: CourseProgress;
  myCpdReport: CpdReport;
  /** Get all discussions the current user has participated in */
  myDiscussions: Array<Discussion>;
  myEnrollments: Array<UserCourse>;
  myFollowers: Array<Scalars['ID']['output']>;
  myFollowing: Array<Scalars['ID']['output']>;
  /**
   * Return a personalized learning path toward the named concept.
   * Nodes are ordered from prerequisite to target; isCompleted reflects user progress.
   */
  myLearningPath?: Maybe<AutoPath>;
  myLibraryActivations: Array<LibraryActivation>;
  /** List all non-revoked badges earned by the current user */
  myOpenBadges: Array<OpenBadgeAssertion>;
  myPortal?: Maybe<PortalPage>;
  myProgramEnrollments: Array<ProgramEnrollment>;
  myPurchases: Array<MarketplacePurchase>;
  myQuizResults: Array<QuizResult>;
  myRank: Scalars['Int']['output'];
  /**
   * Returns the ordered list of choices the authenticated user has made
   * for the given scenario tree (identified by its root content item ID).
   */
  myScenarioProgress: Array<ScenarioProgressEntry>;
  myScenarioSession?: Maybe<ScenarioSession>;
  myScormSession?: Maybe<ScormSession>;
  mySecuritySettings: SecuritySettings;
  myStats: UserStats;
  mySubmissions: Array<TextSubmission>;
  myTenantBranding: TenantBranding;
  myTenantLanguageSettings: TenantLanguageSettings;
  myTotalPoints: Scalars['Int']['output'];
  person?: Maybe<Person>;
  personByName?: Maybe<Person>;
  pollResults: PollResults;
  /**
   * Find the deepest prerequisite chain leading into a named concept.
   * Returns nodes ordered from root prerequisite to the target concept.
   */
  prerequisiteChain: Array<ConceptNode>;
  program?: Maybe<CredentialProgram>;
  programProgress: ProgramProgress;
  programs: Array<CredentialProgram>;
  publicPortal?: Maybe<PortalPage>;
  publicProfile?: Maybe<PublicProfile>;
  relatedConcepts: Array<RelatedConcept>;
  /**
   * Collect all distinct concepts reachable from a named concept within `depth` hops
   * (default depth 2, max 5) via RELATED_TO edges using COLLECT(DISTINCT ...) aggregation.
   */
  relatedConceptsByName: Array<ConceptNode>;
  role?: Maybe<Role>;
  roles: Array<Role>;
  runningExecutions: Array<AgentExecution>;
  /** Returns the scenario node data for a given SCENARIO-type ContentItem. */
  scenarioNode?: Maybe<ScenarioNode>;
  scenarioTemplates: Array<ScenarioTemplate>;
  scimSyncLog: Array<ScimSyncEntry>;
  scimTokens: Array<ScimToken>;
  searchSemantic: Array<SemanticResult>;
  semanticSearch: Array<SimilarityResult>;
  semanticSearchByContentItem: Array<SimilarityResult>;
  sessionPolls: Array<SessionPoll>;
  /** Analyze skill gap between the current user's mastery and a named skill profile. */
  skillGapAnalysis: SkillGapReport;
  /** List all skill profiles available within the current tenant. */
  skillProfiles: Array<SkillProfile>;
  socialFeed: Array<SocialFeedItem>;
  socialRecommendations: Array<SocialRecommendation>;
  source?: Maybe<Source>;
  /** Count of cards currently due — used by the Dashboard badge. */
  srsQueueCount: Scalars['Int']['output'];
  submissionPlagiarismReport?: Maybe<PlagiarismReport>;
  tenant?: Maybe<Tenant>;
  tenants: Array<Tenant>;
  term?: Maybe<Term>;
  termByName?: Maybe<Term>;
  topicCluster?: Maybe<TopicCluster>;
  topicClustersByCourse: Array<TopicCluster>;
  user?: Maybe<User>;
  userDelegations: Array<RoleDelegation>;
  users: Array<User>;
  /**
   * Verify a badge assertion by ID — public (no auth required).
   * Checks signature validity, revocation status and expiry.
   */
  verifyBadge: BadgeVerificationResult;
  verifyCertificate?: Maybe<Certificate>;
  /** Query recent xAPI statements stored in the self-hosted LRS. */
  xapiStatements: Array<XapiStatementResult>;
  /** List all xAPI tokens for this tenant. ORG_ADMIN only. */
  xapiTokens: Array<XapiToken>;
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


export type QueryBreakoutRoomsArgs = {
  sessionId: Scalars['ID']['input'];
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


export type QueryCourseKnowledgeSourcesArgs = {
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


export type QueryGetDueCardsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetPresignedUploadUrlArgs = {
  contentType: Scalars['String']['input'];
  courseId: Scalars['ID']['input'];
  fileName: Scalars['String']['input'];
};


export type QueryKnowledgeSourceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
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


export type QueryLessonsByCourseArgs = {
  courseId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryLibraryCoursesArgs = {
  topic?: InputMaybe<LibraryTopic>;
};


export type QueryLiveSessionArgs = {
  contentItemId: Scalars['ID']['input'];
};


export type QueryModuleArgs = {
  id: Scalars['ID']['input'];
};


export type QueryModulesByCourseArgs = {
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


export type QueryMyFollowersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyFollowingArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryMyLearningPathArgs = {
  targetConceptName: Scalars['String']['input'];
};


export type QueryMyQuizResultsArgs = {
  contentItemId: Scalars['ID']['input'];
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


export type QueryMySubmissionsArgs = {
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


export type QueryProgramArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProgramProgressArgs = {
  programId: Scalars['ID']['input'];
};


export type QueryPublicProfileArgs = {
  userId: Scalars['ID']['input'];
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


export type QuerySearchSemanticArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
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


export type QuerySessionPollsArgs = {
  sessionId: Scalars['ID']['input'];
};


export type QuerySkillGapAnalysisArgs = {
  roleId: Scalars['ID']['input'];
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

export type RelatedConcept = {
  __typename?: 'RelatedConcept';
  concept: Concept;
  strength: Scalars['Float']['output'];
};

export type RiskFactor = {
  __typename?: 'RiskFactor';
  description: Scalars['String']['output'];
  key: Scalars['String']['output'];
};

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

export type ScormImportResult = {
  __typename?: 'ScormImportResult';
  courseId: Scalars['ID']['output'];
  itemCount: Scalars['Int']['output'];
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
  text: Scalars['String']['output'];
};

export type SessionPoll = {
  __typename?: 'SessionPoll';
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  options: Array<Scalars['String']['output']>;
  question: Scalars['String']['output'];
  sessionId: Scalars['ID']['output'];
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

/** A single concept gap item: whether it is mastered and what content is recommended. */
export type SkillGapItem = {
  __typename?: 'SkillGapItem';
  conceptName: Scalars['String']['output'];
  isMastered: Scalars['Boolean']['output'];
  recommendedContentItems: Array<Scalars['ID']['output']>;
  recommendedContentTitles: Array<Scalars['String']['output']>;
  relevanceScore: Scalars['Float']['output'];
};

/** Full skill gap report comparing a learner's mastery against a role profile. */
export type SkillGapReport = {
  __typename?: 'SkillGapReport';
  completionPercentage: Scalars['Float']['output'];
  gapCount: Scalars['Int']['output'];
  gaps: Array<SkillGapItem>;
  mastered: Scalars['Int']['output'];
  roleId: Scalars['ID']['output'];
  roleName: Scalars['String']['output'];
  totalRequired: Scalars['Int']['output'];
};

/** A brief view of a skill profile (role/goal definition). */
export type SkillProfile = {
  __typename?: 'SkillProfile';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  requiredConceptsCount: Scalars['Int']['output'];
  roleName: Scalars['String']['output'];
};

export type SocialFeedItem = {
  __typename?: 'SocialFeedItem';
  action: Scalars['String']['output'];
  contentItemId: Scalars['ID']['output'];
  contentTitle: Scalars['String']['output'];
  timestamp: Scalars['String']['output'];
  userDisplayName: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type SocialRecommendation = {
  __typename?: 'SocialRecommendation';
  contentItemId: Scalars['ID']['output'];
  contentTitle: Scalars['String']['output'];
  followersCount: Scalars['Int']['output'];
  isMutualFollower: Scalars['Boolean']['output'];
  lastActivity: Scalars['String']['output'];
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

export type StartAgentExecutionInput = {
  agentId: Scalars['ID']['input'];
  input: Scalars['JSON']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  userId: Scalars['ID']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Subscribe to new annotations on a specific asset in real-time */
  annotationAdded: Annotation;
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


export type SubscriptionAnnotationAddedArgs = {
  assetId: Scalars['ID']['input'];
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

export enum TemplateType {
  ChavrutaDebate = 'CHAVRUTA_DEBATE',
  Custom = 'CUSTOM',
  DebateFacilitator = 'DEBATE_FACILITATOR',
  Explain = 'EXPLAIN',
  ExplanationGenerator = 'EXPLANATION_GENERATOR',
  QuizAssess = 'QUIZ_ASSESS',
  QuizGenerator = 'QUIZ_GENERATOR',
  ResearchScout = 'RESEARCH_SCOUT',
  RoleplaySimulator = 'ROLEPLAY_SIMULATOR',
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

export type TenantBranding = {
  __typename?: 'TenantBranding';
  accentColor: Scalars['String']['output'];
  backgroundColor: Scalars['String']['output'];
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

export type Term = {
  __typename?: 'Term';
  createdAt: Scalars['String']['output'];
  definition: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  tenantId: Scalars['ID']['output'];
  updatedAt: Scalars['String']['output'];
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

export type UpdateConceptInput = {
  definition?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  sourceIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UpdateCourseInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  estimatedHours?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  thumbnailUrl?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
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
};

export type UpdateTenantLanguageSettingsInput = {
  defaultLanguage: Scalars['String']['input'];
  supportedLanguages: Array<Scalars['String']['input']>;
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

export type UserCourse = {
  __typename?: 'UserCourse';
  completedAt?: Maybe<Scalars['String']['output']>;
  courseId: Scalars['ID']['output'];
  enrolledAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
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
  totalLearningMinutes: Scalars['Int']['output'];
  weeklyActivity: Array<DayActivity>;
};

export type UserStatus = {
  __typename?: 'UserStatus';
  lastSeen: Scalars['DateTime']['output'];
  online: Scalars['Boolean']['output'];
  userId: Scalars['ID']['output'];
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

export type StartAgentSessionMutationVariables = Exact<{
  templateType: TemplateType;
  context: Scalars['JSON']['input'];
}>;


export type StartAgentSessionMutation = { __typename?: 'Mutation', startAgentSession: { __typename?: 'AgentSession', id: string, templateType: TemplateType, status: AgentSessionStatus, createdAt: string } };

export type SendAgentMessageMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
  content: Scalars['String']['input'];
}>;


export type SendAgentMessageMutation = { __typename?: 'Mutation', sendMessage: { __typename?: 'AgentMessage', id: string, role: MessageRole, content: string, createdAt: string } };

export type EndAgentSessionMutationVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type EndAgentSessionMutation = { __typename?: 'Mutation', endSession: boolean };

export type AgentSessionQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type AgentSessionQuery = { __typename?: 'Query', agentSession?: { __typename?: 'AgentSession', id: string, templateType: TemplateType, status: AgentSessionStatus, createdAt: string, messages: Array<{ __typename?: 'AgentMessage', id: string, role: MessageRole, content: string, createdAt: string }> } | null };

export type MyAgentSessionsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyAgentSessionsQuery = { __typename?: 'Query', myAgentSessions: Array<{ __typename?: 'AgentSession', id: string, templateType: TemplateType, status: AgentSessionStatus, createdAt: string, messages: Array<{ __typename?: 'AgentMessage', id: string, content: string, role: MessageRole }> }> };

export type AgentTemplatesQueryVariables = Exact<{ [key: string]: never; }>;


export type AgentTemplatesQuery = { __typename?: 'Query', agentTemplates: Array<{ __typename?: 'AgentTemplate', id: string, name: string, templateType: TemplateType, systemPrompt: string }> };

export type MessageStreamSubscriptionVariables = Exact<{
  sessionId: Scalars['ID']['input'];
}>;


export type MessageStreamSubscription = { __typename?: 'Subscription', messageStream: { __typename?: 'AgentMessage', id: string, role: MessageRole, content: string, createdAt: string } };

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

export type MyOpenBadgesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyOpenBadgesQuery = { __typename?: 'Query', myOpenBadges: Array<{ __typename?: 'OpenBadgeAssertion', id: string, badgeDefinitionId: string, badgeName: string, badgeDescription: string, imageUrl?: string | null, recipientId: string, issuedAt: string, expiresAt?: string | null, evidenceUrl?: string | null, revoked: boolean, revokedAt?: string | null, revokedReason?: string | null, verifyUrl: string, shareUrl: string, vcDocument?: string | null }> };

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

export type UpdateCourseMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdateCourseInput;
}>;


export type UpdateCourseMutation = { __typename?: 'Mutation', updateCourse: { __typename?: 'Course', id: string, title: string, description?: string | null, thumbnailUrl?: string | null, estimatedHours?: number | null, isPublished: boolean, updatedAt: string } };

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


export type SearchSemanticQuery = { __typename?: 'Query', searchSemantic: Array<{ __typename?: 'SemanticResult', id: string, text: string, similarity: number, entityType: string, entityId: string }> };

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

export type LessonPipelineProgressSubscriptionVariables = Exact<{
  runId: Scalars['ID']['input'];
}>;


export type LessonPipelineProgressSubscription = { __typename?: 'Subscription', lessonPipelineProgress: { __typename?: 'LessonPipelineRun', id: string, status: RunStatus, completedAt?: string | null, results: Array<{ __typename?: 'LessonPipelineResult', id: string, moduleName: string, outputType: string, outputData?: unknown | null, fileUrl?: string | null }> } };

export type NotificationReceivedSubscriptionVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type NotificationReceivedSubscription = { __typename?: 'Subscription', notificationReceived: { __typename?: 'Notification', id: string, type: NotificationType, title: string, body: string, payload?: unknown | null, readAt?: string | null, createdAt: string } };
