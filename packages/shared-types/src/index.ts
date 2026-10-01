// ============================================================================
// DATA-CHAN: Shared Domain Types
// ============================================================================

export type ErrorCode =
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'RESOURCE_NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'INVALID_QUERY'
  | 'UNSUPPORTED_OPERATION'
  | 'INVALID_COLLECTION'
  | 'QUERY_LIMIT_EXCEEDED'
  | 'DATASET_LIMIT_EXCEEDED'
  | 'EXECUTION_TIMEOUT'
  | 'CHALLENGE_FAILED'
  | 'INTERNAL_ERROR';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
  } | null;
}

// ----------------------------------------------------------------------------
// User & Auth
// ----------------------------------------------------------------------------
export type UserRole = 'student' | 'faculty' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'disabled';

export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  username: string;
  role: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
  displayName?: string;
  photoUrl?: string;
  activeWorkspaceId?: string;
  activeDatabaseId?: string;
  activeCollectionName?: string;
  themePreference?: ThemeId;
  enrolledClassroomIds?: string[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserProfile extends User {
  xp: number;
  level: number;
  streakDays: number;
  lessonsCompletedCount: number;
  challengesSolvedCount: number;
  queriesExecutedCount: number;
  activeDatabasesCount: number;
  skills: SkillProgress[];
  achievements: AchievementBadge[];
}

export interface SkillProgress {
  skillId: string;
  name: string;
  level: number;
  progressPercent: number; // 0 - 100
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

// ----------------------------------------------------------------------------
// Workspaces & Virtual Databases
// ----------------------------------------------------------------------------
export interface Workspace {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  databasesCount?: number;
}

export interface VirtualDatabase {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  physicalNamespace: string; // dc_<workspaceId>_<databaseId>
  description?: string;
  createdAt: string;
  updatedAt: string;
  collectionsCount?: number;
  totalDocumentsCount?: number;
}

export interface DatabaseStats {
  databaseId: string;
  collectionsCount: number;
  documentsCount: number;
  storageSizeBytes: number;
}

// ----------------------------------------------------------------------------
// Collections & Documents & Schema Advisor
// ----------------------------------------------------------------------------
export interface CollectionIndexInfo {
  name: string;
  key: Record<string, number | string>;
  unique?: boolean;
}

export interface SchemaRecommendation {
  type: 'warning' | 'info' | 'optimization';
  field?: string;
  message: string;
}

export interface DetectedFieldInfo {
  name: string;
  types: string[]; // e.g., ["String", "Number"]
  isArray: boolean;
  isObject: boolean;
  isObjectId: boolean;
  isPolymorphic?: boolean;
  isIndexed?: boolean;
  presencePercent: number; // 0 - 100
  exampleValue: any;
}

export interface CollectionMetadata {
  name: string;
  databaseId: string;
  documentsCount: number;
  avgDocumentSizeBytes?: number;
  totalSizeBytes?: number;
  indexesCount?: number;
  indexes?: CollectionIndexInfo[];
  detectedFields?: DetectedFieldInfo[];
  recommendations?: SchemaRecommendation[];
}

export interface DocumentItem {
  _id: string;
  [key: string]: any;
}

// ----------------------------------------------------------------------------
// Classrooms & Academic Cohorts
// ----------------------------------------------------------------------------
export interface Classroom {
  id: string;
  code: string;
  name: string;
  facultyId: string;
  facultyName: string;
  description?: string;
  enrolledStudentIds: string[];
  enrolledStudentsCount?: number;
  assignedChallengeIds?: string[];
  syllabusLessonIds?: string[];
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// MQL Querying & MongoDB Playground
// ----------------------------------------------------------------------------
export type SupportedMqlOperation =
  | 'find'
  | 'findOne'
  | 'insertOne'
  | 'insertMany'
  | 'updateOne'
  | 'updateMany'
  | 'deleteOne'
  | 'deleteMany'
  | 'aggregate'
  | 'countDocuments';

export interface NormalizedQuery {
  operation: SupportedMqlOperation;
  databaseId: string;
  collection: string;
  filter?: Record<string, any>;
  projection?: Record<string, any>;
  sort?: Record<string, any>;
  limit?: number;
  skip?: number;
  update?: Record<string, any>;
  document?: Record<string, any>;
  documents?: Record<string, any>[];
  pipeline?: Record<string, any>[];
}

export interface ExecutionStats {
  durationMs: number;
  documentsReturned: number;
  documentsAffected?: number;
  executionPlanSummary?: string;
  isTruncated: boolean;
}

export interface QueryResult {
  operation: SupportedMqlOperation;
  collection: string;
  data: any;
  stats: ExecutionStats;
  breakdown?: QuerySyntaxBreakdownItem[];
}

export interface QuerySyntaxBreakdownItem {
  token: string;
  category: 'Target' | 'Operation' | 'Filter' | 'Projection' | 'Stage' | 'Cursor' | 'Operator';
  description: string;
}

export interface QueryHistoryItem {
  id: string;
  userId: string;
  workspaceId: string;
  databaseId: string;
  collection: string;
  rawQuery: string;
  operation: SupportedMqlOperation;
  durationMs: number;
  executionTimeMs?: number;
  documentsReturned: number;
  documentsCount?: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  timestamp: string;
}

// ----------------------------------------------------------------------------
// Learning Mode
// ----------------------------------------------------------------------------
export interface Lesson {
  id: string;
  order: number;
  title: string;
  category: string;
  estimatedMinutes: number;
  xpReward: number;
  description: string;
  conceptMarkdown: string;
  exampleQuery: string;
  starterPracticeQuery: string;
  practiceCollection: string;
  practiceExplanation: string;
  practiceExpectedFilter?: Record<string, any>;
  completed?: boolean;
}

export interface LessonProgress {
  lessonId: string;
  userId: string;
  completed: boolean;
  completedAt?: string;
  attemptsCount: number;
}

// ----------------------------------------------------------------------------
// Challenge System
// ----------------------------------------------------------------------------
export type ChallengeDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface Challenge {
  id: string;
  title: string;
  difficulty: ChallengeDifficulty;
  category: string;
  xpReward: number;
  estimatedMinutes: number;
  problemStatement: string;
  contextDescription: string;
  targetCollection: string;
  starterQuery: string;
  hints: string[];
  datasetDescription: string;
  verificationType: 'deterministic-documents' | 'deterministic-count' | 'custom-rule';
}

export interface ChallengeAttempt {
  id: string;
  userId: string;
  challengeId: string;
  query: string;
  passed: boolean;
  feedback: string;
  executionMs: number;
  createdAt: string;
}

export interface ChallengeEvaluationResult {
  passed: boolean;
  score: number;
  feedback: string;
  expectedDocumentsCount?: number;
  actualDocumentsCount?: number;
  details?: {
    matchedFields: string[];
    mismatches?: string[];
  };
  xpEarned?: number;
}

// ----------------------------------------------------------------------------
// ER / Data Model Builder
// ----------------------------------------------------------------------------
export type FieldDataType =
  | 'String'
  | 'Number'
  | 'Boolean'
  | 'Date'
  | 'ObjectId'
  | 'Array'
  | 'Object'
  | 'Decimal128';

export interface ModelField {
  id: string;
  name: string;
  type: FieldDataType;
  isRequired: boolean;
  isUnique?: boolean;
  isIndex?: boolean;
  defaultValue?: string;
  nestedFields?: ModelField[];
}

export interface ModelEntity {
  id: string;
  name: string;
  isEmbedded?: boolean;
  color?: string;
  position: { x: number; y: number };
  fields: ModelField[];
}

export type RelationshipCardinality = '1:1' | '1:N' | 'N:M';
export type RelationshipStrategy = 'embedded' | 'referenced';

export interface ModelRelationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  cardinality: RelationshipCardinality;
  strategy: RelationshipStrategy;
  sourceField?: string;
  targetField?: string;
}

export interface DataModel {
  id: string;
  userId: string;
  name: string;
  description?: string;
  entities: ModelEntity[];
  relationships: ModelRelationship[];
  createdAt: string;
  updatedAt: string;
}

export interface DesignFeedbackItem {
  id: string;
  type: 'correct' | 'consideration' | 'problem';
  message: string;
  entityName?: string;
  suggestion?: string;
}

export interface GeneratedMongoStructure {
  collections: {
    name: string;
    schemaValidation?: Record<string, any>;
    indexes?: string[];
    sampleDocument: Record<string, any>;
  }[];
}

// ----------------------------------------------------------------------------
// Theme System
// ----------------------------------------------------------------------------
export type ThemeId =
  | 'lavender-light'
  | 'midnight-dark'
  | 'ocean-blue'
  | 'mint-lab'
  | 'sunset-amber'
  | 'light-neutral'
  | 'light-ocean'
  | 'light-violet'
  | 'light-mint'
  | 'light-amber'
  | 'dark-neutral'
  | 'dark-ocean'
  | 'dark-violet'
  | 'dark-mint'
  | 'dark-amber';

export type ThemeMode = 'light' | 'dark';
export type ColorPaletteId = 'neutral' | 'ocean' | 'violet' | 'mint' | 'amber';

export interface PaletteSwatches {
  background: string;
  surface: string;
  accent: string;
  text: string;
}

export interface PaletteOption {
  id: ColorPaletteId;
  name: string;
  description: string;
  swatches: {
    light: PaletteSwatches;
    dark: PaletteSwatches;
  };
}

export interface ThemeOption {
  id: ThemeId;
  name: string;
  category: 'light' | 'dark';
  primaryHex: string;
  backgroundHex: string;
  surfaceHex: string;
}

// ----------------------------------------------------------------------------
// Forum & Community Discussions
// ----------------------------------------------------------------------------
export type ForumCategory =
  | 'general'
  | 'queries'
  | 'schema-design'
  | 'aggregation'
  | 'performance'
  | 'challenges'
  | 'announcements';

export interface ForumReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  content: string;
  codeSnippet?: string;
  codeLanguage?: string;
  upvotes: number;
  upvotedBy: string[];
  isUpvoted?: boolean;
  isAcceptedSolution?: boolean;
  isAcceptedAnswer?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  codeSnippet?: string;
  codeLanguage?: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  category: ForumCategory;
  tags: string[];
  upvotes: number;
  upvotedBy: string[];
  replyCount: number;
  views: number;
  isPinned?: boolean;
  isSolved?: boolean;
  isUpvoted?: boolean;
  replies?: ForumReply[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateForumPostDto {
  title: string;
  content: string;
  category: ForumCategory;
  tags: string[];
  codeSnippet?: string;
  codeLanguage?: string;
}

export interface CreateForumReplyDto {
  content: string;
  codeSnippet?: string;
  codeLanguage?: string;
}

export interface ForumStats {
  totalPosts: number;
  totalReplies: number;
  totalContributors: number;
  solvedCount?: number;
  topTags: { tag: string; count: number }[];
}


