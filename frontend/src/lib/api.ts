const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── In-memory token store ─────────────────────────────────────────────────────
// Access token lives only in this module variable — never in localStorage.
// It's reset on every page load; a silent refresh via httpOnly cookie restores it.
// This prevents XSS token theft while supporting cross-origin deployments.

let _memToken: string | null = null;

function setMemToken(token: string) { _memToken = token; }
function clearMemToken() { _memToken = null; }

// ── Session helpers ───────────────────────────────────────────────────────────

function setSessionIndicator() {
  // Non-sensitive indicator cookie so Next.js middleware can gate hub routes.
  document.cookie = 'mh_session=1; path=/; max-age=259200; SameSite=Lax';
}

function clearSessionIndicator() {
  document.cookie = 'mh_session=; path=/; max-age=0; SameSite=Lax';
}

function clearSession() {
  if (typeof window === 'undefined') return;
  clearMemToken();
  localStorage.removeItem('current_user');
  clearSessionIndicator();
}

// ── Base fetch ────────────────────────────────────────────────────────────────

let _refreshing: Promise<boolean> | null = null;

async function _doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    if (data.access) setMemToken(data.access);
    return true;
  } catch {
    return false;
  }
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  };

  // Always try to use the in-memory token (works cross-origin regardless of cookie policy)
  if (_memToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${_memToken}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    // Deduplicate concurrent refresh attempts
    if (!_refreshing) _refreshing = _doRefresh().finally(() => { _refreshing = null; });
    const ok = await _refreshing;

    if (ok && _memToken) {
      headers['Authorization'] = `Bearer ${_memToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
    } else {
      clearSession();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
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
    // Server sets httpOnly cookies. Read token from body ONCE to fetch user profile
    // immediately — token is used for one request and never stored in localStorage.
    const data = await res.json().catch(() => ({}));
    if (data.access) setMemToken(data.access);
    try {
      const meRes = await fetch(`${API_BASE}/api/accounts/me/`, {
        credentials: 'include',
        headers: _memToken ? { Authorization: `Bearer ${_memToken}` } : {},
      });
      if (meRes.ok) {
        saveCurrentUser(await meRes.json());
        setSessionIndicator();
      }
    } catch {
      // Non-fatal
    }
  },
  async logout() {
    try {
      await apiFetch('/api/auth/logout/', { method: 'POST' });
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
  start_date: string | null;
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

// ── Google Analytics 4 ────────────────────────────────────────────────────────

export type GA4Metric = {
  value: number | null;
  prev_value: number | null;
  change_pct: number | null;
  period_start?: string | null;
  period_end?: string | null;
};

export type GA4Slug =
  | 'ga4-sessions'
  | 'ga4-active-users'
  | 'ga4-new-users'
  | 'ga4-pageviews'
  | 'ga4-engagement-rate'
  | 'ga4-avg-session-duration'
  | 'ga4-conversions';

export type GA4Summary = {
  period_type: 'monthly' | 'weekly';
  week?: string;
  period_start?: string;
  period_end?: string;
  metrics: Record<GA4Slug, GA4Metric>;
};

export const ga4Api = {
  monthly() {
    return apiJSON<GA4Summary>('/api/metrics/ga4-summary/?period=monthly');
  },
  weekly(week?: string) {
    const params = week ? `?period=weekly&week=${week}` : '?period=weekly';
    return apiJSON<GA4Summary>(`/api/metrics/ga4-summary/${params}`);
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

// ── Customer Avatars API ──────────────────────────────────────────────────────

export interface ApiCustomerAvatar {
  id: number;
  name: string;
  description: string;
  emoji: string;
  quote: string;
  color: string;
  age_range: string;
  location: string;
  origin_country: string;
  family_situation: string;
  occupation: string;
  immigration_status: string;
  education: string;
  income_range: string;
  goals: string[];
  pain_points: string[];
  values: string[];
  dreams: string[];
  interests: string[];
  favorite_brands: string[];
  media_channels: string[];
  objections: string[];
  triggers: string[];
  is_primary: boolean;
  is_active: boolean;
  updated_at: string;
  updated_at_display: string;
}

export const avatarsApi = {
  list: () =>
    apiJSON<{ results: ApiCustomerAvatar[]; count: number }>('/api/avatars/customer-avatars/'),
  create: (data: Partial<ApiCustomerAvatar>) =>
    apiJSON<ApiCustomerAvatar>('/api/avatars/customer-avatars/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<ApiCustomerAvatar>) =>
    apiJSON<ApiCustomerAvatar>(`/api/avatars/customer-avatars/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiFetch(`/api/avatars/customer-avatars/${id}/`, { method: 'DELETE' }),
  setPrimary: (id: number) =>
    apiJSON<ApiCustomerAvatar>(`/api/avatars/customer-avatars/${id}/set_primary/`, {
      method: 'POST',
    }),
};

// ── Competitors API ───────────────────────────────────────────────────────────

export type CompetitorCategory = 'direct' | 'indirect';
export type CompetitorDimension = 'seo' | 'social_media' | 'advertising' | 'web_presence' | 'content' | 'reviews';
export type ScoreSource = 'manual' | 'similarweb' | 'api';
export type AdPlatform = 'meta' | 'google' | 'youtube' | 'tiktok';
export type InsightType = 'threat' | 'opportunity' | 'observation';
export type InsightImpact = 'high' | 'medium' | 'low';

export interface ApiCompetitorScore {
  id: number;
  competitor: number;
  dimension: CompetitorDimension;
  dimension_display: string;
  score: string; // decimal string from DRF
  raw_value: string;
  source: ScoreSource;
  source_display: string;
  period: string; // YYYY-MM-DD
  notes: string;
  created_at: string;
}

export interface ApiAdObservation {
  id: number;
  competitor: number;
  platform: AdPlatform;
  platform_display: string;
  creative_url: string;
  headline: string;
  message: string;
  cta: string;
  differentiator: string;
  observed_date: string;
  is_active: boolean;
  notes: string;
  created_by: number | null;
  created_at: string;
}

export interface ApiCompetitorInsight {
  id: number;
  competitor: number | null;
  insight_type: InsightType;
  insight_type_display: string;
  impact: InsightImpact;
  impact_display: string;
  title: string;
  description: string;
  action_items: string[];
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface ApiCompetitor {
  id: number;
  name: string;
  website: string;
  logo_url: string;
  category: CompetitorCategory;
  practice_areas: string[];
  description: string;
  location: string;
  is_active: boolean;
  scores: ApiCompetitorScore[];
  ad_observations: ApiAdObservation[];
  insights: ApiCompetitorInsight[];
  created_at: string;
  updated_at: string;
}

export interface ApiCompetitorList {
  id: number;
  name: string;
  website: string;
  logo_url: string;
  category: CompetitorCategory;
  practice_areas: string[];
  description: string;
  location: string;
  is_active: boolean;
  latest_scores: Partial<Record<CompetitorDimension, number>>;
  created_at: string;
  updated_at: string;
}

export type CompetitorInput = {
  name: string;
  website?: string;
  logo_url?: string;
  category?: CompetitorCategory;
  practice_areas?: string[];
  description?: string;
  location?: string;
  is_active?: boolean;
};

export type ScoreInput = {
  competitor: number;
  dimension: CompetitorDimension;
  score: number;
  raw_value?: string;
  source?: ScoreSource;
  period: string; // YYYY-MM-DD (use first day of month)
  notes?: string;
};

export type AdObservationInput = {
  competitor: number;
  platform: AdPlatform;
  creative_url?: string;
  headline?: string;
  message?: string;
  cta?: string;
  differentiator?: string;
  observed_date: string;
  is_active?: boolean;
  notes?: string;
};

export type InsightInput = {
  competitor?: number | null;
  insight_type: InsightType;
  impact: InsightImpact;
  title: string;
  description: string;
  action_items?: string[];
};

export const competitorsApi = {
  list() {
    return apiJSON<{ results: ApiCompetitorList[]; count: number }>('/api/competitors/competitors/');
  },
  get(id: number) {
    return apiJSON<ApiCompetitor>(`/api/competitors/competitors/${id}/`);
  },
  radarData() {
    return apiJSON<ApiCompetitorList[]>('/api/competitors/competitors/radar-data/');
  },
  create(data: CompetitorInput) {
    return apiJSON<ApiCompetitor>('/api/competitors/competitors/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update(id: number, data: Partial<CompetitorInput>) {
    return apiJSON<ApiCompetitor>(`/api/competitors/competitors/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  delete(id: number) {
    return apiFetch(`/api/competitors/competitors/${id}/`, { method: 'DELETE' });
  },

  // Scores
  listScores(competitorId?: number) {
    const qs = competitorId ? `?competitor=${competitorId}` : '';
    return apiJSON<{ results: ApiCompetitorScore[]; count: number }>(`/api/competitors/scores/${qs}`);
  },
  createScore(data: ScoreInput) {
    return apiJSON<ApiCompetitorScore>('/api/competitors/scores/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateScore(id: number, data: Partial<ScoreInput>) {
    return apiJSON<ApiCompetitorScore>(`/api/competitors/scores/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Ads
  listAds(competitorId?: number, platform?: AdPlatform) {
    const qs = new URLSearchParams();
    if (competitorId) qs.set('competitor', String(competitorId));
    if (platform) qs.set('platform', platform);
    return apiJSON<{ results: ApiAdObservation[]; count: number }>(`/api/competitors/ads/${qs.toString() ? '?' + qs : ''}`);
  },
  createAd(data: AdObservationInput) {
    return apiJSON<ApiAdObservation>('/api/competitors/ads/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateAd(id: number, data: Partial<AdObservationInput>) {
    return apiJSON<ApiAdObservation>(`/api/competitors/ads/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  deleteAd(id: number) {
    return apiFetch(`/api/competitors/ads/${id}/`, { method: 'DELETE' });
  },

  // Insights
  listInsights(competitorId?: number) {
    const qs = competitorId ? `?competitor=${competitorId}` : '';
    return apiJSON<{ results: ApiCompetitorInsight[]; count: number }>(`/api/competitors/insights/${qs}`);
  },
  createInsight(data: InsightInput) {
    return apiJSON<ApiCompetitorInsight>('/api/competitors/insights/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  deleteInsight(id: number) {
    return apiFetch(`/api/competitors/insights/${id}/`, { method: 'DELETE' });
  },
};

// ── Grillas ───────────────────────────────────────────────────────────────────

export type GridPostComment = {
  id: number;
  author_name: string;
  text: string;
  created_at: string;
};

export type GridPostVersion = {
  id: number;
  caption: string;
  changed_by_name: string;
  created_at: string;
};

export type GridPost = {
  id: number;
  grid: number;
  day_of_week: number;
  slot: 'carousel' | 'foto' | 'reel';
  format: 'carousel' | 'static' | 'foto' | 'reel';
  headline: string;
  slide_titles: string[];
  copy: string;
  cta: string;
  hashtags: string;
  caption: string;
  photo_suggestion: string;
  video_title: string;
  script_points: string[];
  approved: boolean;
  approved_by_name: string | null;
  approved_at: string | null;
  comments: GridPostComment[];
  versions: GridPostVersion[];
  created_at: string;
  updated_at: string;
};

export type ContentGrid = {
  id: number;
  week_start: string;
  tema: string;
  tema_display: string;
  tono: string;
  notes: string;
  status: 'borrador' | 'lista' | 'publicada';
  status_display: string;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  posts: GridPost[];
};

export type ContentGridList = Omit<ContentGrid, 'posts'> & {
  post_count: number;
  approved_count: number;
};

export const grillasApi = {
  list: () => apiJSON<{ results: ContentGridList[]; count: number }>('/api/grillas/'),
  create: (data: { week_start: string; tema: string; tono?: string; notes?: string }) =>
    apiJSON<ContentGrid>('/api/grillas/', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: number) => apiJSON<ContentGrid>(`/api/grillas/${id}/`),
  update: (id: number, data: { status?: string }) =>
    apiJSON<ContentGrid>(`/api/grillas/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  generate: (id: number) =>
    apiJSON<ContentGrid>(`/api/grillas/${id}/generate/`, { method: 'POST' }),
  updatePost: (postId: number, data: Partial<GridPost>) =>
    apiJSON<GridPost>(`/api/grillas/posts/${postId}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch(`/api/grillas/${id}/`, { method: 'DELETE' }),
  approvePost: (postId: number) =>
    apiJSON<GridPost>(`/api/grillas/posts/${postId}/approve/`, { method: 'POST' }),
  addComment: (postId: number, text: string) =>
    apiJSON<GridPostComment>(`/api/grillas/posts/${postId}/comments/`, {
      method: 'POST', body: JSON.stringify({ text }),
    }),
  getHistory: (postId: number) =>
    apiJSON<GridPostVersion[]>(`/api/grillas/posts/${postId}/history/`),
  toCalendar: (gridId: number) =>
    apiJSON<{ created: number; week: string; tema: string }>(`/api/grillas/${gridId}/to_calendar/`, { method: 'POST' }),
  generateHashtags: (gridId: number) =>
    apiJSON<{ pequeños: string[]; medianos: string[]; grandes: string[] }>(`/api/grillas/${gridId}/hashtags/`, { method: 'POST' }),
  improvePost: (postId: number) =>
    apiJSON<{ caption: string }>(`/api/grillas/posts/${postId}/improve/`, { method: 'POST' }),
};
