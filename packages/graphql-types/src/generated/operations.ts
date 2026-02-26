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
};

export type AddMessageInput = {
  content: Scalars['String']['input'];
  messageType: MessageType;
  parentMessageId?: InputMaybe<Scalars['ID']['input']>;
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

export type BulkImportResult = {
  __typename?: 'BulkImportResult';
  created: Scalars['Int']['output'];
  errors: Array<Scalars['String']['output']>;
  failed: Scalars['Int']['output'];
  updated: Scalars['Int']['output'];
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

export type CourseProgress = {
  __typename?: 'CourseProgress';
  completedItems: Scalars['Int']['output'];
  courseId: Scalars['ID']['output'];
  percentComplete: Scalars['Float']['output'];
  totalItems: Scalars['Int']['output'];
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

export type CreateConceptInput = {
  definition: Scalars['String']['input'];
  name: Scalars['String']['input'];
  sourceIds?: InputMaybe<Array<Scalars['ID']['input']>>;
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

export type GenerateScimTokenInput = {
  description: Scalars['String']['input'];
  expiresInDays?: InputMaybe<Scalars['Int']['input']>;
};

export type GenerateScimTokenResult = {
  __typename?: 'GenerateScimTokenResult';
  rawToken: Scalars['String']['output'];
  token: ScimToken;
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

export type MediaAsset = {
  __typename?: 'MediaAsset';
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
  /** Add a message to a discussion */
  addMessage: DiscussionMessage;
  bulkImportUsers: BulkImportResult;
  cancelAgentExecution: AgentExecution;
  confirmMediaUpload: MediaAsset;
  createAgentTemplate: AgentTemplate;
  createAnnotation: Annotation;
  createAnnouncement: Announcement;
  createBadge: Badge;
  createConcept: Concept;
  createCourse: Course;
  /** Create a new discussion */
  createDiscussion: Discussion;
  createEmbedding: Embedding;
  createModule: Module;
  createPerson: Person;
  createReviewCard: SrsCard;
  createRole: Role;
  createSource: Source;
  createTerm: Term;
  createTopicCluster: TopicCluster;
  createUser: User;
  deactivateAgentTemplate: AgentTemplate;
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
  deleteModule: Scalars['Boolean']['output'];
  deleteRole: Scalars['Boolean']['output'];
  disconnectCrm: Scalars['Boolean']['output'];
  endSession: Scalars['Boolean']['output'];
  enrollCourse: UserCourse;
  exportAuditLog: AuditExportResult;
  followUser: Scalars['Boolean']['output'];
  generateEmbedding: Scalars['Boolean']['output'];
  generateScimToken: GenerateScimTokenResult;
  issueBadge: OpenBadgeAssertion;
  /** Join a discussion as a participant */
  joinDiscussion: Scalars['Boolean']['output'];
  /** Leave a discussion */
  leaveDiscussion: Scalars['Boolean']['output'];
  linkConcepts: ConceptRelationship;
  markContentViewed: Scalars['Boolean']['output'];
  publishAnnouncement: Announcement;
  publishCourse: Course;
  publishPortal: Scalars['Boolean']['output'];
  reorderModules: Array<Module>;
  replyToAnnotation: Annotation;
  resetUserPassword: Scalars['Boolean']['output'];
  resolveAnnotation: Annotation;
  revokeDelegation: Scalars['Boolean']['output'];
  revokeOpenBadge: Scalars['Boolean']['output'];
  revokeScimToken: Scalars['Boolean']['output'];
  savePortalLayout: PortalPage;
  scheduleGdprErasure: Scalars['Boolean']['output'];
  sendMessage: AgentMessage;
  startAgentExecution: AgentExecution;
  startAgentSession: AgentSession;
  submitReview: SrsCard;
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
  updateModule: Module;
  updateProfileVisibility: UserPreferences;
  updateRole: Role;
  updateSecuritySettings: SecuritySettings;
  updateTenantBranding: TenantBranding;
  updateTenantLanguageSettings: TenantLanguageSettings;
  updateUser: User;
  updateUserPreferences: User;
};


export type MutationActivateAgentTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationAddMessageArgs = {
  discussionId: Scalars['ID']['input'];
  input: AddMessageInput;
};


export type MutationBulkImportUsersArgs = {
  csvData: Scalars['String']['input'];
};


export type MutationCancelAgentExecutionArgs = {
  id: Scalars['ID']['input'];
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


export type MutationCreateBadgeArgs = {
  input: CreateBadgeInput;
};


export type MutationCreateConceptArgs = {
  input: CreateConceptInput;
};


export type MutationCreateCourseArgs = {
  input: CreateCourseInput;
};


export type MutationCreateDiscussionArgs = {
  input: CreateDiscussionInput;
};


export type MutationCreateEmbeddingArgs = {
  input: CreateEmbeddingInput;
};


export type MutationCreateModuleArgs = {
  input: CreateModuleInput;
};


export type MutationCreatePersonArgs = {
  input: CreatePersonInput;
};


export type MutationCreateReviewCardArgs = {
  conceptName: Scalars['String']['input'];
};


export type MutationCreateRoleArgs = {
  input: CreateRoleInput;
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


export type MutationDeleteModuleArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteRoleArgs = {
  id: Scalars['ID']['input'];
};


export type MutationEndSessionArgs = {
  sessionId: Scalars['ID']['input'];
};


export type MutationEnrollCourseArgs = {
  courseId: Scalars['ID']['input'];
};


export type MutationExportAuditLogArgs = {
  format: AuditExportFormat;
  fromDate: Scalars['String']['input'];
  toDate: Scalars['String']['input'];
};


export type MutationFollowUserArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationGenerateEmbeddingArgs = {
  entityId: Scalars['ID']['input'];
  entityType: Scalars['String']['input'];
  text: Scalars['String']['input'];
};


export type MutationGenerateScimTokenArgs = {
  input: GenerateScimTokenInput;
};


export type MutationIssueBadgeArgs = {
  badgeDefinitionId: Scalars['ID']['input'];
  evidenceUrl?: InputMaybe<Scalars['String']['input']>;
  recipientId: Scalars['ID']['input'];
};


export type MutationJoinDiscussionArgs = {
  discussionId: Scalars['ID']['input'];
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


export type MutationReorderModulesArgs = {
  courseId: Scalars['ID']['input'];
  moduleIds: Array<Scalars['ID']['input']>;
};


export type MutationReplyToAnnotationArgs = {
  annotationId: Scalars['ID']['input'];
  content: Scalars['String']['input'];
};


export type MutationResetUserPasswordArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationResolveAnnotationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRevokeDelegationArgs = {
  delegationId: Scalars['ID']['input'];
};


export type MutationRevokeOpenBadgeArgs = {
  assertionId: Scalars['ID']['input'];
  reason: Scalars['String']['input'];
};


export type MutationRevokeScimTokenArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSavePortalLayoutArgs = {
  blocksJson: Scalars['String']['input'];
  title: Scalars['String']['input'];
};


export type MutationScheduleGdprErasureArgs = {
  userId: Scalars['ID']['input'];
};


export type MutationSendMessageArgs = {
  content: Scalars['String']['input'];
  sessionId: Scalars['ID']['input'];
};


export type MutationStartAgentExecutionArgs = {
  input: StartAgentExecutionInput;
};


export type MutationStartAgentSessionArgs = {
  context: Scalars['JSON']['input'];
  templateType: TemplateType;
};


export type MutationSubmitReviewArgs = {
  cardId: Scalars['ID']['input'];
  quality: Scalars['Int']['input'];
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


export type MutationUpdateModuleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateModuleInput;
};


export type MutationUpdateProfileVisibilityArgs = {
  isPublic: Scalars['Boolean']['input'];
};


export type MutationUpdateRoleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateRoleInput;
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

export type Notification = {
  __typename?: 'Notification';
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  payload?: Maybe<Scalars['JSON']['output']>;
  readAt?: Maybe<Scalars['DateTime']['output']>;
  title: Scalars['String']['output'];
  type: NotificationType;
};

export enum NotificationType {
  Announcement = 'ANNOUNCEMENT',
  BadgeIssued = 'BADGE_ISSUED',
  CourseEnrolled = 'COURSE_ENROLLED',
  SrsReviewDue = 'SRS_REVIEW_DUE',
  UserFollowed = 'USER_FOLLOWED'
}

export type OpenBadgeAssertion = {
  __typename?: 'OpenBadgeAssertion';
  badgeDefinitionId: Scalars['ID']['output'];
  definition: OpenBadgeDefinition;
  evidenceUrl?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  issuedAt: Scalars['String']['output'];
  recipientId: Scalars['ID']['output'];
  revoked: Scalars['Boolean']['output'];
  revokedAt?: Maybe<Scalars['String']['output']>;
  revokedReason?: Maybe<Scalars['String']['output']>;
  vcDocument: Scalars['String']['output'];
};

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
  concept?: Maybe<Concept>;
  conceptByName?: Maybe<Concept>;
  concepts: Array<Concept>;
  contentItem?: Maybe<ContentItem>;
  contentItemsByModule: Array<ContentItem>;
  course?: Maybe<Course>;
  courses: Array<Course>;
  coursesByInstructor: Array<Course>;
  crmConnection?: Maybe<CrmConnection>;
  crmSyncLog: Array<CrmSyncLogEntry>;
  /** Returns the next unviewed MICROLESSON for the authenticated user today. */
  dailyMicrolesson?: Maybe<ContentItem>;
  /** Get a single discussion by ID */
  discussion?: Maybe<Discussion>;
  /** Get all messages in a discussion */
  discussionMessages: Array<DiscussionMessage>;
  /** Get all discussions for a course */
  discussions: Array<Discussion>;
  dueReviews: Array<SrsCard>;
  embedding?: Maybe<Embedding>;
  embeddingsByContentItem: Array<Embedding>;
  getPresignedUploadUrl: PresignedUploadUrl;
  leaderboard: Array<LeaderboardEntry>;
  /**
   * Find the shortest learning path between two concepts identified by name.
   * Returns null when no path exists between the two concepts.
   * Uses Apache AGE shortestPath() traversing RELATED_TO and PREREQUISITE_OF edges.
   */
  learningPath?: Maybe<LearningPath>;
  me?: Maybe<User>;
  /** Lists all microlearning paths for the authenticated user's tenant. */
  microlearningPaths: Array<MicrolearningPath>;
  module?: Maybe<Module>;
  modulesByCourse: Array<Module>;
  myAgentSessions: Array<AgentSession>;
  myBadges: Array<UserBadge>;
  myCourseProgress: CourseProgress;
  /** Get all discussions the current user has participated in */
  myDiscussions: Array<Discussion>;
  myEnrollments: Array<UserCourse>;
  myFollowers: Array<Scalars['ID']['output']>;
  myFollowing: Array<Scalars['ID']['output']>;
  myOpenBadges: Array<OpenBadgeAssertion>;
  myPortal?: Maybe<PortalPage>;
  myRank: Scalars['Int']['output'];
  mySecuritySettings: SecuritySettings;
  myStats: UserStats;
  myTenantBranding: TenantBranding;
  myTenantLanguageSettings: TenantLanguageSettings;
  myTotalPoints: Scalars['Int']['output'];
  person?: Maybe<Person>;
  personByName?: Maybe<Person>;
  /**
   * Find the deepest prerequisite chain leading into a named concept.
   * Returns nodes ordered from root prerequisite to the target concept.
   */
  prerequisiteChain: Array<ConceptNode>;
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
  scimSyncLog: Array<ScimSyncEntry>;
  scimTokens: Array<ScimToken>;
  searchSemantic: Array<SemanticResult>;
  semanticSearch: Array<SimilarityResult>;
  semanticSearchByContentItem: Array<SimilarityResult>;
  source?: Maybe<Source>;
  srsQueueCount: Scalars['Int']['output'];
  tenant?: Maybe<Tenant>;
  tenants: Array<Tenant>;
  term?: Maybe<Term>;
  termByName?: Maybe<Term>;
  topicCluster?: Maybe<TopicCluster>;
  topicClustersByCourse: Array<TopicCluster>;
  user?: Maybe<User>;
  userDelegations: Array<RoleDelegation>;
  users: Array<User>;
  verifyOpenBadge: Scalars['Boolean']['output'];
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


export type QueryCourseArgs = {
  id: Scalars['ID']['input'];
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


export type QueryGetPresignedUploadUrlArgs = {
  contentType: Scalars['String']['input'];
  courseId: Scalars['ID']['input'];
  fileName: Scalars['String']['input'];
};


export type QueryLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryLearningPathArgs = {
  from: Scalars['String']['input'];
  to: Scalars['String']['input'];
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


export type QueryPersonArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPersonByNameArgs = {
  name: Scalars['String']['input'];
};


export type QueryPrerequisiteChainArgs = {
  conceptName: Scalars['String']['input'];
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


export type QuerySourceArgs = {
  id: Scalars['ID']['input'];
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


export type QueryVerifyOpenBadgeArgs = {
  assertionId: Scalars['ID']['input'];
};

export type RelatedConcept = {
  __typename?: 'RelatedConcept';
  concept: Concept;
  strength: Scalars['Float']['output'];
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

export type SimilarityResult = {
  __typename?: 'SimilarityResult';
  distance: Scalars['Float']['output'];
  embedding: Embedding;
  similarity: Scalars['Float']['output'];
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
  /** Subscribe to new messages in a discussion */
  messageAdded: DiscussionMessage;
  messageStream: AgentMessage;
  /** Real-time notification stream for a user */
  notificationReceived: Notification;
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


export type SubscriptionMessageAddedArgs = {
  discussionId: Scalars['ID']['input'];
};


export type SubscriptionMessageStreamArgs = {
  sessionId: Scalars['ID']['input'];
};


export type SubscriptionNotificationReceivedArgs = {
  userId: Scalars['ID']['input'];
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

export type TopicCluster = {
  __typename?: 'TopicCluster';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  tenantId: Scalars['ID']['output'];
  updatedAt: Scalars['String']['output'];
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
  id: Scalars['ID']['output'];
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


export type MyOpenBadgesQuery = { __typename?: 'Query', myOpenBadges: Array<{ __typename?: 'OpenBadgeAssertion', id: string, badgeDefinitionId: string, recipientId: string, issuedAt: string, expiresAt?: string | null, evidenceUrl?: string | null, revoked: boolean, revokedAt?: string | null, revokedReason?: string | null, vcDocument: string, definition: { __typename?: 'OpenBadgeDefinition', id: string, name: string, description: string, imageUrl?: string | null, criteriaUrl?: string | null, tags: Array<string>, issuerId: string, createdAt: string } }> };

export type VerifyOpenBadgeQueryVariables = Exact<{
  assertionId: Scalars['ID']['input'];
}>;


export type VerifyOpenBadgeQuery = { __typename?: 'Query', verifyOpenBadge: boolean };

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

export type NotificationReceivedSubscriptionVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type NotificationReceivedSubscription = { __typename?: 'Subscription', notificationReceived: { __typename?: 'Notification', id: string, type: NotificationType, title: string, body: string, payload?: unknown | null, readAt?: string | null, createdAt: string } };
