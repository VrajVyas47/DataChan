import {
  ApiResponse,
  UserProfile,
  Workspace,
  VirtualDatabase,
  CollectionMetadata,
  DocumentItem,
  QueryResult,
  QueryHistoryItem,
  Lesson,
  Challenge,
  ChallengeEvaluationResult,
  DataModel,
  DesignFeedbackItem,
  GeneratedMongoStructure,
  ThemeId,
} from '@datachan/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

class ApiClient {
  private token: string | null = null;
  private devUser = {
    uid: 'student_jay_demo',
    email: 'jay@data-chan.edu',
    name: 'Jay',
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('datachan_token');
      const savedUser = localStorage.getItem('datachan_dev_user');
      if (savedUser) {
        try {
          this.devUser = JSON.parse(savedUser);
        } catch {}
      }
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('datachan_token', token);
      else localStorage.removeItem('datachan_token');
    }
  }

  public setDevUser(uid: string, email: string, name: string) {
    this.devUser = { uid, email, name };
    if (typeof window !== 'undefined') {
      localStorage.setItem('datachan_dev_user', JSON.stringify(this.devUser));
    }
  }

  public getDevUser() {
    return this.devUser;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else {
      // In dev mode, send dev headers
      headers['x-dev-uid'] = this.devUser.uid;
      headers['x-dev-email'] = this.devUser.email;
      headers['x-dev-name'] = this.devUser.name;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const json: ApiResponse<T> = await res.json();
    if (!json.success) {
      throw new Error(json.error?.message || 'API request failed');
    }

    return json.data as T;
  }

  // --- Auth & User ---
  async getMe(): Promise<UserProfile> {
    return this.request<UserProfile>('/auth/me');
  }

  async syncUser(updates: {
    displayName?: string;
    themePreference?: ThemeId;
    activeWorkspaceId?: string;
    activeDatabaseId?: string;
  }): Promise<any> {
    return this.request('/auth/sync', {
      method: 'POST',
      body: JSON.stringify(updates),
    });
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

  // --- Query History ---
  async getQueryHistory(limit = 20): Promise<QueryHistoryItem[]> {
    return this.request<QueryHistoryItem[]>(`/query-history?limit=${limit}`);
  }

  async clearQueryHistory(): Promise<any> {
    return this.request('/query-history', { method: 'DELETE' });
  }

  // --- Learning ---
  async listLessons(): Promise<Lesson[]> {
    return this.request<Lesson[]>('/lessons');
  }

  async getLesson(id: string): Promise<Lesson> {
    return this.request<Lesson>(`/lessons/${id}`);
  }

  async completeLesson(id: string): Promise<{ completed: boolean; xpAwarded: number }> {
    return this.request(`/lessons/${id}/complete`, { method: 'POST' });
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
  async listDataModels(): Promise<DataModel[]> {
    return this.request<DataModel[]>('/data-models');
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

  async generateMongoStructure(
    modelId: string,
    targetDatabaseId?: string
  ): Promise<GeneratedMongoStructure> {
    return this.request<GeneratedMongoStructure>(`/data-models/${modelId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ targetDatabaseId }),
    });
  }
}

export const api = new ApiClient();
