'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import NextImage from 'next/image';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  FileText, FileType, Image, Search, Upload, Filter,
  Download, Eye, Clock, FolderOpen, BookOpen,
  Palette, Type, Layers, X, AlertCircle, Trash2,
  CheckCircle, Loader2, CloudUpload, Maximize2,
  Edit3, Plus, Users, Lightbulb, Heart, Tag,
  ClipboardList, ChevronDown, ChevronRight, Shield, Wrench,
  Link2, ExternalLink, Globe,
} from 'lucide-react';
import { documentsApi, ApiDocument, avatarsApi, ApiCustomerAvatar } from '@/lib/api';

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'all', label: 'Todos', icon: FolderOpen },
  { key: 'sop', label: 'SOPs', icon: FileText },
  { key: 'jd', label: 'Job Descriptions', icon: FileType },
  { key: 'policy', label: 'Políticas', icon: BookOpen },
  { key: 'brand', label: 'Marca', icon: Palette },
  { key: 'manual', label: 'Manuales', icon: Layers },
  { key: 'template', label: 'Templates', icon: Type },
];

const CATEGORY_LABELS: Record<string, string> = {
  sop: 'SOP', jd: 'Job Description', policy: 'Política',
  brand: 'Marca', manual: 'Manual', template: 'Template', other: 'Otro',
};

const fileTypeColors: Record<string, string> = {
  pdf: 'bg-red-50 text-red-700',
  docx: 'bg-blue-50 text-blue-700',
  html: 'bg-purple-50 text-purple-700',
  pptx: 'bg-orange-50 text-orange-700',
  xlsx: 'bg-green-50 text-green-700',
  png: 'bg-pink-50 text-pink-700',
  jpg: 'bg-pink-50 text-pink-700',
  mp4: 'bg-indigo-50 text-indigo-700',
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'bg-green-50 text-green-700' },
  draft: { label: 'Borrador', color: 'bg-amber-50 text-amber-700' },
  archived: { label: 'Archivado', color: 'bg-gray-100 text-gray-500' },
};

// ── Brainstorming ─────────────────────────────────────────────────────────────

interface BrainstormingIdea {
  id: string;
  title: string;
  description: string;
  author: string;
  color: string;
  category: string;
  created_at: string;
  likes: number;
  liked: boolean;
}

const BRAINSTORM_COLORS = [
  { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  { bg: '#FCE7F3', text: '#9D174D', border: '#FBCFE8' },
  { bg: '#EDE9FE', text: '#4C1D95', border: '#DDD6FE' },
  { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  { bg: '#ECFDF5', text: '#064E3B', border: '#A7F3D0' },
  { bg: '#FFF7ED', text: '#7C2D12', border: '#FED7AA' },
];

const BRAINSTORM_CATEGORIES = [
  'Contenido', 'Campaña', 'SEO', 'Diseño', 'Video', 'CRM', 'General',
];

const TEAM_MEMBERS = [
  { name: 'Sebas', role: 'Director' },
  { name: 'Alejandra', role: 'Content' },
  { name: 'Sara', role: 'Diseño' },
  { name: 'Gloriana', role: 'Video' },
  { name: 'Andrés', role: 'Web/SEO' },
  { name: 'Jesús', role: 'HubSpot' },
];

const MEMBER_INITIALS: Record<string, string> = {
  Sebas: 'SE', Alejandra: 'AL', Sara: 'SA', Gloriana: 'GL', Andrés: 'AN', Jesús: 'JE',
};

const MEMBER_COLORS: Record<string, string> = {
  Sebas: '#0C2054', Alejandra: '#F79C31', Sara: '#ec4899',
  Gloriana: '#8b5cf6', Andrés: '#10b981', Jesús: '#06b6d4',
};

const BRAINSTORM_STORAGE_KEY = 'mangone_brainstorming_ideas';

function loadIdeas(): BrainstormingIdea[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BRAINSTORM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveIdeas(ideas: BrainstormingIdea[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BRAINSTORM_STORAGE_KEY, JSON.stringify(ideas));
}

// ── AddIdeaModal ──────────────────────────────────────────────────────────────

function AddIdeaModal({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (idea: BrainstormingIdea) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState(TEAM_MEMBERS[0].name);
  const [category, setCategory] = useState(BRAINSTORM_CATEGORIES[6]);
  const [colorIdx, setColorIdx] = useState(0);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('El título es requerido'); return; }
    const idea: BrainstormingIdea = {
      id: `idea-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      title: title.trim(),
      description: description.trim(),
      author,
      color: BRAINSTORM_COLORS[colorIdx].bg,
      category,
      created_at: new Date().toISOString(),
      likes: 0,
      liked: false,
    };
    onCreate(idea);
    setTitle(''); setDescription(''); setAuthor(TEAM_MEMBERS[0].name);
    setCategory(BRAINSTORM_CATEGORIES[6]); setColorIdx(0); setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--s-f0f0f0)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F79C31]/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-[var(--t-f79c31)]" />
            </div>
            <h3 className="font-bold text-[var(--t-1a1a2e)]">Nueva idea</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--s-f7f8fc)] text-[var(--t-8888a8)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Título <span className="text-red-400">*</span></label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="¿Cuál es la idea?"
              className="w-full px-3 py-2.5 text-sm border border-[var(--s-e8e8f0)] rounded-lg outline-none focus:border-[var(--s-f79c31)] transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Descripción <span className="text-[var(--t-8888a8)] font-normal">(opcional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Desarrolla la idea con más detalle..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-[var(--s-e8e8f0)] rounded-lg outline-none focus:border-[var(--s-f79c31)] transition-colors resize-none"
            />
          </div>

          {/* Author + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Autor</label>
              <select
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[var(--s-e8e8f0)] rounded-lg outline-none focus:border-[var(--s-f79c31)] bg-[var(--surface)] transition-colors"
              >
                {TEAM_MEMBERS.map(m => (
                  <option key={m.name} value={m.name}>{m.name} — {m.role}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Categoría</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[var(--s-e8e8f0)] rounded-lg outline-none focus:border-[var(--s-f79c31)] bg-[var(--surface)] transition-colors"
              >
                {BRAINSTORM_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Color de nota</label>
            <div className="flex gap-2">
              {BRAINSTORM_COLORS.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setColorIdx(i)}
                  className={`w-8 h-8 rounded-lg transition-all flex-shrink-0 border-2 ${colorIdx === i ? 'scale-110 border-gray-400' : 'border-transparent hover:scale-105'}`}
                  style={{ background: c.bg }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-[var(--t-4a4a6a)] border border-[var(--s-e8e8f0)] rounded-lg hover:bg-[var(--s-f7f8fc)] transition-colors">
              Cancelar
            </button>
            <button type="submit" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[var(--s-f79c31)] rounded-lg hover:bg-[var(--s-e08a20)] transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Agregar idea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── IdeaCard ──────────────────────────────────────────────────────────────────

function IdeaCard({ idea, onLike, onDelete }: {
  idea: BrainstormingIdea;
  onLike: () => void;
  onDelete: () => void;
}) {
  const colorDef = BRAINSTORM_COLORS.find(c => c.bg === idea.color) ?? BRAINSTORM_COLORS[0];

  const dateLabel = (() => {
    const diff = Date.now() - new Date(idea.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `hace ${days}d`;
    return new Date(idea.created_at).toLocaleDateString('es-US', { month: 'short', day: 'numeric' });
  })();

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all group border"
      style={{ background: colorDef.bg, borderColor: colorDef.border }}
    >
      {/* Category + delete */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
          style={{ background: `${colorDef.text}15`, color: colorDef.text }}
        >
          {idea.category}
        </span>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center transition-opacity hover:bg-red-100"
          style={{ color: colorDef.text }}
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1">
        <p className="text-sm font-bold leading-snug" style={{ color: colorDef.text }}>{idea.title}</p>
        {idea.description && (
          <p className="text-xs mt-1.5 leading-relaxed opacity-75" style={{ color: colorDef.text }}>{idea.description}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
            style={{ background: MEMBER_COLORS[idea.author] ?? '#0C2054' }}
          >
            {MEMBER_INITIALS[idea.author] ?? idea.author.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-[11px] font-medium" style={{ color: colorDef.text, opacity: 0.7 }}>{idea.author}</span>
          <span className="text-[10px]" style={{ color: colorDef.text, opacity: 0.4 }}>· {dateLabel}</span>
        </div>
        <button
          onClick={onLike}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-[11px] font-semibold ${idea.liked ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
          style={{ color: colorDef.text }}
        >
          <Heart className={`w-3 h-3 ${idea.liked ? 'fill-current' : ''}`} />
          {idea.likes > 0 && <span>{idea.likes}</span>}
        </button>
      </div>
    </div>
  );
}

// ── Links ─────────────────────────────────────────────────────────────────────

const LINK_CATEGORIES = [
  'Herramientas de Marketing',
  'Diseño y Creatividad',
  'Redes Sociales',
  'SEO y Analytics',
  'IA y Automatización',
  'Legal / Inmigración',
  'Inspiración',
  'Otros',
];

const LINK_CATEGORY_COLORS: Record<string, string> = {
  'Herramientas de Marketing': 'bg-blue-100 text-blue-700',
  'Diseño y Creatividad':      'bg-pink-100 text-pink-700',
  'Redes Sociales':            'bg-purple-100 text-purple-700',
  'SEO y Analytics':           'bg-green-100 text-green-700',
  'IA y Automatización':       'bg-amber-100 text-amber-700',
  'Legal / Inmigración':       'bg-slate-100 text-slate-700',
  'Inspiración':               'bg-orange-100 text-orange-700',
  'Otros':                     'bg-gray-100 text-gray-600',
};

const LINKS_STORAGE_KEY = 'mangone_resource_links';

interface ResourceLink {
  id: string;
  name: string;
  url: string;
  category: string;
  created_at: string;
}

function loadLinks(): ResourceLink[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LINKS_STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveLinks(links: ResourceLink[]) {
  localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(links));
}

function AddLinkModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (link: ResourceLink) => void;
}) {
  const [name, setName]         = useState('');
  const [url, setUrl]           = useState('');
  const [category, setCategory] = useState(LINK_CATEGORIES[0]);
  const [error, setError]       = useState('');

  const handle = () => {
    if (!name.trim())  { setError('El nombre es requerido.');  return; }
    if (!url.trim())   { setError('La URL es requerida.');     return; }
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
    onCreate({ id: Date.now().toString(), name: name.trim(), url: finalUrl, category, created_at: new Date().toISOString() });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(12,32,84,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-2xl w-full max-w-md shadow-2xl p-7 space-y-5"
        style={{ boxShadow: '0 32px 80px rgba(12,32,84,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--s-0c2054)] flex items-center justify-center">
              <Link2 className="w-4 h-4 text-[var(--t-f79c31)]" />
            </div>
            <h3 className="font-bold text-[var(--t-0c2054)]">Agregar link</h3>
          </div>
          <button onClick={onClose} className="text-[var(--t-9ca3af)] hover:text-[var(--t-374151)]"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--t-6b7280)] uppercase tracking-widest mb-1.5">Nombre</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ej. Canva, Buffer, Notion…"
              className="w-full px-4 py-3 rounded-xl border border-[var(--s-e5e7eb)] bg-[var(--s-f9fafb)] text-sm text-[var(--t-111827)] placeholder-[var(--t-c4c8d4)] outline-none focus:border-[var(--s-0c2054)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[#0C2054]/10 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--t-6b7280)] uppercase tracking-widest mb-1.5">URL</label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full px-4 py-3 rounded-xl border border-[var(--s-e5e7eb)] bg-[var(--s-f9fafb)] text-sm text-[var(--t-111827)] placeholder-[var(--t-c4c8d4)] outline-none focus:border-[var(--s-0c2054)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[#0C2054]/10 transition-all"
              onKeyDown={e => e.key === 'Enter' && handle()}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--t-6b7280)] uppercase tracking-widest mb-1.5">Categoría</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--s-e5e7eb)] bg-[var(--s-f9fafb)] text-sm text-[var(--t-111827)] outline-none focus:border-[var(--s-0c2054)] focus:bg-[var(--surface)] transition-all"
            >
              {LINK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">⚠️ {error}</div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--s-e5e7eb)] text-sm text-[var(--t-6b7280)] font-medium hover:bg-[var(--s-f9fafb)] transition-colors">
            Cancelar
          </button>
          <button
            onClick={handle}
            className="flex-1 py-3 rounded-xl bg-[var(--s-0c2054)] text-white text-sm font-semibold hover:bg-[var(--s-0f2960)] transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Link2 className="w-4 h-4" /> Guardar link
          </button>
        </div>
      </div>
    </div>
  );
}

function LinkCard({ link, onDelete }: { link: ResourceLink; onDelete: () => void }) {
  const colorCls = LINK_CATEGORY_COLORS[link.category] ?? LINK_CATEGORY_COLORS['Otros'];
  let domain = '';
  try { domain = new URL(link.url).hostname.replace('www.', ''); } catch { domain = link.url; }

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8e8f0)] p-5 hover:border-[#0C2054]/20 hover:shadow-md transition-all group flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[var(--s-f0f2f8)] flex items-center justify-center flex-shrink-0">
            <Globe className="w-4 h-4 text-[var(--t-0c2054)]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[var(--t-0c2054)] text-sm truncate">{link.name}</p>
            <p className="text-xs text-[var(--t-9ca3af)] truncate">{domain}</p>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-[var(--t-c4c8d4)] hover:text-red-500 transition-all flex-shrink-0 p-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <span className={`self-start text-[11px] font-semibold px-2.5 py-1 rounded-full ${colorCls}`}>
        {link.category}
      </span>

      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--s-f0f2f8)] hover:bg-[var(--s-0c2054)] text-[var(--t-0c2054)] hover:text-white text-xs font-semibold transition-all"
      >
        <ExternalLink className="w-3.5 h-3.5" /> Abrir enlace
      </a>
    </div>
  );
}

function LinksTab() {
  const [links, setLinks]           = useState<ResourceLink[]>([]);
  const [showModal, setShowModal]   = useState(false);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('Todos');

  useEffect(() => { setLinks(loadLinks()); }, []);

  const persist = (updated: ResourceLink[]) => { saveLinks(updated); setLinks(updated); };

  const handleCreate = (link: ResourceLink) => persist([link, ...links]);
  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar este link?')) return;
    persist(links.filter(l => l.id !== id));
  };

  const usedCats = ['Todos', ...Array.from(new Set(links.map(l => l.category)))];
  const filtered = links.filter(l => {
    const matchCat    = catFilter === 'Todos' || l.category === catFilter;
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.url.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="px-10 pb-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--s-0c2054)] flex items-center justify-center">
            <Link2 className="w-5 h-5 text-[var(--t-f79c31)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--t-0c2054)]">Links de Recursos</h2>
            <p className="text-sm text-[var(--t-9ca3af)]">{links.length} enlace{links.length !== 1 ? 's' : ''} guardado{links.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--s-0c2054)] text-white text-sm font-semibold hover:bg-[var(--s-0f2960)] transition-all shadow-md"
        >
          <Plus className="w-4 h-4" /> Agregar link
        </button>
      </div>

      {/* Search + Category filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t-9ca3af)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar links…"
            className="pl-9 pr-4 py-2.5 rounded-xl border border-[var(--s-e5e7eb)] bg-[var(--surface)] text-sm text-[var(--t-111827)] placeholder-[var(--t-9ca3af)] outline-none focus:border-[var(--s-0c2054)] focus:ring-2 focus:ring-[#0C2054]/10 transition-all w-56"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {usedCats.map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                catFilter === cat
                  ? 'bg-[var(--s-0c2054)] text-white border-[var(--s-0c2054)] shadow-sm'
                  : 'bg-[var(--surface)] text-[var(--t-6b7280)] border-[var(--s-e5e7eb)] hover:border-[var(--s-d1d5db)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface)] rounded-2xl border border-dashed border-[var(--s-e5e7eb)]">
          <div className="w-14 h-14 rounded-2xl bg-[var(--s-f0f2f8)] flex items-center justify-center mx-auto mb-4">
            <Link2 className="w-6 h-6 text-[var(--t-9ca3af)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--t-374151)]">
            {links.length === 0 ? 'Aún no hay links guardados' : 'Sin resultados para este filtro'}
          </p>
          <p className="text-xs text-[var(--t-9ca3af)] mt-1">
            {links.length === 0 && 'Haz clic en "Agregar link" para guardar tu primer recurso.'}
          </p>
          {links.length === 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--s-0c2054)] text-white text-sm font-semibold hover:bg-[var(--s-0f2960)] transition-all shadow-md mx-auto"
            >
              <Plus className="w-4 h-4" /> Agregar primer link
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(link => (
            <LinkCard key={link.id} link={link} onDelete={() => handleDelete(link.id)} />
          ))}
        </div>
      )}

      {showModal && <AddLinkModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}
    </div>
  );
}

// ── BrainstormingTab ──────────────────────────────────────────────────────────

function BrainstormingTab() {
  const [ideas, setIdeas] = useState<BrainstormingIdea[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [filterAuthor, setFilterAuthor] = useState('Todos');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIdeas(loadIdeas());
    setMounted(true);
  }, []);

  const persist = (updated: BrainstormingIdea[]) => {
    setIdeas(updated);
    saveIdeas(updated);
  };

  const handleCreate = (idea: BrainstormingIdea) => persist([idea, ...ideas]);

  const handleLike = (id: string) => {
    persist(ideas.map(idea =>
      idea.id === id
        ? { ...idea, liked: !idea.liked, likes: idea.liked ? idea.likes - 1 : idea.likes + 1 }
        : idea
    ));
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar esta idea?')) return;
    persist(ideas.filter(i => i.id !== id));
  };

  const filtered = ideas.filter(i => {
    if (filterCategory !== 'Todos' && i.category !== filterCategory) return false;
    if (filterAuthor !== 'Todos' && i.author !== filterAuthor) return false;
    return true;
  });

  const totalLikes = ideas.reduce((s, i) => s + i.likes, 0);

  return (
    <div className="space-y-6">
      <AddIdeaModal open={addOpen} onClose={() => setAddOpen(false)} onCreate={handleCreate} />

      {/* Header */}
      <div className="bg-gradient-to-r from-[#0C2054] to-[#1a3a7a] rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-[-40px] right-[-40px] w-40 h-40 rounded-full bg-[#F79C31]/10" />
        <div className="absolute bottom-[-30px] left-[200px] w-28 h-28 rounded-full bg-white/5" />
        <p className="text-[var(--t-f79c31)] text-xs font-semibold uppercase tracking-widest mb-2">Board colaborativo</p>
        <h2 className="text-white text-2xl font-bold mb-1.5">Brainstorming</h2>
        <p className="text-white/60 text-sm max-w-xl">
          Espacio para que el equipo capture y comparta ideas libremente. Agrega, vota y filtra ideas de todos los miembros.
        </p>
        <div className="flex items-center gap-6 mt-4">
          <div>
            <p className="text-white text-xl font-bold">{ideas.length}</p>
            <p className="text-white/50 text-xs">Ideas totales</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <p className="text-white text-xl font-bold">{totalLikes}</p>
            <p className="text-white/50 text-xs">Likes acumulados</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <p className="text-white text-xl font-bold">{new Set(ideas.map(i => i.author)).size}</p>
            <p className="text-white/50 text-xs">Colaboradores activos</p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="ml-auto flex items-center gap-2 bg-[var(--s-f79c31)] text-[var(--t-0c2054)] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[var(--s-e08a20)] transition-colors shadow-md"
          >
            <Lightbulb className="w-4 h-4" /> Nueva idea
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-[var(--t-8888a8)]" />
          <span className="text-xs font-semibold text-[var(--t-4a4a6a)]">Categoría:</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['Todos', ...BRAINSTORM_CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                filterCategory === cat
                  ? 'bg-[var(--s-0c2054)] text-white border-[var(--s-0c2054)]'
                  : 'bg-[var(--surface)] text-[var(--t-4a4a6a)] border-[var(--s-e8e8f0)] hover:border-[var(--s-d0d0e0)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="ml-4 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[var(--t-8888a8)]" />
          <span className="text-xs font-semibold text-[var(--t-4a4a6a)]">Autor:</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['Todos', ...TEAM_MEMBERS.map(m => m.name)].map(name => (
            <button
              key={name}
              onClick={() => setFilterAuthor(name)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                filterAuthor === name
                  ? 'text-white border-transparent'
                  : 'bg-[var(--surface)] text-[var(--t-4a4a6a)] border-[var(--s-e8e8f0)] hover:border-[var(--s-d0d0e0)]'
              }`}
              style={filterAuthor === name && name !== 'Todos' ? { background: MEMBER_COLORS[name] ?? '#0C2054', borderColor: 'transparent' } : filterAuthor === name ? { background: 'var(--s-0c2054)' } : {}}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      {!mounted ? null : filtered.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--s-fef3c7)] flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-[var(--t-f79c31)]" />
          </div>
          <h3 className="font-bold text-[var(--t-0c2054)] text-lg mb-2">
            {ideas.length === 0 ? 'El board está vacío' : 'Sin ideas con estos filtros'}
          </h3>
          <p className="text-[var(--t-6b7280)] text-sm mb-6 max-w-sm mx-auto">
            {ideas.length === 0
              ? 'Sé el primero en agregar una idea al board del equipo.'
              : 'Prueba cambiando los filtros para ver más ideas.'}
          </p>
          {ideas.length === 0 && (
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 bg-[var(--s-f79c31)] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--s-e08a20)] transition-all"
            >
              <Plus className="w-4 h-4" /> Agregar primera idea
            </button>
          )}
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-0">
          {filtered.map(idea => (
            <div key={idea.id} className="break-inside-avoid mb-4">
              <IdeaCard
                idea={idea}
                onLike={() => handleLike(idea.id)}
                onDelete={() => handleDelete(idea.id)}
              />
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-[var(--t-8888a8)] text-right">
          Mostrando {filtered.length} de {ideas.length} idea{ideas.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

const BRAND_COLORS = [
  { name: 'Naranja Mangone', hex: '#F79C31', rgb: '247, 156, 49', cmyk: '0, 53, 86, 0' },
  { name: 'Azul Mangone', hex: '#0C2054', rgb: '12, 32, 84', cmyk: '99, 100, 44, 17' },
  { name: 'Marrón Oscuro', hex: '#3B3537', rgb: '59, 53, 53', cmyk: '78, 80, 67, 41' },
  { name: 'Negro Texto', hex: '#000000', rgb: '0, 0, 0', cmyk: '84, 83, 73, 80' },
  { name: 'Blanco', hex: '#FFFFFF', rgb: '255, 255, 255', cmyk: '0, 0, 0, 0' },
];

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString('es-US', { month: 'short', day: 'numeric' });
}

// ── Color Swatch ─────────────────────────────────────────────────────────────

function ColorSwatch({ color }: { color: typeof BRAND_COLORS[0] }) {
  const [copied, setCopied] = useState(false);
  const copyHex = () => {
    navigator.clipboard.writeText(color.hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div
      className="rounded-xl overflow-hidden border border-[var(--s-e8e8f0)] hover:shadow-md transition-all cursor-pointer"
      onClick={copyHex}
    >
      <div className="h-24 w-full" style={{ background: color.hex }} />
      <div className="p-3 bg-[var(--surface)]">
        <p className="font-bold text-sm text-[var(--t-1a1a2e)]">{color.name}</p>
        <p className="text-xs text-[var(--t-8888a8)] mt-1 font-mono">
          {copied ? '¡Copiado!' : color.hex}
        </p>
        <p className="text-[10px] text-[var(--t-8888a8)] mt-0.5">RGB: {color.rgb}</p>
      </div>
    </div>
  );
}

// ── Document Card ─────────────────────────────────────────────────────────────

function DocumentCard({
  doc,
  onView,
  onDownload,
  onDelete,
}: {
  doc: ApiDocument;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const ext = (doc.file_type || 'other').toUpperCase();
  const sc = statusConfig[doc.status] ?? statusConfig.active;

  return (
    <Card hover className="p-4">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
            fileTypeColors[doc.file_type] || 'bg-gray-50 text-gray-600'
          }`}
        >
          {ext}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--t-1a1a2e)] leading-tight mb-1 line-clamp-2">
            {doc.title}
          </p>
          {doc.description && (
            <p className="text-xs text-[var(--t-8888a8)] line-clamp-2 mb-2">{doc.description}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.color}`}>
              {sc.label}
            </span>
            <span className="text-[10px] text-[var(--t-8888a8)]">
              v{doc.version} · {doc.size_display}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--s-f0f0f0)]">
        <span className="text-[10px] text-[var(--t-8888a8)] flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatRelative(doc.updated_at)}
          {doc.uploaded_by_name && (
            <span className="ml-1">· {doc.uploaded_by_name}</span>
          )}
        </span>
        <div className="flex gap-1">
          <button
            onClick={onView}
            title="Ver documento"
            className="p-1.5 rounded-lg hover:bg-[var(--s-f7f8fc)] text-[var(--t-8888a8)] hover:text-[var(--t-4a4a6a)] transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDownload}
            title="Descargar"
            className="p-1.5 rounded-lg hover:bg-[var(--s-fef5e7)] text-[var(--t-8888a8)] hover:text-[var(--t-f79c31)] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Eliminar"
            className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--t-8888a8)] hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}

// ── Upload Modal ──────────────────────────────────────────────────────────────

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function UploadModal({ onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('sop');
  const [description, setDescription] = useState('');
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
    setError('');
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [title]);

  const submit = async () => {
    if (!file || !title.trim()) {
      setError('Selecciona un archivo y escribe un título.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      await documentsApi.upload(
        file,
        { title: title.trim(), description: description.trim(), category },
        (pct) => setProgress(pct),
      );
      setDone(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message ?? 'Error al subir el archivo.');
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--s-f0f0f0)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F79C31]/10 flex items-center justify-center">
              <CloudUpload className="w-5 h-5 text-[var(--t-f79c31)]" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--t-1a1a2e)]">Subir documento</h3>
              <p className="text-xs text-[var(--t-8888a8)]">PDF, DOCX, PPTX, XLSX, imágenes · máx. 50 MB</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--s-f7f8fc)] text-[var(--t-8888a8)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragging
                ? 'border-[var(--s-f79c31)] bg-[var(--s-fef5e7)]'
                : file
                ? 'border-green-300 bg-green-50'
                : 'border-[var(--s-e8e8f0)] hover:border-[#F79C31]/50 hover:bg-[#fef5e7]/30'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-[var(--t-1a1a2e)]">{file.name}</p>
                  <p className="text-xs text-[var(--t-8888a8)]">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setTitle(''); }}
                  className="ml-auto p-1 rounded-full hover:bg-red-100 text-[var(--t-8888a8)] hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-[var(--t-d0d0e0)] mx-auto mb-2" />
                <p className="text-sm text-[var(--t-4a4a6a)] font-medium">
                  Arrastra el archivo aquí o <span className="text-[var(--t-f79c31)]">selecciona</span>
                </p>
              </>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre del documento"
              className="w-full px-3 py-2.5 text-sm border border-[var(--s-e8e8f0)] rounded-lg outline-none focus:border-[var(--s-f79c31)] transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[var(--s-e8e8f0)] rounded-lg outline-none focus:border-[var(--s-f79c31)] bg-[var(--surface)] transition-colors"
            >
              {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">
              Descripción <span className="text-[var(--t-8888a8)] font-normal">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción del documento..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-[var(--s-e8e8f0)] rounded-lg outline-none focus:border-[var(--s-f79c31)] transition-colors resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs">{error}</p>
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div>
              <div className="flex justify-between text-xs text-[var(--t-8888a8)] mb-1.5">
                <span>{done ? 'Completado' : 'Subiendo...'}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-[var(--s-f0f0f0)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    done ? 'bg-green-500' : 'bg-[var(--s-f79c31)]'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-sm font-semibold text-[var(--t-4a4a6a)] border border-[var(--s-e8e8f0)] rounded-lg hover:bg-[var(--s-f7f8fc)] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={uploading || !file}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[var(--s-f79c31)] rounded-lg hover:bg-[var(--s-e08a20)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {done ? 'Listo' : uploading ? 'Subiendo...' : 'Subir documento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteModal({
  doc,
  onClose,
  onConfirm,
}: {
  doc: ApiDocument;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="font-bold text-[var(--t-1a1a2e)]">Eliminar documento</h3>
        </div>
        <p className="text-sm text-[var(--t-4a4a6a)] mb-1">
          ¿Estás seguro de que quieres eliminar <strong>"{doc.title}"</strong>?
        </p>
        <p className="text-xs text-[var(--t-8888a8)] mb-6">Esta acción no se puede deshacer.</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[var(--t-4a4a6a)] border border-[var(--s-e8e8f0)] rounded-lg hover:bg-[var(--s-f7f8fc)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AvatarSection ─────────────────────────────────────────────────────────────

function AvatarSection({
  title,
  icon,
  items,
  bgColor,
  textColor,
  editing,
  onUpdate,
  placeholder,
}: {
  title: string;
  icon: string;
  items: string[];
  bgColor: string;
  textColor: string;
  editing: boolean;
  onUpdate: (items: string[]) => void;
  placeholder: string;
}) {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    const val = newItem.trim();
    if (!val) return;
    onUpdate([...items, val]);
    setNewItem('');
  };

  const removeItem = (i: number) => onUpdate(items.filter((_, idx) => idx !== i));

  return (
    <div className="rounded-xl p-4 h-full flex flex-col" style={{ background: bgColor }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{icon}</span>
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: textColor }}>{title}</p>
      </div>
      <div className="flex-1 space-y-1.5">
        {items.length === 0 && !editing && (
          <p className="text-xs opacity-40 italic" style={{ color: textColor }}>Sin información</p>
        )}
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-1.5 group">
            <span className="text-[10px] mt-0.5 flex-shrink-0 opacity-60" style={{ color: textColor }}>→</span>
            <p className="text-xs leading-snug flex-1" style={{ color: textColor }}>{item}</p>
            {editing && (
              <button onClick={() => removeItem(i)}
                className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded flex items-center justify-center transition-opacity flex-shrink-0">
                <X className="w-2.5 h-2.5" style={{ color: textColor }} />
              </button>
            )}
          </div>
        ))}
      </div>
      {editing && (
        <div className="mt-3 flex gap-1">
          <input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem())}
            placeholder={placeholder}
            className="flex-1 text-xs px-2 py-1.5 rounded-lg border-0 outline-none"
            style={{ background: 'rgba(255,255,255,0.3)', color: textColor }}
          />
          <button onClick={addItem}
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.3)', color: textColor }}>
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── DemographicsCard ──────────────────────────────────────────────────────────

function DemographicsCard({
  avatar,
  editing,
  onChange,
}: {
  avatar: ApiCustomerAvatar;
  editing: boolean;
  onChange: (field: keyof ApiCustomerAvatar, value: string) => void;
}) {
  const fields = [
    { key: 'age_range' as const, label: 'Edad', placeholder: 'ej. 25–45 años' },
    { key: 'origin_country' as const, label: 'Origen', placeholder: 'ej. México, Guatemala...' },
    { key: 'location' as const, label: 'Ciudad/Estado EE.UU.', placeholder: 'ej. New Jersey' },
    { key: 'immigration_status' as const, label: 'Status migratorio', placeholder: 'ej. Indocumentado, TPS...' },
    { key: 'occupation' as const, label: 'Ocupación', placeholder: 'ej. Construcción, Limpieza...' },
    { key: 'family_situation' as const, label: 'Familia', placeholder: 'ej. Casado, 2 hijos...' },
    { key: 'income_range' as const, label: 'Ingreso aprox.', placeholder: 'ej. $30K–$50K/año' },
    { key: 'education' as const, label: 'Educación', placeholder: 'ej. Secundaria completa' },
  ];

  return (
    <div className="rounded-xl p-4 h-full flex flex-col" style={{ background: 'var(--s-0c2054)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">📊</span>
        <p className="text-xs font-bold uppercase tracking-wide text-white/80">Datos demográficos</p>
      </div>
      <div className="flex-1 space-y-1.5">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key} className="flex gap-2 items-baseline">
            <span className="text-[10px] text-white/40 w-20 flex-shrink-0 leading-none pt-0.5">{label}</span>
            {editing ? (
              <input
                value={avatar[key] as string}
                onChange={e => onChange(key, e.target.value)}
                placeholder={placeholder}
                className="flex-1 text-xs text-white bg-white/10 rounded px-2 py-1 outline-none border border-white/10 focus:border-white/30 placeholder:text-white/20"
              />
            ) : (
              <span className="text-xs text-white font-medium leading-snug">
                {(avatar[key] as string) || <span className="text-white/25 italic">—</span>}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AvatarCanvas ──────────────────────────────────────────────────────────────

function AvatarCanvas({
  avatar,
  onSave,
  onDelete,
  onSetPrimary,
}: {
  avatar: ApiCustomerAvatar;
  onSave: (data: Partial<ApiCustomerAvatar>) => Promise<void>;
  onDelete: () => Promise<void>;
  onSetPrimary: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ApiCustomerAvatar>(avatar);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(avatar); }, [avatar]);

  const updateList = (field: keyof ApiCustomerAvatar, items: string[]) =>
    setDraft(d => ({ ...d, [field]: items }));

  const updateField = (field: keyof ApiCustomerAvatar, value: string) =>
    setDraft(d => ({ ...d, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(draft); setEditing(false); }
    catch (err: any) { alert(`Error al guardar: ${err.message || 'Error desconocido'}`); }
    finally { setSaving(false); }
  };

  const handleCancel = () => { setDraft(avatar); setEditing(false); };

  const SECTION_COLORS = {
    goals:          { bg: 'rgba(16,185,129,0.12)',  text: '#065f46', icon: '🎯', title: 'Metas y Objetivos',       placeholder: 'Agregar meta...' },
    pain_points:    { bg: 'rgba(239,68,68,0.10)',   text: '#7f1d1d', icon: '😓', title: 'Dolores y Frustraciones',  placeholder: 'Agregar dolor...' },
    values:         { bg: 'rgba(247,156,49,0.12)',  text: '#78350f', icon: '💛', title: 'Valores',                 placeholder: 'Agregar valor...' },
    dreams:         { bg: 'rgba(139,92,246,0.10)',  text: '#4c1d95', icon: '✨', title: 'Sueños y Aspiraciones',   placeholder: 'Agregar sueño...' },
    interests:      { bg: 'rgba(6,182,212,0.10)',   text: '#164e63', icon: '🎵', title: 'Intereses y Hobbies',     placeholder: 'Agregar interés...' },
    favorite_brands:{ bg: 'rgba(236,72,153,0.10)', text: '#831843', icon: '⭐', title: 'Marcas y Medios',          placeholder: 'Agregar marca...' },
    objections:     { bg: 'rgba(107,114,128,0.10)', text: '#1f2937', icon: '🚧', title: 'Objeciones',              placeholder: 'Agregar objeción...' },
    triggers:       { bg: 'rgba(247,156,49,0.10)',  text: '#78350f', icon: '⚡', title: 'Detonadores de Acción',    placeholder: 'Agregar detonador...' },
    media_channels: { bg: 'rgba(12,32,84,0.08)',    text: '#0C2054', icon: '📱', title: 'Canales de Información',   placeholder: 'Agregar canal...' },
  };

  return (
    <div className="space-y-4">
      {/* Avatar header */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 border-2"
              style={{ background: `${draft.color}15`, borderColor: `${draft.color}30` }}>
              {editing ? (
                <input value={draft.emoji} onChange={e => updateField('emoji', e.target.value)}
                  className="w-12 text-center text-3xl bg-transparent outline-none" maxLength={2} />
              ) : draft.emoji}
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <input value={draft.name} onChange={e => updateField('name', e.target.value)}
                    className="w-full text-lg font-bold text-[var(--t-0c2054)] border border-[var(--s-e5e7eb)] rounded-lg px-3 py-1.5 outline-none focus:border-[var(--s-0c2054)]"
                    placeholder="Nombre del avatar..." />
                  <input value={draft.description} onChange={e => updateField('description', e.target.value)}
                    className="w-full text-sm text-[var(--t-6b7280)] border border-[var(--s-e5e7eb)] rounded-lg px-3 py-1.5 outline-none focus:border-[var(--s-0c2054)]"
                    placeholder="Descripción breve..." />
                  <input value={draft.quote} onChange={e => updateField('quote', e.target.value)}
                    className="w-full text-sm italic border border-[var(--s-e5e7eb)] rounded-lg px-3 py-1.5 outline-none focus:border-[var(--s-f79c31)]"
                    placeholder='"Frase que representa al avatar..."' />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-[var(--t-0c2054)]">{avatar.name}</h3>
                    {avatar.is_primary && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--s-f79c31)] text-[var(--t-0c2054)]">PRINCIPAL</span>
                    )}
                  </div>
                  {avatar.description && <p className="text-sm text-[var(--t-6b7280)] mt-0.5">{avatar.description}</p>}
                  {avatar.quote && (
                    <p className="text-sm italic text-[var(--t-374151)] mt-1 border-l-2 border-[var(--s-f79c31)] pl-3">
                      "{avatar.quote}"
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!avatar.is_primary && !editing && (
              <button onClick={onSetPrimary}
                className="text-xs text-[var(--t-6b7280)] border border-[var(--s-e5e7eb)] px-3 py-1.5 rounded-lg hover:bg-[var(--s-f9fafb)] transition-colors">
                Marcar como principal
              </button>
            )}
            {editing ? (
              <>
                <button onClick={handleCancel}
                  className="text-xs text-[var(--t-6b7280)] border border-[var(--s-e5e7eb)] px-3 py-1.5 rounded-lg hover:bg-[var(--s-f9fafb)] transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="text-xs font-semibold text-white bg-[var(--s-0c2054)] px-4 py-1.5 rounded-lg hover:bg-[var(--s-1a3a7a)] disabled:opacity-50 transition-colors flex items-center gap-1.5">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Guardar
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[var(--t-0c2054)] border border-[#0C2054]/20 bg-[#0C2054]/5 px-3 py-1.5 rounded-lg hover:bg-[#0C2054]/10 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={onDelete}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--t-9ca3af)] hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Canvas grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Row 1: Metas | Demografía | Dolores */}
        <div className="min-h-[180px]">
          <AvatarSection
            bgColor={SECTION_COLORS.goals.bg}
            textColor={SECTION_COLORS.goals.text}
            icon={SECTION_COLORS.goals.icon}
            title={SECTION_COLORS.goals.title}
            placeholder={SECTION_COLORS.goals.placeholder}
            items={draft.goals}
            editing={editing}
            onUpdate={items => updateList('goals', items)}
          />
        </div>
        <div className="row-span-2 min-h-[380px]">
          <DemographicsCard avatar={draft} editing={editing} onChange={updateField} />
        </div>
        <div className="min-h-[180px]">
          <AvatarSection
            bgColor={SECTION_COLORS.pain_points.bg}
            textColor={SECTION_COLORS.pain_points.text}
            icon={SECTION_COLORS.pain_points.icon}
            title={SECTION_COLORS.pain_points.title}
            placeholder={SECTION_COLORS.pain_points.placeholder}
            items={draft.pain_points}
            editing={editing}
            onUpdate={items => updateList('pain_points', items)}
          />
        </div>

        {/* Row 2: Valores | [demog. continúa] | Sueños */}
        <div className="min-h-[180px]">
          <AvatarSection
            bgColor={SECTION_COLORS.values.bg}
            textColor={SECTION_COLORS.values.text}
            icon={SECTION_COLORS.values.icon}
            title={SECTION_COLORS.values.title}
            placeholder={SECTION_COLORS.values.placeholder}
            items={draft.values}
            editing={editing}
            onUpdate={items => updateList('values', items)}
          />
        </div>
        <div className="min-h-[180px]">
          <AvatarSection
            bgColor={SECTION_COLORS.dreams.bg}
            textColor={SECTION_COLORS.dreams.text}
            icon={SECTION_COLORS.dreams.icon}
            title={SECTION_COLORS.dreams.title}
            placeholder={SECTION_COLORS.dreams.placeholder}
            items={draft.dreams}
            editing={editing}
            onUpdate={items => updateList('dreams', items)}
          />
        </div>

        {/* Row 3: Intereses | Marcas y Medios | Canales */}
        <div className="min-h-[160px]">
          <AvatarSection
            bgColor={SECTION_COLORS.interests.bg}
            textColor={SECTION_COLORS.interests.text}
            icon={SECTION_COLORS.interests.icon}
            title={SECTION_COLORS.interests.title}
            placeholder={SECTION_COLORS.interests.placeholder}
            items={draft.interests}
            editing={editing}
            onUpdate={items => updateList('interests', items)}
          />
        </div>
        <div className="min-h-[160px]">
          <AvatarSection
            bgColor={SECTION_COLORS.favorite_brands.bg}
            textColor={SECTION_COLORS.favorite_brands.text}
            icon={SECTION_COLORS.favorite_brands.icon}
            title={SECTION_COLORS.favorite_brands.title}
            placeholder={SECTION_COLORS.favorite_brands.placeholder}
            items={draft.favorite_brands}
            editing={editing}
            onUpdate={items => updateList('favorite_brands', items)}
          />
        </div>
        <div className="min-h-[160px]">
          <AvatarSection
            bgColor={SECTION_COLORS.media_channels.bg}
            textColor={SECTION_COLORS.media_channels.text}
            icon={SECTION_COLORS.media_channels.icon}
            title={SECTION_COLORS.media_channels.title}
            placeholder={SECTION_COLORS.media_channels.placeholder}
            items={draft.media_channels}
            editing={editing}
            onUpdate={items => updateList('media_channels', items)}
          />
        </div>

        {/* Row 4: Objeciones (2 cols) + Triggers */}
        <div className="col-span-2 min-h-[130px]">
          <AvatarSection
            bgColor={SECTION_COLORS.objections.bg}
            textColor={SECTION_COLORS.objections.text}
            icon={SECTION_COLORS.objections.icon}
            title={SECTION_COLORS.objections.title}
            placeholder={SECTION_COLORS.objections.placeholder}
            items={draft.objections}
            editing={editing}
            onUpdate={items => updateList('objections', items)}
          />
        </div>
        <div className="min-h-[130px]">
          <AvatarSection
            bgColor={SECTION_COLORS.triggers.bg}
            textColor={SECTION_COLORS.triggers.text}
            icon={SECTION_COLORS.triggers.icon}
            title={SECTION_COLORS.triggers.title}
            placeholder={SECTION_COLORS.triggers.placeholder}
            items={draft.triggers}
            editing={editing}
            onUpdate={items => updateList('triggers', items)}
          />
        </div>
      </div>

      <p className="text-xs text-[var(--t-9ca3af)] text-right">Última actualización: {avatar.updated_at_display}</p>
    </div>
  );
}

// ── CreateAvatarModal ─────────────────────────────────────────────────────────

function CreateAvatarModal({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: Partial<ApiCustomerAvatar>) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('👤');
  const [color, setColor] = useState('#0C2054');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const COLORS = ['#0C2054', '#F79C31', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f59e0b'];
  const EMOJIS = ['👤', '👩', '👨', '👩‍👧', '👨‍👩‍👧', '👩🏽', '👨🏽', '🧑🏽', '👵🏽', '👴🏽'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es requerido'); return; }
    setLoading(true);
    setError('');
    try {
      await onCreate({ name: name.trim(), description: description.trim(), emoji, color });
      onClose();
      setName(''); setDescription(''); setEmoji('👤'); setColor('#0C2054');
    } catch { setError('Error al crear el avatar'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--s-f0f2f8)]">
          <h2 className="font-bold text-[var(--t-0c2054)] text-lg">Nuevo Avatar</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--t-9ca3af)] hover:bg-[var(--s-f0f2f8)] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 border-2" style={{ background: `${color}15`, borderColor: `${color}30` }}>
              {emoji}
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-[var(--t-374151)] mb-1.5">Emoji</p>
              <div className="flex gap-1.5 flex-wrap">
                {EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => setEmoji(e)}
                    className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${emoji === e ? 'bg-[#0C2054]/10 ring-2 ring-[var(--s-0c2054)]' : 'hover:bg-[var(--s-f0f2f8)]'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--t-374151)] mb-1.5">Nombre del avatar *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="ej. María - La Madre Inmigrante"
              className="w-full border border-[var(--s-e5e7eb)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--t-374151)] mb-1.5">Descripción breve</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="ej. Madre de 35 años buscando regularizar su estatus..."
              className="w-full border border-[var(--s-e5e7eb)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--t-374151)] mb-1.5">Color de acento</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-[var(--s-e5e7eb)] text-[var(--t-374151)] rounded-xl py-2.5 text-sm font-medium hover:bg-[var(--s-f9fafb)] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[var(--s-0c2054)] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[var(--s-1a3a7a)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear avatar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── SOPs ──────────────────────────────────────────────────────────────────────

interface SOPStep {
  num: string;
  action: string;
  responsible: string;
  tool: string;
}

interface SOPPhase {
  id: string;
  num: string;
  title: string;
  subtitle: string;
  steps: SOPStep[];
}

interface SOPRole {
  initials: string;
  name: string;
  desc: string;
}

interface SOPData {
  id: string;
  name: string;
  roles: SOPRole[];
  tools: string[];
  rules: string[];
  phases: SOPPhase[];
}

const SOP_STORAGE_KEY = 'mangone_sops_data';

const INITIAL_SOPS_DATA: SOPData[] = [
  {
    "id": "contenido",
    "name": "Contenido",
    "roles": [
      {
        "initials": "AA",
        "name": "Alejandra Andrade",
        "desc": "Community Manager — Planificación editorial, captions, programación, publicación, monitoreo, reportes y análisis"
      },
      {
        "initials": "SC",
        "name": "Sara Castaño",
        "desc": "Diseñadora Gráfica — Diseño de piezas para redes sociales y uso interno, edición de video, flyers de eventos de consulta (21 días de anticipación)"
      },
      {
        "initials": "GL",
        "name": "Gloriana López",
        "desc": "Creadora de Contenido — Grabación de videos e historias orgánicas, edición y búsqueda de trends"
      },
      {
        "initials": "SQ",
        "name": "Sebastián Quijada",
        "desc": "Aprobación de grilla, requerimientos extraordinarios, análisis de datos y coordinación con C-Level"
      }
    ],
    "tools": [
      "Gemini — Captions y copys",
      "Canva — Diseño de piezas gráficas",
      "Dropbox — Almacenamiento de assets",
      "Meta Business Suite — Programación IG/FB",
      "TikTok — Carga manual",
      "YouTube Studio — Carga manual",
      "LinkedIn — Carga manual"
    ],
    "rules": [
      "Prohibido usar la palabra \"especialistas\" (restricción ética legal)",
      "Todo caption debe pasar por revisión de cumplimiento legal antes de programarse o publicarse",
      "Todas las historias deben incluir el disclaimer legal correspondiente",
      "Todo contenido debe mantener tono empático, esperanzador y no alarmista",
      "Sara genera el flyer del Evento de Consulta con mínimo 21 días de anticipación",
      "Todo asset visual se almacena en Dropbox, nunca en carpetas locales",
      "La grilla se planifica con 2 semanas de anticipación",
      "Requerimientos extraordinarios de diseño o grabación los asigna Sebastián o C-Level directamente"
    ],
    "phases": [
      {
        "id": "c-p1",
        "num": "1",
        "title": "Planificación Editorial",
        "subtitle": "Community Manager — Con 2 semanas de anticipación",
        "steps": [
          {
            "num": "1.1",
            "action": "Revisar noticias de la semana y resultados de la parrilla anterior para definir el contenido próximo",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "1.2",
            "action": "Revisar efemérides del período para identificar artes y promociones aplicables a la firma",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "1.3",
            "action": "Revisar tendencias de contenido en RRSS que puedan adaptarse a la marca",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "1.4",
            "action": "Generar la parrilla semanal con Claude (temas, formatos, plataformas)",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "1.5",
            "action": "Redactar captions y copys para cada pieza con Gemini, verificando cumplimiento legal de cada uno antes de incluirlos en la grilla",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "1.6",
            "action": "Entregar planificación completa a Sara (diseño) y Gloriana (grabación) para producción",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "1.7",
            "action": "Enviar grilla a aprobación de Sebastián Quijada",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "1.8",
            "action": "Revisar, aprobar o solicitar ajustes a la grilla",
            "responsible": "Sebastián Quijada",
            "tool": ""
          }
        ]
      },
      {
        "id": "c-p2",
        "num": "2",
        "title": "Producción de Contenido — Creadora",
        "subtitle": "Gloriana López — Organización semanal de grabación y edición",
        "steps": [
          {
            "num": "2.1",
            "action": "Lunes: Buscar ideas, referencias, audios de TikTok y trends virales. Organizar el contenido próximo a grabar según la planificación de CM",
            "responsible": "Gloriana López",
            "tool": ""
          },
          {
            "num": "2.2",
            "action": "Martes (Grabación): Grabar contenido según planificación de Alejandra como prioridad principal",
            "responsible": "Gloriana López",
            "tool": ""
          },
          {
            "num": "2.3",
            "action": "Miércoles: Editar videos informativos. Coordinar textos para videos compartibles",
            "responsible": "Gloriana López",
            "tool": ""
          },
          {
            "num": "2.4",
            "action": "Jueves (Grabación): Terminar planificación pendiente y/o contenido extra: CD, historias, TikTok, YouTube, videos solicitados por Sebastián o C-Level",
            "responsible": "Gloriana López",
            "tool": ""
          },
          {
            "num": "2.5",
            "action": "Viernes: Editar contenido grabado pendiente de la semana",
            "responsible": "Gloriana López",
            "tool": ""
          },
          {
            "num": "2.6",
            "action": "Fin de semana (si aplica): Completar videos compartibles pendientes (principalmente TikTok)",
            "responsible": "Gloriana López",
            "tool": ""
          },
          {
            "num": "2.7",
            "action": "Subir material grabado y editado a Dropbox en carpeta correspondiente",
            "responsible": "Gloriana López",
            "tool": ""
          }
        ]
      },
      {
        "id": "c-p3",
        "num": "3",
        "title": "Diseño y Edición — Diseñadora",
        "subtitle": "Sara Castaño — Piezas gráficas, edición y flyers de eventos",
        "steps": [
          {
            "num": "3.1",
            "action": "Recibir planificación de CM y requerimientos extraordinarios de Sebastián o C-Level",
            "responsible": "Sara Castaño",
            "tool": ""
          },
          {
            "num": "3.2",
            "action": "Diseñar piezas gráficas (posts, carruseles, artes de efemérides) según planificación aprobada",
            "responsible": "Sara Castaño",
            "tool": ""
          },
          {
            "num": "3.3",
            "action": "Editar videos recibidos de Gloriana (cortes, subtítulos, adaptación por plataforma)",
            "responsible": "Sara Castaño",
            "tool": ""
          },
          {
            "num": "3.4",
            "action": "Generar flyer del próximo Evento de Consulta con 21 días de anticipación",
            "responsible": "Sara Castaño",
            "tool": ""
          },
          {
            "num": "3.5",
            "action": "Subir piezas terminadas a Dropbox y notificar a Alejandra que están listas",
            "responsible": "Sara Castaño",
            "tool": ""
          }
        ]
      },
      {
        "id": "c-p4",
        "num": "4",
        "title": "Programación y Publicación",
        "subtitle": "Community Manager — Distribución en todas las plataformas",
        "steps": [
          {
            "num": "4.1",
            "action": "Programar posts de Instagram y Facebook con captions y horarios definidos en la grilla",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "4.2",
            "action": "Cargar manualmente contenido en TikTok con captions, hashtags y configuraciones nativas",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "4.3",
            "action": "Cargar manualmente Shorts en YouTube",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "4.4",
            "action": "Publicar manualmente en LinkedIn",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "4.5",
            "action": "Subir historias diarias manualmente en Instagram y Facebook incluyendo disclaimer legal",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "4.6",
            "action": "Verificar que todo el contenido programado se publicó correctamente en cada plataforma",
            "responsible": "Alejandra Andrade",
            "tool": ""
          }
        ]
      },
      {
        "id": "c-p5",
        "num": "5",
        "title": "Monitoreo y Cumplimiento Legal",
        "subtitle": "Community Manager — Supervisión continua del feed y captions",
        "steps": [
          {
            "num": "5.1",
            "action": "Revisar periódicamente el feed completo para detectar contenido fuera de cumplimiento legal",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "5.2",
            "action": "Escalar a Sebastián cualquier pieza que requiera corrección, retiro o posición legal",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "5.3",
            "action": "Verificar que todas las historias incluyen el disclaimer legal correspondiente",
            "responsible": "Alejandra Andrade",
            "tool": ""
          }
        ]
      },
      {
        "id": "c-p6",
        "num": "6",
        "title": "Reportes y Análisis",
        "subtitle": "Community Manager — Reporte semanal, mensual y planificación trimestral",
        "steps": [
          {
            "num": "6.1",
            "action": "Elaborar reporte semanal de métricas con resultados por plataforma y plan de acción",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "6.2",
            "action": "Elaborar informe mensual de análisis de la competencia",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "6.3",
            "action": "Desarrollar planificación estratégica trimestral de contenido",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "6.4",
            "action": "Presentar reportes y planificación a Sebastián para revisión y aprobación",
            "responsible": "Alejandra Andrade",
            "tool": ""
          }
        ]
      }
    ]
  },
  {
    "id": "webseo",
    "name": "Web & SEO",
    "roles": [
      {
        "initials": "AC",
        "name": "Andrés Coronel",
        "desc": "Desarrollador Web / SEO — Único acceso a Framer. Construcción, optimización, blogs, landings, tracking y reportes"
      },
      {
        "initials": "FP",
        "name": "Francisco Parra",
        "desc": "Paid Media — Define estrategia y estructura de campañas de Google Ads junto con Andrés"
      },
      {
        "initials": "SQ",
        "name": "Sebastián Quijada",
        "desc": "Aprobación de páginas nuevas, análisis de métricas web y alineación estratégica"
      }
    ],
    "tools": [
      "Framer — CMS y desarrollo web (acceso exclusivo: Andrés)",
      "Alli AI — Optimización SEO continua",
      "Google Search Console — Indexación y rendimiento orgánico",
      "Google Analytics — Tráfico y comportamiento",
      "Google Ads — Campañas vinculadas a landings",
      "HubSpot — Tracking de eventos e interacciones",
      "Google PageSpeed — Auditoría técnica",
      "IA (generación de blogs) — Redacción de contenido SEO"
    ],
    "rules": [
      "Solo Andrés Coronel tiene acceso a Framer — ningún otro miembro del equipo modifica el sitio",
      "Ninguna página nueva se publica sin aprobación de Marketing y/o Dirección",
      "Toda landing vinculada a Ads debe tener pixel de conversión verificado antes de activar campaña",
      "Toda página con formulario o CTA debe tener tracking de HubSpot activo antes de publicarse",
      "Los blogs se generan con IA pero Andrés revisa y aprueba antes de publicar",
      "Frecuencia mínima de blog: 2 publicaciones por semana",
      "Prohibido usar la palabra \"especialistas\" en cualquier página o blog",
      "Disclaimers legales requeridos en todas las páginas de servicios y landing pages"
    ],
    "phases": [
      {
        "id": "w-p1",
        "num": "1",
        "title": "Creación de Páginas Nuevas",
        "subtitle": "Por requerimiento de C-Level o necesidad de marketing",
        "steps": [
          {
            "num": "1.1",
            "action": "Recibir requerimiento de página nueva (C-Level o marketing) y documentarlo",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "1.2",
            "action": "Definir objetivo de la página: informativa, captación de leads o landing para Ads",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "1.3",
            "action": "Investigar keywords objetivo y definir estructura SEO de la página",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "1.4",
            "action": "Redactar copy de la página (títulos, cuerpo, CTAs) alineado a keywords y lineamientos de marca",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "1.5",
            "action": "Construir la página en Framer integrando copy, assets y estructura SEO",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "1.6",
            "action": "Configurar tracking de HubSpot en páginas con formularios o interacciones",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "1.7",
            "action": "Revisar y aprobar página antes de publicar",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "1.8",
            "action": "Publicar página y verificar indexación en Google Search Console",
            "responsible": "Andrés Coronel",
            "tool": ""
          }
        ]
      },
      {
        "id": "w-p2",
        "num": "2",
        "title": "Blog SEO",
        "subtitle": "2 publicaciones semanales generadas con IA",
        "steps": [
          {
            "num": "2.1",
            "action": "Identificar keywords con potencial de posicionamiento para los 2 blogs de la semana",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "2.2",
            "action": "Generar artículo con IA usando keyword objetivo, estructura H1-H3 y longitud adecuada",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "2.3",
            "action": "Revisar y editar el artículo: precisión legal, tono de marca, cumplimiento y calidad",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "2.4",
            "action": "Publicar el blog en Framer con metadatos SEO (título, meta descripción, slug, imagen)",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "2.5",
            "action": "Verificar indexación del artículo en Google Search Console",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "2.6",
            "action": "Monitorear posicionamiento del artículo a 30-60-90 días",
            "responsible": "Andrés Coronel",
            "tool": ""
          }
        ]
      },
      {
        "id": "w-p3",
        "num": "3",
        "title": "SEO On-Page Continuo",
        "subtitle": "Mejoras proactivas y optimización permanente",
        "steps": [
          {
            "num": "3.1",
            "action": "Revisar oportunidades de mejora SEO en páginas existentes (keywords, estructura, contenido)",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "3.2",
            "action": "Optimizar títulos, meta descripciones y headers (H1-H3) según oportunidades detectadas",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "3.3",
            "action": "Optimizar imágenes: alt text, compresión y nombres de archivo descriptivos",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "3.4",
            "action": "Revisar y actualizar enlaces internos entre páginas y blogs",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "3.5",
            "action": "Monitorear backlinks y buscar oportunidades de link building",
            "responsible": "Andrés Coronel",
            "tool": ""
          }
        ]
      },
      {
        "id": "w-p4",
        "num": "4",
        "title": "Auditoría Técnica Mensual",
        "subtitle": "Salud, rendimiento e indexación del sitio",
        "steps": [
          {
            "num": "4.1",
            "action": "Auditar velocidad de carga y Core Web Vitals",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "4.2",
            "action": "Verificar indexación correcta de todas las páginas activas",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "4.3",
            "action": "Detectar y corregir errores de rastreo, enlaces rotos y redirecciones",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "4.4",
            "action": "Revisar y actualizar sitemap y robots.txt si hay cambios en la estructura del sitio",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "4.5",
            "action": "Auditar integraciones activas: pixels, HubSpot tracking, Google Tags",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "4.6",
            "action": "Presentar hallazgos y plan de corrección a Sebastián Quijada",
            "responsible": "Andrés Coronel",
            "tool": ""
          }
        ]
      },
      {
        "id": "w-p5",
        "num": "5",
        "title": "Landing Pages + Google Ads",
        "subtitle": "Andrés Coronel y Francisco Parra — Estrategia y ejecución",
        "steps": [
          {
            "num": "5.1",
            "action": "Definir estrategia de la campaña y objetivo de conversión de la landing (consulta, formulario, llamada)",
            "responsible": "Andrés Coronel + Francisco Parra",
            "tool": ""
          },
          {
            "num": "5.2",
            "action": "Redactar y construir la landing en Framer optimizada para conversión",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "5.3",
            "action": "Configurar tracking de HubSpot y pixel de conversión de Google Ads",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "5.4",
            "action": "Verificar que el pixel de conversión dispara correctamente antes de activar campaña",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "5.5",
            "action": "Aprobar landing antes de activar la campaña",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "5.6",
            "action": "Monitorear rendimiento: tasa de conversión, CPL, bounce rate y ajustar según resultados",
            "responsible": "Andrés Coronel + Francisco Parra",
            "tool": ""
          }
        ]
      },
      {
        "id": "w-p6",
        "num": "6",
        "title": "Métricas y Reporte",
        "subtitle": "Análisis semanal compartido con Sebastián Quijada",
        "steps": [
          {
            "num": "6.1",
            "action": "Extraer métricas semanales: tráfico, fuentes, páginas top, keywords posicionados, CTR",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "6.2",
            "action": "Extraer rendimiento de landing pages: conversiones, CPL, bounce rate",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "6.3",
            "action": "Compartir métricas con Sebastián Quijada para análisis conjunto",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "6.4",
            "action": "Definir ajustes y tareas accionables para la semana siguiente",
            "responsible": "Andrés Coronel + Sebastián Quijada",
            "tool": ""
          }
        ]
      }
    ]
  },
  {
    "id": "analitica",
    "name": "Analítica",
    "roles": [
      {
        "initials": "SQ",
        "name": "Sebastián Quijada",
        "desc": "Director de Marketing — Dashboard consolidado de RRSS, informe semanal y recomendaciones"
      },
      {
        "initials": "AA",
        "name": "Alejandra Andrade",
        "desc": "Creadora de Contenido — Reporte diario de publicaciones en Slack"
      },
      {
        "initials": "AC",
        "name": "Andrés Coronel",
        "desc": "Desarrollador Web / SEO — Análisis de rendimiento web"
      }
    ],
    "tools": [
      "Claude (Automatización) — Dashboard consolidado de métricas RRSS",
      "Slack (#Marketing Daily Numbers) — Reporte diario",
      "Google Analytics — Rendimiento web",
      "Plataformas nativas — Métricas por red social"
    ],
    "rules": [
      "El reporte diario de publicaciones en Slack es obligatorio todos los días hábiles",
      "El dashboard de RRSS se genera automáticamente vía Claude",
      "Todo informe semanal debe incluir recomendaciones accionables",
      "Las recomendaciones aprobadas se convierten en tareas en Monday.com",
      "Los datos web son responsabilidad exclusiva de Andrés Coronel"
    ],
    "phases": [
      {
        "id": "a-p1",
        "num": "1",
        "title": "Reporte Diario de Publicaciones",
        "subtitle": "Desglose diario de contenido publicado por plataforma",
        "steps": [
          {
            "num": "1.1",
            "action": "Contabilizar todas las publicaciones realizadas en el día por plataforma y formato",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "1.2",
            "action": "Enviar desglose diario al canal de Slack #Marketing Daily Numbers",
            "responsible": "Alejandra Andrade",
            "tool": ""
          },
          {
            "num": "1.3",
            "action": "Verificar consistencia del reporte vs. cadencia esperada",
            "responsible": "Sebastián Quijada",
            "tool": ""
          }
        ]
      },
      {
        "id": "a-p2",
        "num": "2",
        "title": "Recolección de Métricas de RRSS",
        "subtitle": "Automatización vía Claude — Dashboard consolidado",
        "steps": [
          {
            "num": "2.1",
            "action": "Ejecutar automatización que extrae métricas de todas las redes sociales",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "2.2",
            "action": "Verificar que la data retornada es completa y coherente",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "2.3",
            "action": "Consolidar data de todas las plataformas en un único dashboard unificado",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "2.4",
            "action": "Identificar tendencias, picos de rendimiento y contenido de bajo desempeño",
            "responsible": "Sebastián Quijada",
            "tool": ""
          }
        ]
      },
      {
        "id": "a-p3",
        "num": "3",
        "title": "Analítica Web",
        "subtitle": "Rendimiento del sitio web — Google Analytics",
        "steps": [
          {
            "num": "3.1",
            "action": "Extraer métricas semanales del sitio: tráfico total, fuentes de tráfico, páginas más visitadas",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "3.2",
            "action": "Analizar rendimiento de landing pages: tasa de conversión, bounce rate, tiempo en página",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "3.3",
            "action": "Evaluar posicionamiento orgánico: keywords que generan tráfico, impresiones y CTR",
            "responsible": "Andrés Coronel",
            "tool": ""
          },
          {
            "num": "3.4",
            "action": "Identificar páginas con caídas de rendimiento o oportunidades de mejora",
            "responsible": "Andrés Coronel",
            "tool": ""
          }
        ]
      },
      {
        "id": "a-p4",
        "num": "4",
        "title": "Informe Semanal Consolidado",
        "subtitle": "Unificación de datos, análisis y recomendaciones accionables",
        "steps": [
          {
            "num": "4.1",
            "action": "Consolidar métricas de RRSS (dashboard Claude) + métricas web (Google Analytics) en informe unificado",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "4.2",
            "action": "Cruzar datos de publicaciones diarias (Slack) contra rendimiento real",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "4.3",
            "action": "Comparar resultados de la semana vs. semana anterior y vs. objetivos",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "4.4",
            "action": "Redactar recomendaciones accionables: qué replicar, qué ajustar, qué eliminar",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "4.5",
            "action": "Presentar informe en reunión semanal del equipo de marketing",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "4.6",
            "action": "Convertir recomendaciones aprobadas en tareas asignadas para la semana siguiente",
            "responsible": "Sebastián Quijada",
            "tool": ""
          }
        ]
      }
    ]
  },
  {
    "id": "email",
    "name": "Email Marketing",
    "roles": [
      {
        "initials": "SQ",
        "name": "Sebastián Quijada",
        "desc": "Director de Marketing — Estrategia, creación de campañas, grilla de newsletters, definición de segmentos"
      },
      {
        "initials": "J",
        "name": "Jesús",
        "desc": "Administración técnica — Gestión técnica de listas, segmentos y configuración en HubSpot"
      }
    ],
    "tools": [
      "HubSpot — Plataforma central de email marketing",
      "HubSpot Workflows — Secuencias automatizadas",
      "HubSpot Lists — Segmentación de contactos",
      "Monday.com — Gestión de tareas y calendario"
    ],
    "rules": [
      "Todos los emails se redactan exclusivamente en español",
      "La definición semántica de segmentos la realiza Sebastián; la implementación técnica la ejecuta Jesús",
      "Todo email debe pasar por prueba interna (móvil + desktop) antes de enviarse",
      "Todo workflow nuevo debe probarse con contacto de prueba antes de activarse",
      "Prohibido usar la palabra \"especialistas\" en cualquier email",
      "Limpieza de listas (inactivos, rebotes, duplicados) se realiza mensualmente"
    ],
    "phases": [
      {
        "id": "e-p1",
        "num": "1",
        "title": "Gestión de Listas y Segmentación",
        "subtitle": "Definición semántica y administración técnica",
        "steps": [
          {
            "num": "1.1",
            "action": "Definir criterios de segmentación: tipo de caso, etapa del funnel, fuente de origen, engagement",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "1.2",
            "action": "Crear y configurar listas y segmentos en HubSpot según criterios definidos",
            "responsible": "Jesús",
            "tool": ""
          },
          {
            "num": "1.3",
            "action": "Limpiar contactos inactivos, rebotados y duplicados (mensual)",
            "responsible": "Jesús",
            "tool": ""
          },
          {
            "num": "1.4",
            "action": "Verificar que nuevos contactos se asignan correctamente a los segmentos activos",
            "responsible": "Jesús",
            "tool": ""
          },
          {
            "num": "1.5",
            "action": "Revisar y validar estado de listas con Sebastián",
            "responsible": "Sebastián Quijada",
            "tool": ""
          }
        ]
      },
      {
        "id": "e-p2",
        "num": "2",
        "title": "Newsletter Semanal",
        "subtitle": "Correos informativos recurrentes",
        "steps": [
          {
            "num": "2.1",
            "action": "Definir grilla semanal de newsletters: temas, ángulo y objetivo de cada envío",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "2.2",
            "action": "Redactar copy del email en español (subject, preheader, cuerpo, CTA)",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "2.3",
            "action": "Configurar email en HubSpot: template, segmento destinatario, personalización",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "2.4",
            "action": "Enviar prueba interna y revisar en móvil y desktop",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "2.5",
            "action": "Programar o enviar campaña",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "2.6",
            "action": "Monitorear resultados 48h post-envío: open rate, CTR, unsubscribes, conversiones",
            "responsible": "Sebastián Quijada",
            "tool": ""
          }
        ]
      },
      {
        "id": "e-p3",
        "num": "3",
        "title": "Emails por Requerimiento Particular",
        "subtitle": "Podcast, eventos, anuncios puntuales",
        "steps": [
          {
            "num": "3.1",
            "action": "Identificar o recibir el requerimiento: nuevo episodio, evento, anuncio especial",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "3.2",
            "action": "Definir segmento destinatario, urgencia y objetivo de conversión",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "3.3",
            "action": "Redactar copy del email en español orientado al objetivo específico",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "3.4",
            "action": "Configurar, probar y enviar/programar el email",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "3.5",
            "action": "Monitorear resultados 48h post-envío",
            "responsible": "Sebastián Quijada",
            "tool": ""
          }
        ]
      },
      {
        "id": "e-p4",
        "num": "4",
        "title": "Automatizaciones y Workflows",
        "subtitle": "Cumpleaños, nurturing, re-engagement",
        "steps": [
          {
            "num": "4.1",
            "action": "Diseñar lógica del workflow: trigger, condiciones, secuencia y tiempos",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "4.2",
            "action": "Redactar copy de cada email de la secuencia en español",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "4.3",
            "action": "Configurar el workflow técnicamente en HubSpot",
            "responsible": "Jesús",
            "tool": ""
          },
          {
            "num": "4.4",
            "action": "Probar workflow completo con contacto de prueba antes de activar",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "4.5",
            "action": "Activar workflow y monitorear primeros disparos",
            "responsible": "Jesús",
            "tool": ""
          },
          {
            "num": "4.6",
            "action": "Monitorear rendimiento de workflows activos semanalmente",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "4.7",
            "action": "Optimizar secuencias con bajo rendimiento: A/B test de subjects, CTAs, timing",
            "responsible": "Sebastián Quijada",
            "tool": ""
          }
        ]
      },
      {
        "id": "e-p5",
        "num": "5",
        "title": "Reporte y Optimización",
        "subtitle": "Análisis de rendimiento y mejora continua",
        "steps": [
          {
            "num": "5.1",
            "action": "Consolidar métricas semanales de email: open rate, CTR, unsubscribes, bounces, conversiones",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "5.2",
            "action": "Identificar emails top performers y de bajo rendimiento",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "5.3",
            "action": "Incluir hallazgos de email marketing en el informe semanal consolidado",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "5.4",
            "action": "Ajustar estrategia de contenido, frecuencia y segmentación según resultados",
            "responsible": "Sebastián Quijada",
            "tool": ""
          }
        ]
      }
    ]
  },
  {
    "id": "reputacion",
    "name": "Reputación",
    "roles": [
      {
        "initials": "SQ",
        "name": "Sebastián Quijada",
        "desc": "Director de Marketing — Monitoreo general, supervisión de automatización y escalamiento"
      },
      {
        "initials": "OF",
        "name": "Equipo de Oficina",
        "desc": "Solicitud de reseñas a clientes en interacciones presenciales"
      },
      {
        "initials": "VT",
        "name": "Equipo de Ventas",
        "desc": "Solicitud de reseñas durante el proceso comercial"
      },
      {
        "initials": "CX",
        "name": "Dpto. Customer Experience",
        "desc": "Evaluación de reviews negativos vinculados a problemas operativos"
      }
    ],
    "tools": [
      "Google Business Profile — Plataforma principal de reseñas",
      "Automatización — Respuesta automática a reviews"
    ],
    "rules": [
      "La solicitud de reseñas es responsabilidad de Oficina y Ventas, no de Marketing",
      "Las respuestas se generan automáticamente — Sebastián supervisa",
      "Todo review negativo vinculado a un servicio se escala a CX",
      "Reviews no vinculados a servicios se denuncian en Google",
      "Nunca responder un review negativo de forma confrontacional"
    ],
    "phases": [
      {
        "id": "r-p1",
        "num": "1",
        "title": "Solicitud de Reseñas",
        "subtitle": "Generación proactiva por Oficina y Ventas",
        "steps": [
          {
            "num": "1.1",
            "action": "Identificar clientes con experiencia positiva o caso resuelto satisfactoriamente",
            "responsible": "Eq. Oficina / Eq. Ventas",
            "tool": ""
          },
          {
            "num": "1.2",
            "action": "Solicitar al cliente que deje una reseña en Google Business Profile",
            "responsible": "Eq. Oficina / Eq. Ventas",
            "tool": ""
          },
          {
            "num": "1.3",
            "action": "Facilitar el enlace directo de reseña para simplificar el proceso",
            "responsible": "Eq. Oficina / Eq. Ventas",
            "tool": ""
          }
        ]
      },
      {
        "id": "r-p2",
        "num": "2",
        "title": "Respuesta Automatizada a Reviews",
        "subtitle": "Automatización activa con supervisión de Marketing",
        "steps": [
          {
            "num": "2.1",
            "action": "La automatización detecta nuevas reseñas y genera respuesta automática",
            "responsible": "Automático",
            "tool": ""
          },
          {
            "num": "2.2",
            "action": "Verificar periódicamente que la automatización funciona correctamente",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "2.3",
            "action": "Ajustar parámetros si se detectan respuestas inadecuadas",
            "responsible": "Sebastián Quijada",
            "tool": ""
          }
        ]
      },
      {
        "id": "r-p3",
        "num": "3",
        "title": "Gestión de Reviews Negativos",
        "subtitle": "Evaluación, escalamiento a CX y denuncia",
        "steps": [
          {
            "num": "3.1",
            "action": "Detectar review negativo o que evidencie un problema operativo",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "3.2",
            "action": "Evaluar si el review está vinculado a un servicio prestado por la firma",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "3.3",
            "action": "Si está vinculado: escalar al Dpto. CX para evaluar qué pasó con el caso",
            "responsible": "Sebastián Quijada → CX",
            "tool": ""
          },
          {
            "num": "3.4",
            "action": "CX investiga el caso y reporta hallazgos a Marketing",
            "responsible": "Dpto. CX",
            "tool": ""
          },
          {
            "num": "3.5",
            "action": "Definir acción a tomar según hallazgos de CX",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "3.6",
            "action": "Si NO está vinculado: denunciar el review como inapropiado en Google",
            "responsible": "Sebastián Quijada",
            "tool": ""
          }
        ]
      },
      {
        "id": "r-p4",
        "num": "4",
        "title": "Monitoreo y Reporte",
        "subtitle": "Seguimiento continuo de la reputación online",
        "steps": [
          {
            "num": "4.1",
            "action": "Monitorear volumen de reseñas, rating promedio y tendencia semanal",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "4.2",
            "action": "Identificar patrones recurrentes en reviews negativos",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "4.3",
            "action": "Incluir métricas de reputación en el informe semanal de marketing",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "4.4",
            "action": "Si hay patrones negativos recurrentes: reportar a CX con plan de acción",
            "responsible": "Sebastián Quijada → CX",
            "tool": ""
          }
        ]
      }
    ]
  },
  {
    "id": "requerimientos",
    "name": "Requerimientos",
    "roles": [
      {
        "initials": "SQ",
        "name": "Sebastián Quijada",
        "desc": "Director de Marketing — Recepción, evaluación, priorización y asignación"
      },
      {
        "initials": "SC",
        "name": "Sara Castaño",
        "desc": "Diseñadora — Ejecución de flyers y piezas gráficas"
      },
      {
        "initials": "GL",
        "name": "Gloriana López",
        "desc": "Videógrafa — Ejecución de requerimientos de video"
      },
      {
        "initials": "AC",
        "name": "Andrés Coronel",
        "desc": "Desarrollador Web — Ejecución de landing pages"
      },
      {
        "initials": "→",
        "name": "Solicitantes",
        "desc": "C-Level, Managers o miembros de otros departamentos"
      }
    ],
    "tools": [
      "Slack — Canal principal de recepción",
      "Monday.com — Registro, seguimiento y asignación",
      "Canva — Diseño de flyers",
      "Framer — Desarrollo de landing pages",
      "HubSpot — Correos electrónicos"
    ],
    "rules": [
      "Todo requerimiento pasa por Sebastián Quijada — ningún miembro ejecuta sin asignación formal",
      "Las solicitudes deben incluir: objetivo, público, fecha deseada y referencias",
      "Todo requerimiento se registra en Monday.com",
      "Entregables alineados a los lineamientos de marca sin excepción",
      "Prohibido usar la palabra \"especialistas\"",
      "La priorización la define exclusivamente el Director de Marketing",
      "Pueden solicitar: C-Level, Managers y miembros de otros departamentos"
    ],
    "phases": [
      {
        "id": "q-p1",
        "num": "1",
        "title": "Recepción del Requerimiento",
        "subtitle": "Ingreso vía Slack o reunión de equipo",
        "steps": [
          {
            "num": "1.1",
            "action": "Solicitante envía requerimiento por Slack o lo plantea en reunión de equipo",
            "responsible": "Solicitante",
            "tool": ""
          },
          {
            "num": "1.2",
            "action": "Recibir la solicitud y confirmar recepción al solicitante",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "1.3",
            "action": "Si falta información: solicitar objetivo, público, fecha deseada y materiales de referencia",
            "responsible": "Sebastián Quijada",
            "tool": ""
          }
        ]
      },
      {
        "id": "q-p2",
        "num": "2",
        "title": "Evaluación y Priorización",
        "subtitle": "Clasificación, viabilidad y asignación de recursos",
        "steps": [
          {
            "num": "2.1",
            "action": "Clasificar el requerimiento por tipo: flyer, video, landing page o correo electrónico",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "2.2",
            "action": "Evaluar viabilidad según carga de trabajo actual y urgencia",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "2.3",
            "action": "Definir prioridad (alta, media, baja) y fecha de entrega estimada",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "2.4",
            "action": "Comunicar al solicitante la fecha estimada de entrega",
            "responsible": "Sebastián Quijada",
            "tool": ""
          }
        ]
      },
      {
        "id": "q-p3",
        "num": "3",
        "title": "Asignación y Ejecución",
        "subtitle": "Delegación al miembro del equipo correspondiente",
        "steps": [
          {
            "num": "3.1",
            "action": "Crear tarea en Monday.com con brief completo: tipo, objetivo, referencias, fecha y responsable",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "3.2",
            "action": "Asignar al ejecutor según tipo: Sara (flyer), Gloriana (video), Andrés (landing), Sebastián (email)",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "3.3",
            "action": "El ejecutor produce el entregable alineado a los lineamientos de marca",
            "responsible": "Ejecutor asignado",
            "tool": ""
          },
          {
            "num": "3.4",
            "action": "Marcar tarea como lista para revisión",
            "responsible": "Ejecutor asignado",
            "tool": ""
          }
        ]
      },
      {
        "id": "q-p4",
        "num": "4",
        "title": "Revisión y Aprobación",
        "subtitle": "Control de calidad y validación",
        "steps": [
          {
            "num": "4.1",
            "action": "Revisar entregable: calidad, alineación a marca, cumplimiento del brief",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "4.2",
            "action": "Si requiere correcciones: devolver con feedback específico",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "4.3",
            "action": "Aplicar correcciones y reenviar para revisión",
            "responsible": "Ejecutor asignado",
            "tool": ""
          },
          {
            "num": "4.4",
            "action": "Si amerita: enviar al solicitante para validación",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "4.5",
            "action": "Aprobar entregable final y marcar tarea como completada",
            "responsible": "Sebastián Quijada",
            "tool": ""
          }
        ]
      },
      {
        "id": "q-p5",
        "num": "5",
        "title": "Entrega y Cierre",
        "subtitle": "Entrega al solicitante y cierre formal",
        "steps": [
          {
            "num": "5.1",
            "action": "Entregar producto final al solicitante",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "5.2",
            "action": "Confirmar con el solicitante que el entregable cumple con lo esperado",
            "responsible": "Sebastián Quijada",
            "tool": ""
          },
          {
            "num": "5.3",
            "action": "Cerrar tarea en Monday.com con estado final",
            "responsible": "Sebastián Quijada",
            "tool": ""
          }
        ]
      }
    ]
  }
];

function loadSOPs(): SOPData[] {
  if (typeof window === 'undefined') return INITIAL_SOPS_DATA;
  try {
    const raw = localStorage.getItem(SOP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_SOPS_DATA;
  } catch { return INITIAL_SOPS_DATA; }
}

function saveSOPs(sops: SOPData[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOP_STORAGE_KEY, JSON.stringify(sops));
}

const MEMBER_COLORS_SOP: Record<string, string> = {
  AA: '#0C2054', SC: '#ec4899', GL: '#8b5cf6', SQ: '#F79C31',
  AC: '#10b981', FP: '#ef4444', JE: '#06b6d4', EO: '#6b7280',
  EV: '#f59e0b', DC: '#3b82f6', SO: '#a855f7',
};

function getInitialsColor(initials: string): string {
  return MEMBER_COLORS_SOP[initials] ?? '#0C2054';
}

// ── SOPPhaseRow ───────────────────────────────────────────────────────────────

function SOPPhaseRow({
  phase,
  editing,
  onUpdateStep,
  onAddStep,
  onRemoveStep,
}: {
  phase: SOPPhase;
  editing: boolean;
  onUpdateStep: (stepIdx: number, field: keyof SOPStep, value: string) => void;
  onAddStep: () => void;
  onRemoveStep: (stepIdx: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[var(--s-e8eaf0)] overflow-hidden bg-[var(--surface)]">
      {/* Phase header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-[var(--s-f7f8fc)] transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-[var(--s-0c2054)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {phase.num}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--t-1a1a2e)]">{phase.title}</p>
          {phase.subtitle && (
            <p className="text-xs text-[var(--t-8888a8)] mt-0.5">{phase.subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-semibold text-[var(--t-8888a8)] bg-[var(--s-f0f0f0)] px-2 py-0.5 rounded-full">
            {phase.steps.length} pasos
          </span>
          {open ? (
            <ChevronDown className="w-4 h-4 text-[var(--t-8888a8)]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--t-8888a8)]" />
          )}
        </div>
      </button>

      {/* Steps table */}
      {open && (
        <div className="border-t border-[var(--s-e8eaf0)]">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--s-f7f8fc)]">
                  <th className="text-left px-4 py-2.5 text-[var(--t-8888a8)] font-semibold w-12">#</th>
                  <th className="text-left px-4 py-2.5 text-[var(--t-8888a8)] font-semibold">Acción</th>
                  <th className="text-left px-4 py-2.5 text-[var(--t-8888a8)] font-semibold w-40">Responsable</th>
                  <th className="text-left px-4 py-2.5 text-[var(--t-8888a8)] font-semibold w-36">Herramienta</th>
                  {editing && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {phase.steps.map((step, si) => (
                  <tr key={si} className="border-t border-[var(--s-f0f0f0)] hover:bg-[var(--s-fafafa)] group">
                    <td className="px-4 py-2.5">
                      {editing ? (
                        <input
                          value={step.num}
                          onChange={e => onUpdateStep(si, 'num', e.target.value)}
                          className="w-10 text-xs border border-[var(--s-e8e8f0)] rounded px-1.5 py-1 outline-none focus:border-[var(--s-f79c31)]"
                        />
                      ) : (
                        <span className="text-[var(--t-8888a8)] font-mono">{step.num}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {editing ? (
                        <textarea
                          value={step.action}
                          onChange={e => onUpdateStep(si, 'action', e.target.value)}
                          rows={2}
                          className="w-full text-xs border border-[var(--s-e8e8f0)] rounded px-2 py-1 outline-none focus:border-[var(--s-f79c31)] resize-none"
                        />
                      ) : (
                        <span className="text-[var(--t-1a1a2e)] leading-relaxed">{step.action}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {editing ? (
                        <input
                          value={step.responsible}
                          onChange={e => onUpdateStep(si, 'responsible', e.target.value)}
                          className="w-full text-xs border border-[var(--s-e8e8f0)] rounded px-1.5 py-1 outline-none focus:border-[var(--s-f79c31)]"
                        />
                      ) : (
                        <span className="text-[var(--t-4a4a6a)]">{step.responsible}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {editing ? (
                        <input
                          value={step.tool}
                          onChange={e => onUpdateStep(si, 'tool', e.target.value)}
                          className="w-full text-xs border border-[var(--s-e8e8f0)] rounded px-1.5 py-1 outline-none focus:border-[var(--s-f79c31)]"
                        />
                      ) : (
                        <span className="text-[var(--t-8888a8)] italic">{step.tool}</span>
                      )}
                    </td>
                    {editing && (
                      <td className="px-2 py-2.5">
                        <button
                          onClick={() => onRemoveStep(si)}
                          className="w-6 h-6 rounded flex items-center justify-center text-[var(--t-c0c0d0)] hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editing && (
            <div className="px-4 py-3 border-t border-[var(--s-f0f0f0)]">
              <button
                onClick={onAddStep}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--t-f79c31)] hover:text-[var(--t-e08a20)] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar paso
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SOPsTab ───────────────────────────────────────────────────────────────────

function SOPsTab() {
  const [sops, setSOPs] = useState<SOPData[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeSOP, setActiveSOP] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SOPData | null>(null);
  const [newTool, setNewTool] = useState('');
  const [newRule, setNewRule] = useState('');
  const [activeSection, setActiveSection] = useState<'phases' | 'roles' | 'tools' | 'rules'>('phases');

  useEffect(() => {
    setSOPs(loadSOPs());
    setMounted(true);
  }, []);

  const currentSOP = sops[activeSOP] ?? null;

  const startEdit = () => {
    if (!currentSOP) return;
    setDraft(JSON.parse(JSON.stringify(currentSOP)));
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(null);
    setEditing(false);
    setNewTool('');
    setNewRule('');
  };

  const saveEdit = () => {
    if (!draft) return;
    const updated = sops.map((s, i) => i === activeSOP ? draft : s);
    setSOPs(updated);
    saveSOPs(updated);
    setDraft(null);
    setEditing(false);
    setNewTool('');
    setNewRule('');
  };

  const d = editing ? draft : currentSOP;

  // Draft updaters
  const updatePhaseStep = (phaseIdx: number, stepIdx: number, field: keyof SOPStep, value: string) => {
    if (!draft) return;
    const phases = draft.phases.map((ph, pi) =>
      pi === phaseIdx
        ? { ...ph, steps: ph.steps.map((st, si) => si === stepIdx ? { ...st, [field]: value } : st) }
        : ph
    );
    setDraft({ ...draft, phases });
  };

  const addStep = (phaseIdx: number) => {
    if (!draft) return;
    const ph = draft.phases[phaseIdx];
    const lastNum = ph.steps.length > 0 ? ph.steps[ph.steps.length - 1].num : `${ph.num}.0`;
    const parts = lastNum.split('.');
    const newNum = parts.length === 2 ? `${parts[0]}.${parseInt(parts[1]) + 1}` : `${ph.num}.${ph.steps.length + 1}`;
    const phases = draft.phases.map((p, i) =>
      i === phaseIdx
        ? { ...p, steps: [...p.steps, { num: newNum, action: '', responsible: '', tool: '' }] }
        : p
    );
    setDraft({ ...draft, phases });
  };

  const removeStep = (phaseIdx: number, stepIdx: number) => {
    if (!draft) return;
    const phases = draft.phases.map((p, i) =>
      i === phaseIdx ? { ...p, steps: p.steps.filter((_, si) => si !== stepIdx) } : p
    );
    setDraft({ ...draft, phases });
  };

  const addTool = () => {
    if (!draft || !newTool.trim()) return;
    setDraft({ ...draft, tools: [...draft.tools, newTool.trim()] });
    setNewTool('');
  };

  const removeTool = (i: number) => {
    if (!draft) return;
    setDraft({ ...draft, tools: draft.tools.filter((_, idx) => idx !== i) });
  };

  const addRule = () => {
    if (!draft || !newRule.trim()) return;
    setDraft({ ...draft, rules: [...draft.rules, newRule.trim()] });
    setNewRule('');
  };

  const removeRule = (i: number) => {
    if (!draft) return;
    setDraft({ ...draft, rules: draft.rules.filter((_, idx) => idx !== i) });
  };

  const updateRule = (i: number, value: string) => {
    if (!draft) return;
    setDraft({ ...draft, rules: draft.rules.map((r, idx) => idx === i ? value : r) });
  };

  const updateRole = (i: number, field: keyof SOPRole, value: string) => {
    if (!draft) return;
    setDraft({ ...draft, roles: draft.roles.map((r, idx) => idx === i ? { ...r, [field]: value } : r) });
  };

  if (!mounted || !d) return null;

  const SECTION_TABS = [
    { key: 'phases' as const, label: 'Procedimiento', icon: ClipboardList },
    { key: 'roles' as const, label: 'Roles', icon: Users },
    { key: 'tools' as const, label: 'Herramientas', icon: Wrench },
    { key: 'rules' as const, label: 'Reglas', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0C2054] to-[#1a3a7a] rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-[-40px] right-[-40px] w-40 h-40 rounded-full bg-[#F79C31]/10" />
        <div className="absolute bottom-[-30px] left-[250px] w-28 h-28 rounded-full bg-white/5" />
        <p className="text-[var(--t-f79c31)] text-xs font-semibold uppercase tracking-widest mb-2">Procedimientos Operativos</p>
        <h2 className="text-white text-2xl font-bold mb-1.5">SOPs — Marketing</h2>
        <p className="text-white/60 text-sm max-w-xl">
          Guía operativa del equipo. Define cómo se ejecuta cada proceso, quién es responsable y qué herramientas se usan.
        </p>
        <div className="flex items-center gap-6 mt-4">
          <div>
            <p className="text-white text-xl font-bold">{sops.length}</p>
            <p className="text-white/50 text-xs">SOPs activos</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <p className="text-white text-xl font-bold">{sops.reduce((a, s) => a + s.phases.length, 0)}</p>
            <p className="text-white/50 text-xs">Fases totales</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div>
            <p className="text-white text-xl font-bold">{sops.reduce((a, s) => a + s.phases.reduce((b, p) => b + p.steps.length, 0), 0)}</p>
            <p className="text-white/50 text-xs">Pasos documentados</p>
          </div>
        </div>
      </div>

      {/* SOP sub-tabs */}
      <div className="flex gap-1 bg-[var(--surface)] border border-[var(--s-e8e8f0)] rounded-xl p-1 w-fit flex-wrap">
        {sops.map((sop, i) => (
          <button
            key={sop.id}
            onClick={() => { setActiveSOP(i); setEditing(false); setDraft(null); setActiveSection('phases'); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSOP === i ? 'bg-[var(--s-0c2054)] text-white shadow-sm' : 'text-[var(--t-4a4a6a)] hover:bg-[var(--s-f7f8fc)]'
            }`}
          >
            {sop.name}
          </button>
        ))}
      </div>

      {/* SOP content */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] overflow-hidden">
        {/* SOP header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--s-f0f0f0)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0C2054]/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-[var(--t-0c2054)]" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--t-0c2054)] text-base">{d.name}</h3>
              <p className="text-xs text-[var(--t-8888a8)]">
                {d.phases.length} fases · {d.phases.reduce((a, p) => a + p.steps.length, 0)} pasos · {d.roles.length} roles
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={cancelEdit}
                  className="text-xs text-[var(--t-6b7280)] border border-[var(--s-e5e7eb)] px-3 py-1.5 rounded-lg hover:bg-[var(--s-f9fafb)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[var(--s-0c2054)] px-4 py-1.5 rounded-lg hover:bg-[var(--s-1a3a7a)] transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Guardar cambios
                </button>
              </>
            ) : (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--t-0c2054)] border border-[#0C2054]/20 bg-[#0C2054]/5 px-3 py-1.5 rounded-lg hover:bg-[#0C2054]/10 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar SOP
              </button>
            )}
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-0 border-b border-[var(--s-f0f0f0)] px-6">
          {SECTION_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all -mb-px ${
                activeSection === key
                  ? 'border-[var(--s-0c2054)] text-[var(--t-0c2054)]'
                  : 'border-transparent text-[var(--t-8888a8)] hover:text-[var(--t-4a4a6a)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Section content */}
        <div className="p-6">

          {/* ── Procedimiento ── */}
          {activeSection === 'phases' && (
            <div className="space-y-3">
              {d.phases.map((phase, pi) => (
                <SOPPhaseRow
                  key={phase.id}
                  phase={phase}
                  editing={editing}
                  onUpdateStep={(si, field, value) => updatePhaseStep(pi, si, field, value)}
                  onAddStep={() => addStep(pi)}
                  onRemoveStep={(si) => removeStep(pi, si)}
                />
              ))}
            </div>
          )}

          {/* ── Roles ── */}
          {activeSection === 'roles' && (
            <div className="space-y-3">
              {d.roles.map((role, ri) => (
                <div key={ri} className="flex items-start gap-4 p-4 rounded-xl border border-[var(--s-e8eaf0)] bg-[var(--s-fafafa)]">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: getInitialsColor(role.initials) }}
                  >
                    {role.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    {editing ? (
                      <div className="space-y-1.5">
                        <input
                          value={role.name}
                          onChange={e => updateRole(ri, 'name', e.target.value)}
                          className="w-full text-sm font-semibold border border-[var(--s-e8e8f0)] rounded-lg px-3 py-1.5 outline-none focus:border-[var(--s-f79c31)]"
                        />
                        <input
                          value={role.desc}
                          onChange={e => updateRole(ri, 'desc', e.target.value)}
                          placeholder="Descripción del rol..."
                          className="w-full text-sm border border-[var(--s-e8e8f0)] rounded-lg px-3 py-1.5 outline-none focus:border-[var(--s-f79c31)] text-[var(--t-4a4a6a)]"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-[var(--t-1a1a2e)]">{role.name}</p>
                        {role.desc && <p className="text-xs text-[var(--t-8888a8)] mt-0.5 leading-relaxed">{role.desc}</p>}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Herramientas ── */}
          {activeSection === 'tools' && (
            <div>
              <div className="flex flex-wrap gap-2">
                {d.tools.map((tool, ti) => (
                  <div
                    key={ti}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--s-f0f2f8)] border border-[var(--s-e0e4f0)] group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--s-0c2054)] flex-shrink-0" />
                    <span className="text-xs font-medium text-[var(--t-0c2054)]">{tool}</span>
                    {editing && (
                      <button
                        onClick={() => removeTool(ti)}
                        className="w-4 h-4 flex items-center justify-center text-[var(--t-8888a8)] hover:text-red-500 transition-colors ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {editing && (
                <div className="mt-4 flex gap-2">
                  <input
                    value={newTool}
                    onChange={e => setNewTool(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTool())}
                    placeholder="Nueva herramienta..."
                    className="flex-1 text-sm border border-[var(--s-e8e8f0)] rounded-lg px-3 py-2 outline-none focus:border-[var(--s-f79c31)]"
                  />
                  <button
                    onClick={addTool}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[var(--s-0c2054)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--s-1a3a7a)] transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Agregar
                  </button>
                </div>
              )}
              {d.tools.length === 0 && !editing && (
                <p className="text-sm text-[var(--t-8888a8)] italic">Sin herramientas registradas.</p>
              )}
            </div>
          )}

          {/* ── Reglas ── */}
          {activeSection === 'rules' && (
            <div className="space-y-2.5">
              {d.rules.map((rule, ri) => (
                <div
                  key={ri}
                  className="flex items-start gap-3 p-4 rounded-xl border border-[var(--s-e8eaf0)] bg-[var(--s-fffbf0)] group"
                >
                  <div className="w-5 h-5 rounded-full bg-[#F79C31]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield className="w-3 h-3 text-[var(--t-f79c31)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editing ? (
                      <textarea
                        value={rule}
                        onChange={e => updateRule(ri, e.target.value)}
                        rows={2}
                        className="w-full text-sm border border-[var(--s-e8e8f0)] rounded-lg px-3 py-2 outline-none focus:border-[var(--s-f79c31)] resize-none bg-[var(--surface)]"
                      />
                    ) : (
                      <p className="text-sm text-[var(--t-1a1a2e)] leading-relaxed">{rule}</p>
                    )}
                  </div>
                  {editing && (
                    <button
                      onClick={() => removeRule(ri)}
                      className="w-6 h-6 flex items-center justify-center text-[var(--t-c0c0d0)] hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0 mt-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {editing && (
                <div className="flex gap-2 mt-2">
                  <input
                    value={newRule}
                    onChange={e => setNewRule(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRule())}
                    placeholder="Nueva regla o lineamiento..."
                    className="flex-1 text-sm border border-[var(--s-e8e8f0)] rounded-lg px-3 py-2 outline-none focus:border-[var(--s-f79c31)]"
                  />
                  <button
                    onClick={addRule}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[var(--s-f79c31)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--s-e08a20)] transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Agregar
                  </button>
                </div>
              )}
              {d.rules.length === 0 && !editing && (
                <p className="text-sm text-[var(--t-8888a8)] italic">Sin reglas registradas.</p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RecursosPage() {
  const [activeTab, setActiveTab] = useState<'docs' | 'brand' | 'avatar' | 'brainstorming' | 'sops' | 'links'>('docs');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiDocument | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [avatars, setAvatars] = useState<ApiCustomerAvatar[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<number | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [showCreateAvatar, setShowCreateAvatar] = useState(false);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setApiError('');
    try {
      const res = await documentsApi.list({ category: category !== 'all' ? category : undefined, search: search || undefined });
      setDocs(res.results);
    } catch (err: any) {
      setApiError(err.message ?? 'Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    if (activeTab === 'docs') loadDocs();
  }, [activeTab, loadDocs]);

  const loadAvatars = useCallback(async () => {
    setAvatarLoading(true);
    try {
      const res = await avatarsApi.list();
      setAvatars(res.results);
      if (res.results.length > 0 && !selectedAvatarId) {
        const primary = res.results.find(a => a.is_primary) ?? res.results[0];
        setSelectedAvatarId(primary.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAvatarLoading(false);
    }
  }, [selectedAvatarId]);

  useEffect(() => {
    if (activeTab === 'avatar') loadAvatars();
  }, [activeTab, loadAvatars]);

  const handleView = async (doc: ApiDocument) => {
    try {
      const { url } = await documentsApi.getDownloadUrl(doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      alert(`No se pudo obtener la URL: ${err.message}`);
    }
  };

  const handleDownload = async (doc: ApiDocument) => {
    try {
      const { url, file_name } = await documentsApi.getDownloadUrl(doc.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = file_name;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`No se pudo descargar: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await documentsApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      loadDocs();
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const totalActive = docs.filter(d => d.status === 'active').length;
  const totalJD = docs.filter(d => d.category === 'jd').length;
  const totalSOP = docs.filter(d => d.category === 'sop').length;

  return (
    <div className="animate-fade-in">
      {uploadOpen && (
        <UploadModal onClose={() => setUploadOpen(false)} onSuccess={loadDocs} />
      )}
      {deleteTarget && (
        <DeleteModal
          doc={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      <Header
        title="Recursos"
        subtitle="Documentos, brand assets y manual de marca"
        actions={
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 bg-[var(--s-f79c31)] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[var(--s-e08a20)] transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            Subir archivo
          </button>
        }
      />

      <div className="px-10 py-10 space-y-10">
        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--surface)] border border-[var(--s-e8e8f0)] rounded-xl p-1 w-fit">
          {[
            { key: 'docs', label: 'Biblioteca de Documentos', icon: FolderOpen },
            { key: 'brand', label: 'Brand Center', icon: Palette },
            { key: 'avatar', label: 'Avatar del Cliente', icon: Users },
            { key: 'brainstorming', label: 'Brainstorming', icon: Lightbulb },
            { key: 'sops', label: 'SOPs', icon: ClipboardList },
            { key: 'links', label: 'Links', icon: Link2 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as 'docs' | 'brand' | 'avatar' | 'brainstorming' | 'sops' | 'links')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === key ? 'bg-[var(--s-0c2054)] text-white shadow-sm' : 'text-[var(--t-4a4a6a)] hover:bg-[var(--s-f7f8fc)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Documents Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t-8888a8)]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar documentos..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-[var(--s-e8e8f0)] bg-[var(--surface)] rounded-lg outline-none focus:border-[var(--s-f79c31)] transition-colors"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setCategory(key)}
                    className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-all ${
                      category === key
                        ? 'bg-[var(--s-0c2054)] text-white border-[var(--s-0c2054)]'
                        : 'bg-[var(--surface)] text-[var(--t-4a4a6a)] border-[var(--s-e8e8f0)] hover:border-[var(--s-d0d0e0)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { val: docs.length, label: 'Documentos totales' },
                { val: totalActive, label: 'Activos' },
                { val: totalJD, label: 'Job Descriptions' },
                { val: totalSOP, label: 'SOPs' },
              ].map(({ val, label }) => (
                <Card key={label} className="p-5 text-center">
                  <p className="text-2xl font-bold text-[var(--t-0c2054)]">{loading ? '—' : val}</p>
                  <p className="text-xs text-[var(--t-8888a8)] mt-1">{label}</p>
                </Card>
              ))}
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[var(--t-f79c31)] animate-spin" />
              </div>
            ) : apiError ? (
              <Card className="p-10 text-center">
                <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
                <p className="text-[var(--t-4a4a6a)] font-medium">Error al cargar documentos</p>
                <p className="text-sm text-[var(--t-8888a8)] mt-1 mb-4">{apiError}</p>
                <button
                  onClick={loadDocs}
                  className="text-sm font-semibold text-[var(--t-f79c31)] hover:underline"
                >
                  Reintentar
                </button>
              </Card>
            ) : docs.length === 0 ? (
              <Card className="p-12 text-center">
                <FolderOpen className="w-12 h-12 text-[var(--t-d0d0e0)] mx-auto mb-3" />
                <p className="text-[var(--t-4a4a6a)] font-medium">No se encontraron documentos</p>
                <p className="text-sm text-[var(--t-8888a8)] mt-1 mb-4">
                  {search || category !== 'all'
                    ? 'Intenta con otros filtros de búsqueda'
                    : 'Sube tu primer documento para comenzar'}
                </p>
                {!search && category === 'all' && (
                  <button
                    onClick={() => setUploadOpen(true)}
                    className="flex items-center gap-2 mx-auto bg-[var(--s-f79c31)] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[var(--s-e08a20)] transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Subir documento
                  </button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {docs.map(doc => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onView={() => handleView(doc)}
                    onDownload={() => handleDownload(doc)}
                    onDelete={() => setDeleteTarget(doc)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Brand Tab ──────────────────────────────────────────────────────── */}
        {activeTab === 'brand' && (
          <div className="space-y-8">
            {/* Hero */}
            <div className="bg-gradient-to-r from-[#0C2054] to-[#1a3a7a] rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-[-60px] right-[-60px] w-48 h-48 rounded-full bg-[#F79C31]/10" />
              <p className="text-[var(--t-f79c31)] text-xs font-semibold uppercase tracking-widest mb-2">Brand Center</p>
              <h2 className="text-white text-2xl font-bold mb-2">Manual de Marca</h2>
              <p className="text-white/60 text-sm max-w-md">
                Guía oficial de identidad visual de Mangone Law Firm, LLC.
                Todo lo que necesitas para representar la marca correctamente.
              </p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setManualOpen(true)}
                  className="flex items-center gap-2 bg-[var(--s-f79c31)] text-[var(--t-0c2054)] font-semibold text-sm px-4 py-2 rounded-lg hover:bg-[var(--s-e08a20)] transition-colors"
                >
                  <Eye className="w-4 h-4" /> Ver manual completo
                </button>
                <a
                  href="/brand/manual.html"
                  download="Manual_Marca_Mangone_Law_Firm.html"
                  className="flex items-center gap-2 bg-white/10 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <Download className="w-4 h-4" /> Descargar manual
                </a>
              </div>
            </div>

            {/* Colors */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-base font-bold text-[var(--t-1a1a2e)]">Paleta de Colores</h3>
                <Badge variant="outline">Clic para copiar HEX</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {BRAND_COLORS.map(color => <ColorSwatch key={color.hex} color={color} />)}
              </div>
              <Card className="p-4 mt-4">
                <p className="text-sm font-semibold text-[var(--t-1a1a2e)] mb-3">Proporción de uso recomendada</p>
                <div className="flex h-10 rounded-lg overflow-hidden shadow-sm">
                  <div className="flex items-center justify-center text-white text-xs font-bold" style={{ width: '40%', background: 'var(--s-0c2054)' }}>40% Azul</div>
                  <div className="flex items-center justify-center text-[var(--t-3b3537)] text-xs font-bold" style={{ width: '30%', background: '#f0eeec' }}>30% Blanco</div>
                  <div className="flex items-center justify-center text-white text-xs font-bold" style={{ width: '15%', background: 'var(--s-f79c31)' }}>15%</div>
                  <div className="flex items-center justify-center text-white text-xs font-bold" style={{ width: '10%', background: '#3B3537' }}>10%</div>
                  <div className="flex items-center justify-center text-gray-400 text-[10px]" style={{ width: '5%', background: '#e0e0e0' }}>5%</div>
                </div>
              </Card>
            </div>

            {/* Typography */}
            <div>
              <h3 className="text-base font-bold text-[var(--t-1a1a2e)] mb-4">Tipografías</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Bebas Neue', role: 'Títulos principales', sample: 'MANGONE LAW FIRM', style: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', letterSpacing: '2px', color: 'var(--t-0c2054)' } },
                  { name: 'Montserrat Bold', role: 'Subtítulos', sample: 'Tu aliado en el camino legal', style: { fontFamily: 'Montserrat', fontWeight: 700, fontSize: '20px', color: 'var(--t-0c2054)' } },
                  { name: 'Montserrat Regular', role: 'Cuerpo de texto', sample: 'Apoyamos a los nuevos americanos en su camino hacia la estabilidad legal.', style: { fontFamily: 'Montserrat', fontWeight: 400, fontSize: '15px', color: 'var(--t-3b3537)' } },
                ].map(t => (
                  <Card key={t.name} className="p-5">
                    <p className="text-[var(--t-f79c31)] text-[10px] font-bold uppercase tracking-widest mb-3">{t.name}</p>
                    <p className="text-xs text-[var(--t-8888a8)] mb-3">{t.role}</p>
                    <p style={t.style as React.CSSProperties} className="leading-tight">{t.sample}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Logos */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[var(--t-1a1a2e)]">Logos Disponibles</h3>
                <span className="text-xs text-[var(--t-8888a8)]">PNG · Alta resolución (7800×3800 px)</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Logo negro — sobre fondo claro */}
                <Card className="overflow-hidden">
                  <div className="bg-[var(--surface)] flex items-center justify-center px-8 py-8 min-h-[180px]">
                    <NextImage
                      src="/brand/logo-negro.png"
                      alt="Logo Mangone Law Firm — versión negra"
                      width={280}
                      height={137}
                      className="object-contain max-w-full"
                      priority
                    />
                  </div>
                  <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--s-f0f0f0)]">
                    <div>
                      <p className="text-sm font-semibold text-[var(--t-1a1a2e)]">Versión negra</p>
                      <p className="text-xs text-[var(--t-8888a8)]">Uso en fondos claros / blancos</p>
                    </div>
                    <a
                      href="/brand/logo-negro.png"
                      download="Logo_Mangone_Negro.png"
                      className="flex items-center gap-1.5 text-xs font-semibold text-[var(--t-0c2054)] bg-[var(--s-f0f2f8)] hover:bg-[var(--s-e4e8f5)] px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar PNG
                    </a>
                  </div>
                </Card>

                {/* Logo blanco — sobre fondo oscuro */}
                <Card className="overflow-hidden">
                  <div className="bg-[var(--s-0c2054)] flex items-center justify-center px-8 py-8 min-h-[180px]">
                    <NextImage
                      src="/brand/logo-blanco.png"
                      alt="Logo Mangone Law Firm — versión blanca"
                      width={280}
                      height={137}
                      className="object-contain max-w-full"
                      priority
                    />
                  </div>
                  <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--s-f0f0f0)]">
                    <div>
                      <p className="text-sm font-semibold text-[var(--t-1a1a2e)]">Versión blanca</p>
                      <p className="text-xs text-[var(--t-8888a8)]">Uso en fondos oscuros / azul Mangone</p>
                    </div>
                    <a
                      href="/brand/logo-blanco.png"
                      download="Logo_Mangone_Blanco.png"
                      className="flex items-center gap-1.5 text-xs font-semibold text-[var(--t-0c2054)] bg-[var(--s-f0f2f8)] hover:bg-[var(--s-e4e8f5)] px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar PNG
                    </a>
                  </div>
                </Card>

              </div>
            </div>

            {/* Awards */}
            <div>
              <h3 className="text-base font-bold text-[var(--t-1a1a2e)] mb-4">Reconocimientos y Credenciales</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { icon: '🏆', title: 'Top 10 Best Law Firm', sub: 'Client Satisfaction — AILC 2026' },
                  { icon: '⭐', title: 'Best Places to Work 2026', sub: 'Medium Size Business' },
                  { icon: '🚀', title: 'Inc. 5000 — N°538', sub: "America's Fastest-Growing Companies" },
                  { icon: '⚖️', title: 'Inc. 5000 — N°10', sub: 'Industria Legal' },
                  { icon: '📍', title: 'Inc. 5000 — N°13', sub: 'New Jersey' },
                  { icon: '✅', title: 'BBB Acreditado', sub: 'Better Business Bureau' },
                ].map(({ icon, title, sub }) => (
                  <div
                    key={title}
                    className="flex items-start gap-3 p-4 bg-[var(--surface)] border border-[var(--s-e8e8f0)] rounded-xl hover:border-[#F79C31]/40 hover:shadow-sm transition-all"
                  >
                    <span className="text-2xl flex-shrink-0">{icon}</span>
                    <div>
                      <p className="text-sm font-bold text-[var(--t-1a1a2e)]">{title}</p>
                      <p className="text-xs text-[var(--t-8888a8)] mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* ── Avatar Tab ──────────────────────────────────────────────────────── */}
        {activeTab === 'avatar' && (
          <div className="space-y-6">
            {/* Header del tab */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--t-0c2054)]">Avatar del Cliente</h2>
                <p className="text-sm text-[var(--t-8888a8)] mt-0.5">Perfil detallado de tu cliente ideal de Mangone Law Firm</p>
              </div>
              <div className="flex items-center gap-2">
                {avatars.length > 1 && (
                  <div className="flex gap-1 bg-[var(--surface)] border border-[var(--s-e8eaf0)] rounded-xl p-1">
                    {avatars.map(a => (
                      <button
                        key={a.id}
                        onClick={() => setSelectedAvatarId(a.id)}
                        title={a.name}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selectedAvatarId === a.id
                            ? 'bg-[var(--s-0c2054)] text-white'
                            : 'text-[var(--t-4a4a6a)] hover:bg-[var(--s-f7f8fc)]'
                        }`}
                      >
                        <span>{a.emoji}</span>
                        <span className="max-w-[100px] truncate">{a.name.split(' ')[0]}</span>
                        {a.is_primary && <span className="text-[9px] font-bold opacity-60">★</span>}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowCreateAvatar(true)}
                  className="flex items-center gap-2 bg-[var(--s-0c2054)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--s-1a3a7a)] transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo avatar
                </button>
              </div>
            </div>

            {avatarLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-[var(--t-f79c31)] animate-spin" />
              </div>
            ) : avatars.length === 0 ? (
              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[var(--s-f0f2f8)] flex items-center justify-center mx-auto mb-4 text-3xl">
                  👤
                </div>
                <h3 className="font-bold text-[var(--t-0c2054)] text-lg mb-2">Sin avatar definido</h3>
                <p className="text-[var(--t-6b7280)] text-sm mb-6 max-w-sm mx-auto">
                  Crea el perfil de tu cliente ideal para que todo el equipo tenga claro a quién le habla Mangone Law Firm.
                </p>
                <button
                  onClick={() => setShowCreateAvatar(true)}
                  className="inline-flex items-center gap-2 bg-[var(--s-0c2054)] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--s-1a3a7a)] transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Crear primer avatar
                </button>
              </div>
            ) : (
              (() => {
                const selected = avatars.find(a => a.id === selectedAvatarId) ?? avatars[0];
                return (
                  <AvatarCanvas
                    avatar={selected}
                    onSave={async (data) => {
                      await avatarsApi.update(selected.id, data);
                      await loadAvatars();
                    }}
                    onDelete={async () => {
                      if (!confirm(`¿Eliminar el avatar "${selected.name}"?`)) return;
                      await avatarsApi.delete(selected.id);
                      setSelectedAvatarId(null);
                      await loadAvatars();
                    }}
                    onSetPrimary={async () => {
                      await avatarsApi.setPrimary(selected.id);
                      await loadAvatars();
                    }}
                  />
                );
              })()
            )}

            <CreateAvatarModal
              open={showCreateAvatar}
              onClose={() => setShowCreateAvatar(false)}
              onCreate={async (data) => {
                await avatarsApi.create(data);
                await loadAvatars();
              }}
            />
          </div>
        )}
      </div>

        {/* ── Brainstorming Tab ────────────────────────────────────────────── */}
        {activeTab === 'brainstorming' && <BrainstormingTab />}

        {/* ── SOPs Tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'sops' && (
          <div className="px-0">
            <SOPsTab />
          </div>
        )}

        {/* ── Links Tab ────────────────────────────────────────────────────── */}
        {activeTab === 'links' && <LinksTab />}

      {/* ── Manual viewer modal ─────────────────────────────────────────── */}
      {manualOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
          <div className="flex items-center justify-between bg-[var(--s-0c2054)] px-5 py-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[var(--s-f79c31)] flex items-center justify-center">
                <span className="font-bold text-[var(--t-0c2054)] text-sm">M</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">Manual de Marca</p>
                <p className="text-white/50 text-[10px]">Mangone Law Firm, LLC</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/brand/manual.html"
                download="Manual_Marca_Mangone_Law_Firm.html"
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Descargar
              </a>
              <a
                href="/brand/manual.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Abrir en pestaña
              </a>
              <button
                onClick={() => setManualOpen(false)}
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <iframe
            src="/brand/manual.html"
            title="Manual de Marca — Mangone Law Firm"
            className="flex-1 w-full border-0 bg-[var(--surface)]"
          />
        </div>
      )}
    </div>
  );
}
