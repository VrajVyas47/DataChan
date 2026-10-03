import {
  ApiResponse,
  UserProfile,
  Workspace,
  VirtualDatabase,
  CollectionMetadata,
  DocumentItem,
  QueryResult,
  QueryHistoryItem,
  QuerySyntaxBreakdownItem,
  Lesson,
  Course,
  Module,
  LessonSection,
  ContentBlock,
  Challenge,
  ChallengeEvaluationResult,
  DataModel,
  DesignFeedbackItem,
  GeneratedMongoStructure,
  ImportDatabaseResult,
  ApplyStructureResult,
  ModelEntity,
  ThemeId,
  ForumPost,
  ForumReply,
  CreateForumPostDto,
  CreateForumReplyDto,
  ForumStats,
  ForumCategory,
  Classroom,
  CohortAssignment,
  CreateCohortAssignmentDto,
} from '@datachan/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

class ApiClient {
  private cachedUser: UserProfile | null = null;
  private pendingUserPromise: Promise<UserProfile> | null = null;

  constructor() {
    // Purge any legacy insecure token storage from previous implementations
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('datachan_token');
        localStorage.removeItem('datachan_auth_token');
        localStorage.removeItem('datachan_dev_user');
        localStorage.removeItem('datachan_user_id');
      } catch {
        // Ignore storage access errors
      }
    }
  }

  public getCachedUser(): UserProfile | null {
    return this.cachedUser;
  }

  public async createSession(idToken: string, displayName?: string): Promise<{ user: any }> {
    const res = await fetch(`${API_BASE}/auth/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
      body: JSON.stringify({ idToken, displayName }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || 'Failed to establish laboratory session');
    }

    this.cachedUser = json.data?.user || null;
    return json.data;
  }

  public async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
      });
    } catch {
      // Ignore network failures on logout
    } finally {
      this.cachedUser = null;
      this.pendingUserPromise = null;
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Always send and receive HttpOnly cookies
    });

    // 1. Handle 401 Unauthorized (Expired or missing session)
    if (res.status === 401) {
      this.cachedUser = null;
      this.pendingUserPromise = null;
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/' && !currentPath.startsWith('/forum')) {
          window.dispatchEvent(new CustomEvent('datachan_unauthorized'));
        }
      }
      throw new Error('Authentication required. Session may have expired.');
    }

    // 2. Handle 403 Forbidden (Insufficient role or permissions)
    if (res.status === 403) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error?.message || 'Access restricted. Insufficient privileges.');
    }

    const json: ApiResponse<T> = await res.json();
    if (!json.success) {
      throw new Error(json.error?.message || 'API request failed');
    }

    return json.data as T;
  }

  // --- Auth & User ---
  async getMe(forceRefresh: boolean = false): Promise<UserProfile> {
    if (this.cachedUser && !forceRefresh) {
      return this.cachedUser;
    }

    if (this.pendingUserPromise && !forceRefresh) {
      return this.pendingUserPromise;
    }

    this.pendingUserPromise = this.request<UserProfile>('/auth/me')
      .then((profile) => {
        this.cachedUser = profile;
        this.pendingUserPromise = null;
        return profile;
      })
      .catch((err) => {
        this.cachedUser = null;
        this.pendingUserPromise = null;
        throw err;
      });

    return this.pendingUserPromise;
  }

  async syncUser(updates: {
    displayName?: string;
    themePreference?: ThemeId;
    activeWorkspaceId?: string;
    activeDatabaseId?: string;
  }): Promise<any> {
    const updated = await this.request('/auth/sync', {
      method: 'POST',
      body: JSON.stringify(updates),
    });
    if (this.cachedUser) {
      this.cachedUser = { ...this.cachedUser, ...updates };
    }
    return updated;
  }

  // --- Workspaces ---
  async listWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>('/workspaces');
  }

  async createWorkspace(name: string, description?: string): Promise<Workspace> {
    return this.request<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async getWorkspace(id: string): Promise<Workspace> {
    return this.request<Workspace>(`/workspaces/${id}`);
  }

  async deleteWorkspace(id: string): Promise<any> {
    return this.request(`/workspaces/${id}`, { method: 'DELETE' });
  }

  // --- Virtual Databases ---
  async listDatabases(workspaceId?: string): Promise<VirtualDatabase[]> {
    const query = workspaceId ? `?workspaceId=${workspaceId}` : '';
    return this.request<VirtualDatabase[]>(`/databases${query}`);
  }

  async createDatabase(name: string, workspaceId: string, description?: string): Promise<VirtualDatabase> {
    return this.request<VirtualDatabase>('/databases', {
      method: 'POST',
      body: JSON.stringify({ name, workspaceId, description }),
    });
  }

  async getDatabase(id: string): Promise<VirtualDatabase> {
    return this.request<VirtualDatabase>(`/databases/${id}`);
  }

  async deleteDatabase(id: string): Promise<any> {
    return this.request(`/databases/${id}`, { method: 'DELETE' });
  }

  // --- Collections ---
  async listCollections(databaseId: string): Promise<CollectionMetadata[]> {
    return this.request<CollectionMetadata[]>(`/databases/${databaseId}/collections`);
  }

  async createCollection(databaseId: string, name: string): Promise<CollectionMetadata> {
    return this.request<CollectionMetadata>(`/databases/${databaseId}/collections`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async inspectCollection(databaseId: string, name: string): Promise<CollectionMetadata> {
    return this.request<CollectionMetadata>(`/databases/${databaseId}/collections/${name}`);
  }

  async deleteCollection(databaseId: string, name: string): Promise<any> {
    return this.request(`/databases/${databaseId}/collections/${name}`, {
      method: 'DELETE',
    });
  }

  // --- Documents (CRUD) ---
  async getDocuments(
    databaseId: string,
    collectionName: string,
    page = 1,
    limit = 50,
    search?: string
  ): Promise<{
    documents: DocumentItem[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    let url = `/databases/${databaseId}/collections/${collectionName}/documents?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return this.request(url);
  }

  async insertDocument(
    databaseId: string,
    collectionName: string,
    document: Record<string, any>
  ): Promise<DocumentItem> {
    return this.request<DocumentItem>(
      `/databases/${databaseId}/collections/${collectionName}/documents`,
      {
        method: 'POST',
        body: JSON.stringify(document),
      }
    );
  }

  async updateDocument(
    databaseId: string,
    collectionName: string,
    docId: string,
    update: Record<string, any>
  ): Promise<DocumentItem> {
    return this.request<DocumentItem>(
      `/databases/${databaseId}/collections/${collectionName}/documents/${docId}`,
      {
        method: 'PUT',
        body: JSON.stringify(update),
      }
    );
  }

  async deleteDocument(databaseId: string, collectionName: string, docId: string): Promise<any> {
    return this.request(
      `/databases/${databaseId}/collections/${collectionName}/documents/${docId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // --- Playground ---
  async executePlaygroundQuery(
    databaseId: string,
    collection: string,
    rawQuery: string,
    normalizedQuery?: any
  ): Promise<QueryResult> {
    return this.request<QueryResult>('/playground/query', {
      method: 'POST',
      body: JSON.stringify({ databaseId, collection, rawQuery, normalizedQuery }),
    });
  }

  async analyzePlaygroundQuery(
    rawQuery: string,
    databaseId?: string,
    collection?: string
  ): Promise<{ breakdown: QuerySyntaxBreakdownItem[]; normalized: any; error: string | null }> {
    return this.request<{ breakdown: QuerySyntaxBreakdownItem[]; normalized: any; error: string | null }>(
      '/playground/analyze',
      {
        method: 'POST',
        body: JSON.stringify({ rawQuery, databaseId, collection }),
      }
    );
  }

  async getPlaygroundStatus(): Promise<{
    serverVersion: string;
    storageEngine: string;
    status: string;
    limits: {
      maxQueryExecutionMs: number;
      maxResultDocuments: number;
      maxDocumentSizeBytes: number;
    };
  }> {
    return this.request('/playground/status');
  }

  // --- Query History ---
  async getQueryHistory(limit = 20): Promise<QueryHistoryItem[]> {
    return this.request<QueryHistoryItem[]>(`/query-history?limit=${limit}`);
  }

  async clearQueryHistory(): Promise<any> {
    return this.request('/query-history', { method: 'DELETE' });
  }

  // --- Learning: Courses ---
  async listCourses(status?: string): Promise<Course[]> {
    const q = status ? `?status=${status}` : '';
    return this.request<Course[]>(`/courses${q}`);
  }

  async getCourse(id: string): Promise<Course> {
    return this.request<Course>(`/courses/${id}`);
  }

  async createCourse(data: { title: string; description: string; status?: 'draft' | 'published'; order?: number }): Promise<Course> {
    return this.request<Course>('/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCourse(id: string, data: Partial<Course>): Promise<Course> {
    return this.request<Course>(`/courses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCourse(id: string): Promise<{ deleted: boolean; id: string }> {
    return this.request(`/courses/${id}`, { method: 'DELETE' });
  }

  // --- Learning: Modules ---
  async listModules(courseId?: string, status?: string): Promise<Module[]> {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    if (status) params.append('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<Module[]>(`/modules${qs}`);
  }

  async getModule(id: string): Promise<Module> {
    return this.request<Module>(`/modules/${id}`);
  }

  async createModule(data: { courseId: string; title: string; description?: string; status?: 'draft' | 'published'; order?: number }): Promise<Module> {
    return this.request<Module>('/modules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateModule(id: string, data: Partial<Module>): Promise<Module> {
    return this.request<Module>(`/modules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteModule(id: string): Promise<{ deleted: boolean; id: string }> {
    return this.request(`/modules/${id}`, { method: 'DELETE' });
  }

  async reorderModules(items: { id: string; order: number }[]): Promise<any> {
    return this.request('/modules/reorder', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  // --- Learning: Lessons ---
  async listLessons(moduleId?: string, courseId?: string, status?: string): Promise<Lesson[]> {
    const params = new URLSearchParams();
    if (moduleId) params.append('moduleId', moduleId);
    if (courseId) params.append('courseId', courseId);
    if (status) params.append('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<Lesson[]>(`/lessons${qs}`);
  }

  async getLesson(id: string): Promise<Lesson> {
    return this.request<Lesson>(`/lessons/${id}`);
  }

  async createLesson(data: Partial<Lesson>): Promise<Lesson> {
    return this.request<Lesson>('/lessons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLesson(id: string, data: Partial<Lesson>): Promise<Lesson> {
    return this.request<Lesson>(`/lessons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteLesson(id: string): Promise<{ deleted: boolean; id: string }> {
    return this.request(`/lessons/${id}`, { method: 'DELETE' });
  }

  async reorderLessons(items: { id: string; order: number }[]): Promise<any> {
    return this.request('/lessons/reorder', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  async completeLesson(id: string): Promise<{ completed: boolean; xpAwarded: number }> {
    return this.request(`/lessons/${id}/complete`, { method: 'POST' });
  }

  async runPractical(
    lessonId: string,
    rawQuery: string,
    databaseId?: string
  ): Promise<any> {
    return this.request('/lessons/run-practical', {
      method: 'POST',
      body: JSON.stringify({ lessonId, rawQuery, databaseId }),
    });
  }

  // --- Learning: Sections ---
  async listSections(lessonId?: string, status?: string): Promise<(LessonSection & { isCompleted?: boolean })[]> {
    const params = new URLSearchParams();
    if (lessonId) params.append('lessonId', lessonId);
    if (status) params.append('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<(LessonSection & { isCompleted?: boolean })[]>(`/sections${qs}`);
  }

  async getSection(id: string): Promise<LessonSection & { isCompleted?: boolean }> {
    return this.request<LessonSection & { isCompleted?: boolean }>(`/sections/${id}`);
  }

  async createSection(data: Partial<LessonSection>): Promise<LessonSection> {
    return this.request<LessonSection>('/sections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSection(id: string, data: Partial<LessonSection>): Promise<LessonSection> {
    return this.request<LessonSection>(`/sections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteSection(id: string): Promise<{ deleted: boolean; id: string }> {
    return this.request(`/sections/${id}`, { method: 'DELETE' });
  }

  async reorderSections(items: { id: string; order: number }[]): Promise<any> {
    return this.request('/sections/reorder', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  async completeSection(id: string): Promise<{ completedSectionIds: string[]; progressPercent: number; lessonCompleted: boolean; xpAwarded: number }> {
    return this.request(`/sections/${id}/complete`, { method: 'POST' });
  }

  // --- Challenges ---
  async listChallenges(): Promise<Challenge[]> {
    return this.request<Challenge[]>('/challenges');
  }

  async getChallenge(id: string): Promise<Challenge> {
    return this.request<Challenge>(`/challenges/${id}`);
  }

  async submitChallengeAttempt(
    id: string,
    query: string,
    databaseId?: string
  ): Promise<ChallengeEvaluationResult> {
    return this.request<ChallengeEvaluationResult>(`/challenges/${id}/attempt`, {
      method: 'POST',
      body: JSON.stringify({ query, databaseId }),
    });
  }

  // --- Data Modeler ---
  async listDataModels(databaseId?: string): Promise<DataModel[]> {
    const q = databaseId ? `?databaseId=${encodeURIComponent(databaseId)}` : '';
    return this.request<DataModel[]>(`/data-models${q}`);
  }

  async getDataModel(id: string): Promise<DataModel> {
    return this.request<DataModel>(`/data-models/${id}`);
  }

  async saveOrUpdateDataModel(model: Partial<DataModel>): Promise<DataModel> {
    return this.request<DataModel>('/data-models', {
      method: 'POST',
      body: JSON.stringify(model),
    });
  }

  async validateDataModel(entities: any[], relationships: any[]): Promise<DesignFeedbackItem[]> {
    return this.request<DesignFeedbackItem[]>('/data-models/validate', {
      method: 'POST',
      body: JSON.stringify({ entities, relationships }),
    });
  }

  async importDatabaseStructure(databaseId: string): Promise<ImportDatabaseResult> {
    return this.request<ImportDatabaseResult>('/data-models/import-database', {
      method: 'POST',
      body: JSON.stringify({ databaseId }),
    });
  }

  async applyStructureToDatabase(
    databaseId: string,
    entities?: ModelEntity[],
    modelId?: string
  ): Promise<ApplyStructureResult> {
    return this.request<ApplyStructureResult>('/data-models/apply-structure', {
      method: 'POST',
      body: JSON.stringify({ databaseId, entities, modelId }),
    });
  }

  async generateMongoStructure(
    modelId: string,
    targetDatabaseId?: string
  ): Promise<GeneratedMongoStructure> {
    return this.request<GeneratedMongoStructure>(`/data-models/${modelId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ targetDatabaseId }),
    });
  }

  // --- Forums ---
  async getForumPosts(params?: { category?: string; tag?: string; search?: string; sort?: 'recent' | 'top' | 'unanswered' }): Promise<ForumPost[]> {
    const queryParts: string[] = [];
    if (params?.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
    if (params?.tag) queryParts.push(`tag=${encodeURIComponent(params.tag)}`);
    if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params?.sort) queryParts.push(`sort=${encodeURIComponent(params.sort)}`);
    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return this.request<ForumPost[]>(`/forum/posts${qs}`);
  }

  async getForumPost(id: string): Promise<ForumPost> {
    return this.request<ForumPost>(`/forum/posts/${id}`);
  }

  async createForumPost(dto: CreateForumPostDto): Promise<ForumPost> {
    return this.request<ForumPost>('/forum/posts', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async upvoteForumPost(id: string): Promise<{ upvotes: number; userUpvoted: boolean }> {
    return this.request<{ upvotes: number; userUpvoted: boolean }>(`/forum/posts/${id}/upvote`, {
      method: 'POST',
    });
  }

  async createForumReply(postId: string, dto: CreateForumReplyDto): Promise<ForumReply> {
    return this.request<ForumReply>(`/forum/posts/${postId}/replies`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async upvoteForumReply(postId: string, replyId: string): Promise<{ upvotes: number; userUpvoted: boolean }> {
    return this.request<{ upvotes: number; userUpvoted: boolean }>(`/forum/posts/${postId}/replies/${replyId}/upvote`, {
      method: 'POST',
    });
  }

  async getForumStats(): Promise<ForumStats> {
    return this.request<ForumStats>('/forum/stats');
  }

  // --- Classrooms & Cohorts ---
  async listMyClassrooms(): Promise<{ teaching: Classroom[]; enrolled: Classroom[] }> {
    return this.request<{ teaching: Classroom[]; enrolled: Classroom[] }>('/classrooms/my');
  }

  async joinClassroom(code: string): Promise<Classroom> {
    return this.request<Classroom>('/classrooms/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async createClassroom(name: string, description?: string, customCode?: string): Promise<Classroom> {
    return this.request<Classroom>('/classrooms', {
      method: 'POST',
      body: JSON.stringify({ name, description, customCode }),
    });
  }

  async getClassroomRoster(classroomId: string): Promise<{ classroom: any; roster: any[] }> {
    return this.request<{ classroom: any; roster: any[] }>(`/classrooms/${classroomId}/roster`);
  }

  // --- Cohort Assignments ---
  async listCohortAssignments(classroomId: string): Promise<CohortAssignment[]> {
    return this.request<CohortAssignment[]>(`/classrooms/${classroomId}/assignments`);
  }

  async createCohortAssignment(classroomId: string, dto: CreateCohortAssignmentDto): Promise<CohortAssignment> {
    return this.request<CohortAssignment>(`/classrooms/${classroomId}/assignments`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async deleteCohortAssignment(classroomId: string, assignmentId: string): Promise<{ unassigned: boolean; id: string }> {
    return this.request<{ unassigned: boolean; id: string }>(`/classrooms/${classroomId}/assignments/${assignmentId}`, {
      method: 'DELETE',
    });
  }

  async listMyCohortAssignments(): Promise<CohortAssignment[]> {
    return this.request<CohortAssignment[]>('/classrooms/my/assignments');
  }

  // --- Admin Portal ---
  async getAdminStats(): Promise<any> {
    return this.request<any>('/admin/stats');
  }

  async listAdminUsers(): Promise<any[]> {
    return this.request<any[]>('/admin/users');
  }

  async updateAdminUserRole(userId: string, role: string): Promise<any> {
    return this.request<any>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async cleanOrphanedDatabases(): Promise<any> {
    return this.request<any>('/admin/maintenance/clean-orphans', {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();
