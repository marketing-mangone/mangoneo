const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Auth helpers ─────────────────────────────────────────────────────────────

function getTokens() {
  if (typeof window === 'undefined') return { access: null, refresh: null };
  return {
    access:  localStorage.getItem('access_token'),
    refresh: localStorage.getItem('refresh_token'),
  };
}

function saveTokens(access: string, refresh: string) {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// ── Base fetch con manejo de JWT ─────────────────────────────────────────────

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const { access } = getTokens();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (access) headers['Authorization'] = `Bearer ${access}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Intentar refrescar el token
    const { refresh } = getTokens();
    if (refresh) {
      const refreshRes = await fetch(`${API_BASE}/api/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (refreshRes.ok) {
        const { access: newAccess } = await refreshRes.json();
        saveTokens(newAccess, refresh);
        headers['Authorization'] = `Bearer ${newAccess}`;
        return fetch(`${API_BASE}${path}`, { ...options, headers });
      }
    }
    clearTokens();
    window.location.href = '/login';
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

export const auth = {
  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Credenciales incorrectas');
    const data = await res.json();
    saveTokens(data.access, data.refresh);
    return data;
  },
  logout: clearTokens,
  isAuthenticated: () => !!getTokens().access,
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
    const { access } = getTokens();
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', meta.title);
      formData.append('description', meta.description ?? '');
      formData.append('category', meta.category);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/api/documents/`);
      if (access) xhr.setRequestHeader('Authorization', `Bearer ${access}`);

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
