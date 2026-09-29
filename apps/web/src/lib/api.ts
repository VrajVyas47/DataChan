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

export interface DevUserIdentity {
  uid: string;
  email: string;
  name: string;
  role?: string;
}

class ApiClient {
  private token: string | null = null;
  private devUser: DevUserIdentity | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('datachan_token');
      const savedUser = localStorage.getItem('datachan_dev_user');
      if (savedUser) {
        try {
          this.devUser = JSON.parse(savedUser);
        } catch {
          this.devUser = null;
        }
      }
    }
  }

  public isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = this.token || localStorage.getItem('datachan_token');
    const user = this.devUser || localStorage.getItem('datachan_dev_user');
    return !!(token && user);
  }

  public getToken(): string | null {
    return this.token;
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('datachan_token', token);
      else localStorage.removeItem('datachan_token');
    }
  }

  public setDevUser(uid: string, email: string, name: string, role?: string) {
    this.devUser = { uid, email, name, role };
    if (typeof window !== 'undefined') {
      localStorage.setItem('datachan_dev_user', JSON.stringify(this.devUser));
    }
  }

  public getDevUser(): DevUserIdentity | null {
    return this.devUser;
  }


  public logout() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('datachan_token');
      localStorage.removeItem('datachan_auth_token');
      localStorage.removeItem('datachan_dev_user');
      localStorage.removeItem('datachan_user_id');
    }
  }

  public async login(email: string, password: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid email or password');
      }
      if (data.token && data.user) {
        this.setToken(data.token);
        this.setDevUser(data.user.id, data.user.email, data.user.displayName || data.user.username);
        return data;
      }
      throw new Error('Authentication failed');
    } catch (err: any) {
      // Client-side development verification fallback if API is not directly reachable
      const devEmail = process.env.NEXT_PUBLIC_DEMO_USER_EMAIL || 'demo@data-chan.local';
      const devPassword = process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD || 'DataChan@2026!';
      if (email.trim().toLowerCase() === devEmail.trim().toLowerCase()) {
        if (password === devPassword) {
          const uid = 'demo_user';
          const name = 'Lead Architect (Demo)';
          this.setToken(`token_${uid}`);
          this.setDevUser(uid, email, name);
          return { success: true, token: `token_${uid}`, user: { id: uid, email, displayName: name } };
        } else {
          throw new Error('Invalid email or password');
        }
      }
      throw err;
    }
  }


  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else if (this.devUser) {
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
