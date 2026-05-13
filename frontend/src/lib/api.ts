const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Session helpers (non-sensitive only) ─────────────────────────────────────

function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('current_user');
  // Legacy cleanup (tokens moved to httpOnly cookies)
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// ── Base fetch ────────────────────────────────────────────────────────────────
// Always sends credentials (httpOnly cookies). Falls back to localStorage
// Authorization header for local dev where cross-origin cookies don't work.

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  };

  // Dev fallback: include legacy Authorization header if token still in localStorage
  if (typeof window !== 'undefined') {
    const legacyToken = localStorage.getItem('access_token');
    if (legacyToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${legacyToken}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include', // sends httpOnly cookies automatically
  });

  if (res.status === 401) {
    // Try silent refresh via cookie
    const refreshRes = await fetch(`${API_BASE}/api/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    });
    if (refreshRes.ok) {
      // Retry original request — new access cookie was set
      return fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
    // Session truly expired
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
  }

  return res;
}

async function apiJSON<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  const res = await apiFetch(path, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail ?? JSON.stringify(error));
  }
  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  avatar: string;
  position: string;
}

function saveCurrentUser(user: CurrentUser) {
  localStorage.setItem('current_user', JSON.stringify(user));
}

export const auth = {
  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Credenciales incorrectas');
    // Cookies are set by the server — fetch and cache user info only
    try {
      const me = await fetch(`${API_BASE}/api/accounts/me/`, {
        credentials: 'include',
      }).then(r => r.json());
      saveCurrentUser(me);
    } catch {
      // Non-fatal: user info will be fetched on next load
    }
  },
  async logout() {
    try {
      await fetch(`${API_BASE}/api/auth/logout/`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Proceed even if request fails
    }
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
  },
  isAuthenticated: () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('current_user');
  },
  getCurrentUser(): CurrentUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('current_user');
    return raw ? JSON.parse(raw) : null;
  },
};

// ── Tipos de documentos ───────────────────────────────────────────────────────

export interface ApiDocument {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  visibility: string;
  version: string;
  file_name: string;
  file_type: string;
  file_size: number;
  size_display: string;
  content_type: string;
  object_key: string;
  storage_backend: 'r2' | 'local';
  uploaded_by: number | null;
  uploaded_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadUrlResponse {
  mode: 'r2' | 'direct';
  upload_url?: string;    // R2 presigned URL
  object_key?: string;    // R2 object key
  upload_endpoint?: string; // Para modo direct
}

export interface DownloadUrlResponse {
  url: string;
  file_name: string;
}

// ── Documents API ─────────────────────────────────────────────────────────────

export const documentsApi = {
  list(params?: { category?: string; search?: string; status?: string }) {
    const qs = new URLSearchParams();
    if (params?.category && params.category !== 'all') qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    if (params?.status) qs.set('status', params.status);
    const query = qs.toString() ? `?${qs}` : '';
    return apiJSON<{ results: ApiDocument[]; count: number }>(`/api/documents/${query}`);
  },

  get(id: number) {
    return apiJSON<ApiDocument>(`/api/documents/${id}/`);
  },

  delete(id: number) {
    return apiFetch(`/api/documents/${id}/`, { method: 'DELETE' });
  },

  // Obtiene URL de descarga/visualización
  getDownloadUrl(id: number) {
    return apiJSON<DownloadUrlResponse>(`/api/documents/${id}/download-url/`);
  },

  // Solicita presigned URL para upload a R2
  getUploadUrl(data: { file_name: string; content_type: string; file_size: number }) {
    return apiJSON<UploadUrlResponse>('/api/documents/upload-url/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Crea el registro del documento en la base de datos (después de subir a R2)
  create(data: {
    title: string; description?: string; category: string;
    status?: string; visibility?: string; version?: string;
    object_key?: string; file_name: string; file_type: string;
    file_size: number; content_type?: string;
  }) {
    return apiJSON<ApiDocument>('/api/documents/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Upload directo a Django (modo sin R2)
  async uploadDirect(
    file: File,
    meta: { title: string; description?: string; category: string },
    onProgress?: (pct: number) => void,
  ): Promise<ApiDocument> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', meta.title);
      formData.append('description', meta.description ?? '');
      formData.append('category', meta.category);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/api/documents/`);
      xhr.withCredentials = true; // send httpOnly cookies

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Error ${xhr.status}: ${xhr.responseText}`));
        }
      };
      xhr.onerror = () => reject(new Error('Error de red'));
      xhr.send(formData);
    });
  },

  // Upload a R2 mediante presigned URL con progreso
  async uploadToR2(
    presignedUrl: string,
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`R2 upload error ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('Error de red al subir a R2'));
      xhr.send(file);
    });
  },

  // Flujo completo de upload (detecta automáticamente R2 o directo)
  async upload(
    file: File,
    meta: { title: string; description?: string; category: string },
    onProgress?: (pct: number) => void,
  ): Promise<ApiDocument> {
    const urlRes = await this.getUploadUrl({
      file_name: file.name,
      content_type: file.type || 'application/octet-stream',
      file_size: file.size,
    });

    if (urlRes.mode === 'direct') {
      // Sin R2: upload multipart directo a Django
      return this.uploadDirect(file, meta, onProgress);
    }

    // Con R2: subir al presigned URL, luego crear registro
    await this.uploadToR2(urlRes.upload_url!, file, onProgress);

    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'other';
    const extToType: Record<string, string> = {
      pdf: 'pdf', docx: 'docx', doc: 'docx', pptx: 'pptx',
      xlsx: 'xlsx', html: 'html', md: 'md',
      png: 'png', jpg: 'jpg', jpeg: 'jpg', mp4: 'mp4',
    };

    return this.create({
      title:       meta.title,
      description: meta.description ?? '',
      category:    meta.category,
      object_key:  urlRes.object_key!,
      file_name:   file.name,
      file_type:   extToType[ext] ?? 'other',
      file_size:   file.size,
      content_type: file.type,
    });
  },
};

// ── Calendar API ──────────────────────────────────────────────────────────────

export interface ApiCalendarEvent {
  id: number;
  title: string;
  type: 'content' | 'meeting' | 'deadline' | 'campaign' | 'event';
  date: string;
  end_date?: string;
  time?: string;
  description?: string;
  assignee?: number | null;
  assignee_name?: string | null;
  channel?: string;
  status: 'scheduled' | 'published' | 'draft' | 'cancelled';
  created_by?: number | null;
  created_at?: string;
}

export const calendarApi = {
  list(month?: string) {
    const qs = month ? `?month=${month}` : '';
    return apiJSON<{ results: ApiCalendarEvent[]; count: number }>(`/api/calendar/${qs}`);
  },

  create(data: Omit<ApiCalendarEvent, 'id' | 'assignee_name' | 'created_by' | 'created_at'>) {
    return apiJSON<ApiCalendarEvent>('/api/calendar/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  delete(id: number) {
    return apiFetch(`/api/calendar/${id}/`, { method: 'DELETE' });
  },
};

// ── Tasks API ─────────────────────────────────────────────────────────────────

export interface ApiTask {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: number | null;
  assignee_name: string | null;
  due_date: string | null;
  project: string;
  progress: number;
  tags: string[];
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

type TaskInput = Omit<ApiTask, 'id' | 'assignee_name' | 'created_by' | 'created_at' | 'updated_at'>;

export const tasksApi = {
  list() {
    return apiJSON<{ results: ApiTask[]; count: number }>('/api/tasks/?page_size=100');
  },
  create(data: Partial<TaskInput> & { title: string }) {
    return apiJSON<ApiTask>('/api/tasks/', { method: 'POST', body: JSON.stringify(data) });
  },
  update(id: number, data: Partial<TaskInput>) {
    return apiJSON<ApiTask>(`/api/tasks/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  delete(id: number) {
    return apiFetch(`/api/tasks/${id}/`, { method: 'DELETE' });
  },
};

// ── Team / Users API ──────────────────────────────────────────────────────────

export interface ApiTeamMember {
  id: number;          // UserProfile PK
  user_id: number;     // User PK
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'team' | 'leadership' | 'viewer';
  position: string;
  department: string;
  area: string;
  phone: string;
  bio: string;
  avatar: string;
  skills: string[];
  start_date: string;
  status: 'active' | 'inactive';
  reports_to_id: number | null;
}

export interface ApiUserProfile {
  role: string;
  position: string;
  department: string;
  area: string;
  phone: string;
  bio: string;
  avatar: string;
  skills: string[];
  start_date: string | null;
  status: string;
}

export interface ApiUserManagement {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  is_active: boolean;
  profile: ApiUserProfile;
}

export type UserCreateInput = Omit<ApiUserManagement, 'id' | 'name'> & { password: string };
export type UserUpdateInput = Partial<Omit<ApiUserManagement, 'id' | 'name'>>;

export const meApi = {
  get() {
    return apiJSON<CurrentUser>('/api/accounts/me/');
  },
};

export const teamApi = {
  list() {
    return apiJSON<{ results: ApiTeamMember[]; count: number }>('/api/team/');
  },
  updateHierarchy(profileId: number, reportsToId: number | null) {
    return apiJSON<ApiTeamMember>(`/api/team/${profileId}/hierarchy/`, {
      method: 'PATCH',
      body: JSON.stringify({ reports_to: reportsToId }),
    });
  },
};

export type YouTubeMetricValue = { value: number | null; period_start: string | null; period_end: string | null };
export type DashboardSummary = {
  tasks_active: number;
  tasks_done: number;
  metrics_count: number;
  youtube: {
    'youtube-views': YouTubeMetricValue;
    'youtube-watch-time': YouTubeMetricValue;
    'youtube-net-subscribers': YouTubeMetricValue;
    'youtube-likes': YouTubeMetricValue;
    'youtube-comments': YouTubeMetricValue;
    'youtube-shares': YouTubeMetricValue;
    'youtube-subscribers-total': YouTubeMetricValue;
  };
};

export type YouTubeWeeklyMetric = { value: number | null; prev_value: number | null; change_pct: number | null };
export type YouTubeWeeklyData = {
  week: string;
  period_start: string;
  period_end: string;
  metrics: {
    'youtube-views': YouTubeWeeklyMetric;
    'youtube-watch-time': YouTubeWeeklyMetric;
    'youtube-net-subscribers': YouTubeWeeklyMetric;
    'youtube-likes': YouTubeWeeklyMetric;
    'youtube-comments': YouTubeWeeklyMetric;
    'youtube-shares': YouTubeWeeklyMetric;
  };
};

export const dashboardApi = {
  summary() {
    return apiJSON<DashboardSummary>('/api/dashboard/summary/');
  },
};

export const youtubeApi = {
  weekly(week?: string) {
    const params = week ? `?week=${week}` : '';
    return apiJSON<YouTubeWeeklyData>(`/api/metrics/youtube-weekly/${params}`);
  },
};

export const usersApi = {
  list() {
    return apiJSON<{ results: ApiUserManagement[]; count: number }>('/api/accounts/users/');
  },
  create(data: UserCreateInput) {
    return apiJSON<ApiUserManagement>('/api/accounts/users/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update(id: number, data: UserUpdateInput) {
    return apiJSON<ApiUserManagement>(`/api/accounts/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  setPassword(id: number, password: string) {
    return apiJSON(`/api/accounts/users/${id}/set-password/`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },
  deactivate(id: number) {
    return apiJSON<ApiUserManagement>(`/api/accounts/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false }),
    });
  },
};
