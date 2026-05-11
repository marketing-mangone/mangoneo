export type UserRole = 'admin' | 'team' | 'leadership' | 'viewer';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  position: string;
  department: string;
  avatar?: string;
  phone?: string;
  bio?: string;
  skills?: string[];
}

export interface TeamMember extends User {
  slack?: string;
  area: string;
  startDate: string;
  status: 'active' | 'inactive';
}

export interface KPI {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  target: number;
  unit: 'count' | 'currency' | 'percentage' | 'time';
  category: 'acquisition' | 'engagement' | 'conversion' | 'brand';
  source: 'hubspot' | 'google_analytics' | 'meta' | 'manual' | 'google_ads';
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

export interface MetricSnapshot {
  date: string;
  value: number;
}

export interface MetricSeries {
  metric: KPI;
  data: MetricSnapshot[];
}

export interface Document {
  id: number;
  title: string;
  category: 'sop' | 'manual' | 'jd' | 'template' | 'policy' | 'brand';
  description: string;
  fileType: 'pdf' | 'docx' | 'pptx' | 'html';
  fileSize: string;
  version: string;
  status: 'active' | 'draft' | 'archived';
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  visibility: 'team' | 'leadership' | 'all';
  downloadUrl?: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'review' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: string;
  dueDate: string;
  createdAt: string;
  tags: string[];
  project?: string;
  progress?: number;
}

export interface CalendarEvent {
  id: number;
  title: string;
  type: 'content' | 'meeting' | 'deadline' | 'campaign' | 'event';
  date: string;
  endDate?: string;
  time?: string;
  description?: string;
  assignee?: string;
  channel?: 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'facebook' | 'podcast' | 'web' | 'all';
  status: 'scheduled' | 'published' | 'draft' | 'cancelled';
}

export interface Notification {
  id: number;
  type: 'kpi_alert' | 'document_update' | 'task_assigned' | 'mention';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}
