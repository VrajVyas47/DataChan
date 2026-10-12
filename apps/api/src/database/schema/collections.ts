/**
 * DATA-CHAN V1 Canonical Database Collections Definition
 * 
 * Defines the 14 canonical collections for the platform database (`datachan_platform`),
 * along with their typescript interfaces and canonical constants.
 */

export const PLATFORM_COLLECTIONS = {
  USERS: 'users',
  WORKSPACES: 'workspaces',
  VIRTUAL_DATABASES: 'virtual_databases',
  CLASSROOMS: 'classrooms',
  CLASSROOM_MEMBERS: 'classroom_members',
  COHORT_ASSIGNMENTS: 'cohort_assignments',
  COURSES: 'courses',
  MODULES: 'modules',
  LESSONS: 'lessons',
  LESSON_SECTIONS: 'lesson_sections',
  PRACTICALS: 'practicals',
  LEARNING_PROGRESS: 'learning_progress',
  CHALLENGES: 'challenges',
  CHALLENGE_ATTEMPTS: 'challenge_attempts',
  QUERY_HISTORY: 'query_history',
  DATA_MODELS: 'data_models',
  FORUM_POSTS: 'forum_posts',
  SECURITY_AUDIT_LOGS: 'security_audit_logs',
} as const;

export type PlatformCollectionName =
  (typeof PLATFORM_COLLECTIONS)[keyof typeof PLATFORM_COLLECTIONS];

// ============================================================================
// Canonical Document Interfaces
// ============================================================================

export interface CanonicalUser {
  id: string;
  firebaseUid: string;
  email: string;
  username: string;
  displayName: string;
  role: 'student' | 'faculty' | 'admin';
  status: 'active' | 'suspended' | 'disabled';
  emailVerified?: boolean;
  photoUrl?: string;
  activeWorkspaceId?: string | null;
  activeDatabaseId?: string | null;
  activeCollectionName?: string | null;
  xp?: number;
  level?: number;
  streakDays?: number;
  enrolledClassroomIds?: string[];
  claimedRewardKeys?: string[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface CanonicalWorkspace {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalVirtualDatabase {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  physicalDatabaseName: string;
  physicalNamespace?: string; // Backwards compatibility alias
  status: 'active' | 'archived' | 'deleted';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalClassroom {
  id: string;
  facultyId: string;
  code: string;
  name: string;
  description?: string;
  facultyName?: string;
  status: 'active' | 'archived';
  enrolledStudentIds?: string[]; // Backwards compatibility projection
  /** @deprecated Legacy orphaned field. Authoritative delivery uses cohort_assignments collection. */
  assignedChallengeIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalClassroomMember {
  classroomId: string;
  userId: string;
  role: 'student';
  status: 'active' | 'removed';
  enrolledAt: string;
}

export interface CanonicalCohortAssignment {
  id: string;
  classroomId: string;
  targetType: 'lesson' | 'challenge';
  targetId: string;
  assignedBy: string;
  dueDate?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalPractical {
  id: string;
  number: number;
  title: string;
  category: string;
  description: string;
  xpReward: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalCourse {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  order?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalModule {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalContentBlock {
  id?: string;
  type: 'text' | 'code' | 'output' | 'note' | 'image' | 'example' | 'playground';
  order: number;
  content: string;
  language?: string;
  caption?: string;
  altText?: string;
  playgroundQuery?: string;
  targetCollection?: string;
}

export interface CanonicalLessonSection {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  order: number;
  contentBlocks: CanonicalContentBlock[];
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalLesson {
  id: string;
  moduleId?: string;
  courseId?: string;
  practicalId?: string;
  challengeIds?: string[];
  order: number;
  title: string;
  category: string;
  estimatedMinutes: number;
  xpReward: number;
  description: string;
  conceptMarkdown?: string;
  exampleQuery?: string;
  starterPracticeQuery?: string;
  practiceCollection?: string;
  practiceExplanation?: string;
  status?: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalLearningProgress {
  userId: string;
  lessonId?: string;
  practicalId?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedSectionIds?: string[];
  progressPercent?: number;
  attempts: number;
  bestScore: number;
  xpEarned: number;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface CanonicalChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'beginner' | 'intermediate' | 'advanced';
  type: string;
  requirements?: Record<string, any>;
  category?: string;
  xpReward: number;
  estimatedMinutes?: number;
  problemStatement?: string;
  contextDescription?: string;
  targetCollection: string;
  starterQuery?: string;
  hints?: string[];
  datasetDescription?: string;
  verificationType?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalChallengeAttempt {
  id?: string;
  userId: string;
  challengeId: string;
  query?: string;
  submission?: Record<string, any>;
  score?: number;
  passed: boolean;
  feedback?: any;
  attemptNumber?: number;
  executionMs?: number;
  createdAt: string;
}

export interface CanonicalQueryHistory {
  userId: string;
  databaseId: string;
  operation: string;
  queryText: string;
  rawQuery?: string;
  executionTimeMs: number;
  resultCount: number;
  documentsReturned?: number;
  status: 'success' | 'error' | 'timeout';
  errorCode?: string | null;
  errorMessage?: string;
  collection?: string;
  createdAt: string;
}

export interface CanonicalDataModel {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  description?: string;
  nodes?: any[];
  edges?: any[];
  entities?: any[];
  relationships?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalForumPost {
  id: string;
  title: string;
  content: string;
  category: string;
  authorId: string;
  authorName?: string;
  authorRole?: string;
  tags?: string[];
  upvotes?: number;
  replyCount?: number;
  views?: number;
  isPinned?: boolean;
  isSolved?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalSecurityAuditLog {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  method?: string;
  path?: string;
  outcome: 'success' | 'denied' | 'failure';
  ipAddress?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  timestamp?: string; // Backwards compatibility alias
}
