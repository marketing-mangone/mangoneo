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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F79C31]/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-[#F79C31]" />
            </div>
            <h3 className="font-bold text-[#1a1a2e]">Nueva idea</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f8fc] text-[#8888a8] transition-colors">
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
            <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">Título <span className="text-red-400">*</span></label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="¿Cuál es la idea?"
              className="w-full px-3 py-2.5 text-sm border border-[#e8e8f0] rounded-lg outline-none focus:border-[#F79C31] transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">Descripción <span className="text-[#8888a8] font-normal">(opcional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Desarrolla la idea con más detalle..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-[#e8e8f0] rounded-lg outline-none focus:border-[#F79C31] transition-colors resize-none"
            />
          </div>

          {/* Author + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">Autor</label>
              <select
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[#e8e8f0] rounded-lg outline-none focus:border-[#F79C31] bg-white transition-colors"
              >
                {TEAM_MEMBERS.map(m => (
                  <option key={m.name} value={m.name}>{m.name} — {m.role}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">Categoría</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[#e8e8f0] rounded-lg outline-none focus:border-[#F79C31] bg-white transition-colors"
              >
                {BRAINSTORM_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">Color de nota</label>
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
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-[#4a4a6a] border border-[#e8e8f0] rounded-lg hover:bg-[#f7f8fc] transition-colors">
              Cancelar
            </button>
            <button type="submit" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#F79C31] rounded-lg hover:bg-[#e08a20] transition-colors shadow-sm">
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
        <p className="text-[#F79C31] text-xs font-semibold uppercase tracking-widest mb-2">Board colaborativo</p>
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
            className="ml-auto flex items-center gap-2 bg-[#F79C31] text-[#0C2054] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#e08a20] transition-colors shadow-md"
          >
            <Lightbulb className="w-4 h-4" /> Nueva idea
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-[#8888a8]" />
          <span className="text-xs font-semibold text-[#4a4a6a]">Categoría:</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['Todos', ...BRAINSTORM_CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                filterCategory === cat
                  ? 'bg-[#0C2054] text-white border-[#0C2054]'
                  : 'bg-white text-[#4a4a6a] border-[#e8e8f0] hover:border-[#d0d0e0]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="ml-4 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[#8888a8]" />
          <span className="text-xs font-semibold text-[#4a4a6a]">Autor:</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['Todos', ...TEAM_MEMBERS.map(m => m.name)].map(name => (
            <button
              key={name}
              onClick={() => setFilterAuthor(name)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                filterAuthor === name
                  ? 'text-white border-transparent'
                  : 'bg-white text-[#4a4a6a] border-[#e8e8f0] hover:border-[#d0d0e0]'
              }`}
              style={filterAuthor === name && name !== 'Todos' ? { background: MEMBER_COLORS[name] ?? '#0C2054', borderColor: 'transparent' } : filterAuthor === name ? { background: '#0C2054' } : {}}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      {!mounted ? null : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e8eaf0] p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FEF3C7] flex items-center justify-center mx-auto mb-4">
            <Lightbulb className="w-8 h-8 text-[#F79C31]" />
          </div>
          <h3 className="font-bold text-[#0C2054] text-lg mb-2">
            {ideas.length === 0 ? 'El board está vacío' : 'Sin ideas con estos filtros'}
          </h3>
          <p className="text-[#6b7280] text-sm mb-6 max-w-sm mx-auto">
            {ideas.length === 0
              ? 'Sé el primero en agregar una idea al board del equipo.'
              : 'Prueba cambiando los filtros para ver más ideas.'}
          </p>
          {ideas.length === 0 && (
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 bg-[#F79C31] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e08a20] transition-all"
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
        <p className="text-xs text-[#8888a8] text-right">
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
      className="rounded-xl overflow-hidden border border-[#e8e8f0] hover:shadow-md transition-all cursor-pointer"
      onClick={copyHex}
    >
      <div className="h-24 w-full" style={{ background: color.hex }} />
      <div className="p-3 bg-white">
        <p className="font-bold text-sm text-[#1a1a2e]">{color.name}</p>
        <p className="text-xs text-[#8888a8] mt-1 font-mono">
          {copied ? '¡Copiado!' : color.hex}
        </p>
        <p className="text-[10px] text-[#8888a8] mt-0.5">RGB: {color.rgb}</p>
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
          <p className="text-sm font-semibold text-[#1a1a2e] leading-tight mb-1 line-clamp-2">
            {doc.title}
          </p>
          {doc.description && (
            <p className="text-xs text-[#8888a8] line-clamp-2 mb-2">{doc.description}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.color}`}>
              {sc.label}
            </span>
            <span className="text-[10px] text-[#8888a8]">
              v{doc.version} · {doc.size_display}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#f0f0f0]">
        <span className="text-[10px] text-[#8888a8] flex items-center gap-1">
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
            className="p-1.5 rounded-lg hover:bg-[#f7f8fc] text-[#8888a8] hover:text-[#4a4a6a] transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDownload}
            title="Descargar"
            className="p-1.5 rounded-lg hover:bg-[#fef5e7] text-[#8888a8] hover:text-[#F79C31] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            title="Eliminar"
            className="p-1.5 rounded-lg hover:bg-red-50 text-[#8888a8] hover:text-red-500 transition-colors"
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F79C31]/10 flex items-center justify-center">
              <CloudUpload className="w-5 h-5 text-[#F79C31]" />
            </div>
            <div>
              <h3 className="font-bold text-[#1a1a2e]">Subir documento</h3>
              <p className="text-xs text-[#8888a8]">PDF, DOCX, PPTX, XLSX, imágenes · máx. 50 MB</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#f7f8fc] text-[#8888a8] transition-colors"
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
                ? 'border-[#F79C31] bg-[#fef5e7]'
                : file
                ? 'border-green-300 bg-green-50'
                : 'border-[#e8e8f0] hover:border-[#F79C31]/50 hover:bg-[#fef5e7]/30'
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
                  <p className="text-sm font-semibold text-[#1a1a2e]">{file.name}</p>
                  <p className="text-xs text-[#8888a8]">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setTitle(''); }}
                  className="ml-auto p-1 rounded-full hover:bg-red-100 text-[#8888a8] hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-[#d0d0e0] mx-auto mb-2" />
                <p className="text-sm text-[#4a4a6a] font-medium">
                  Arrastra el archivo aquí o <span className="text-[#F79C31]">selecciona</span>
                </p>
              </>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre del documento"
              className="w-full px-3 py-2.5 text-sm border border-[#e8e8f0] rounded-lg outline-none focus:border-[#F79C31] transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[#e8e8f0] rounded-lg outline-none focus:border-[#F79C31] bg-white transition-colors"
            >
              {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">
              Descripción <span className="text-[#8888a8] font-normal">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descripción del documento..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-[#e8e8f0] rounded-lg outline-none focus:border-[#F79C31] transition-colors resize-none"
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
              <div className="flex justify-between text-xs text-[#8888a8] mb-1.5">
                <span>{done ? 'Completado' : 'Subiendo...'}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    done ? 'bg-green-500' : 'bg-[#F79C31]'
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
            className="px-4 py-2 text-sm font-semibold text-[#4a4a6a] border border-[#e8e8f0] rounded-lg hover:bg-[#f7f8fc] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={uploading || !file}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#F79C31] rounded-lg hover:bg-[#e08a20] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="font-bold text-[#1a1a2e]">Eliminar documento</h3>
        </div>
        <p className="text-sm text-[#4a4a6a] mb-1">
          ¿Estás seguro de que quieres eliminar <strong>"{doc.title}"</strong>?
        </p>
        <p className="text-xs text-[#8888a8] mb-6">Esta acción no se puede deshacer.</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[#4a4a6a] border border-[#e8e8f0] rounded-lg hover:bg-[#f7f8fc] transition-colors"
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
    <div className="rounded-xl p-4 h-full flex flex-col" style={{ background: '#0C2054' }}>
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
      <div className="bg-white rounded-2xl border border-[#e8eaf0] p-5">
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
                    className="w-full text-lg font-bold text-[#0C2054] border border-[#e5e7eb] rounded-lg px-3 py-1.5 outline-none focus:border-[#0C2054]"
                    placeholder="Nombre del avatar..." />
                  <input value={draft.description} onChange={e => updateField('description', e.target.value)}
                    className="w-full text-sm text-[#6b7280] border border-[#e5e7eb] rounded-lg px-3 py-1.5 outline-none focus:border-[#0C2054]"
                    placeholder="Descripción breve..." />
                  <input value={draft.quote} onChange={e => updateField('quote', e.target.value)}
                    className="w-full text-sm italic border border-[#e5e7eb] rounded-lg px-3 py-1.5 outline-none focus:border-[#F79C31]"
                    placeholder='"Frase que representa al avatar..."' />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-[#0C2054]">{avatar.name}</h3>
                    {avatar.is_primary && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F79C31] text-[#0C2054]">PRINCIPAL</span>
                    )}
                  </div>
                  {avatar.description && <p className="text-sm text-[#6b7280] mt-0.5">{avatar.description}</p>}
                  {avatar.quote && (
                    <p className="text-sm italic text-[#374151] mt-1 border-l-2 border-[#F79C31] pl-3">
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
                className="text-xs text-[#6b7280] border border-[#e5e7eb] px-3 py-1.5 rounded-lg hover:bg-[#f9fafb] transition-colors">
                Marcar como principal
              </button>
            )}
            {editing ? (
              <>
                <button onClick={handleCancel}
                  className="text-xs text-[#6b7280] border border-[#e5e7eb] px-3 py-1.5 rounded-lg hover:bg-[#f9fafb] transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="text-xs font-semibold text-white bg-[#0C2054] px-4 py-1.5 rounded-lg hover:bg-[#1a3a7a] disabled:opacity-50 transition-colors flex items-center gap-1.5">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Guardar
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#0C2054] border border-[#0C2054]/20 bg-[#0C2054]/5 px-3 py-1.5 rounded-lg hover:bg-[#0C2054]/10 transition-colors">
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={onDelete}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9ca3af] hover:text-red-500 hover:bg-red-50 transition-colors">
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

      <p className="text-xs text-[#9ca3af] text-right">Última actualización: {avatar.updated_at_display}</p>
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
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f0f2f8]">
          <h2 className="font-bold text-[#0C2054] text-lg">Nuevo Avatar</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#9ca3af] hover:bg-[#f0f2f8] transition-all">
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
              <p className="text-xs font-semibold text-[#374151] mb-1.5">Emoji</p>
              <div className="flex gap-1.5 flex-wrap">
                {EMOJIS.map(e => (
                  <button key={e} type="button" onClick={() => setEmoji(e)}
                    className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${emoji === e ? 'bg-[#0C2054]/10 ring-2 ring-[#0C2054]' : 'hover:bg-[#f0f2f8]'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#374151] mb-1.5">Nombre del avatar *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="ej. María - La Madre Inmigrante"
              className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#374151] mb-1.5">Descripción breve</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="ej. Madre de 35 años buscando regularizar su estatus..."
              className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#374151] mb-1.5">Color de acento</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-[#e5e7eb] text-[#374151] rounded-xl py-2.5 text-sm font-medium hover:bg-[#f9fafb] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#0C2054] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#1a3a7a] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear avatar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RecursosPage() {
  const [activeTab, setActiveTab] = useState<'docs' | 'brand' | 'avatar' | 'brainstorming'>('docs');
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
            className="flex items-center gap-2 bg-[#F79C31] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#e08a20] transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            Subir archivo
          </button>
        }
      />

      <div className="px-10 py-10 space-y-10">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-[#e8e8f0] rounded-xl p-1 w-fit">
          {[
            { key: 'docs', label: 'Biblioteca de Documentos', icon: FolderOpen },
            { key: 'brand', label: 'Brand Center', icon: Palette },
            { key: 'avatar', label: 'Avatar del Cliente', icon: Users },
            { key: 'brainstorming', label: 'Brainstorming', icon: Lightbulb },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as 'docs' | 'brand' | 'avatar' | 'brainstorming')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === key ? 'bg-[#0C2054] text-white shadow-sm' : 'text-[#4a4a6a] hover:bg-[#f7f8fc]'
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888a8]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar documentos..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#e8e8f0] bg-white rounded-lg outline-none focus:border-[#F79C31] transition-colors"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setCategory(key)}
                    className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-all ${
                      category === key
                        ? 'bg-[#0C2054] text-white border-[#0C2054]'
                        : 'bg-white text-[#4a4a6a] border-[#e8e8f0] hover:border-[#d0d0e0]'
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
                  <p className="text-2xl font-bold text-[#0C2054]">{loading ? '—' : val}</p>
                  <p className="text-xs text-[#8888a8] mt-1">{label}</p>
                </Card>
              ))}
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#F79C31] animate-spin" />
              </div>
            ) : apiError ? (
              <Card className="p-10 text-center">
                <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
                <p className="text-[#4a4a6a] font-medium">Error al cargar documentos</p>
                <p className="text-sm text-[#8888a8] mt-1 mb-4">{apiError}</p>
                <button
                  onClick={loadDocs}
                  className="text-sm font-semibold text-[#F79C31] hover:underline"
                >
                  Reintentar
                </button>
              </Card>
            ) : docs.length === 0 ? (
              <Card className="p-12 text-center">
                <FolderOpen className="w-12 h-12 text-[#d0d0e0] mx-auto mb-3" />
                <p className="text-[#4a4a6a] font-medium">No se encontraron documentos</p>
                <p className="text-sm text-[#8888a8] mt-1 mb-4">
                  {search || category !== 'all'
                    ? 'Intenta con otros filtros de búsqueda'
                    : 'Sube tu primer documento para comenzar'}
                </p>
                {!search && category === 'all' && (
                  <button
                    onClick={() => setUploadOpen(true)}
                    className="flex items-center gap-2 mx-auto bg-[#F79C31] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#e08a20] transition-colors"
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
              <p className="text-[#F79C31] text-xs font-semibold uppercase tracking-widest mb-2">Brand Center</p>
              <h2 className="text-white text-2xl font-bold mb-2">Manual de Marca</h2>
              <p className="text-white/60 text-sm max-w-md">
                Guía oficial de identidad visual de Mangone Law Firm, LLC.
                Todo lo que necesitas para representar la marca correctamente.
              </p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setManualOpen(true)}
                  className="flex items-center gap-2 bg-[#F79C31] text-[#0C2054] font-semibold text-sm px-4 py-2 rounded-lg hover:bg-[#e08a20] transition-colors"
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
                <h3 className="text-base font-bold text-[#1a1a2e]">Paleta de Colores</h3>
                <Badge variant="outline">Clic para copiar HEX</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {BRAND_COLORS.map(color => <ColorSwatch key={color.hex} color={color} />)}
              </div>
              <Card className="p-4 mt-4">
                <p className="text-sm font-semibold text-[#1a1a2e] mb-3">Proporción de uso recomendada</p>
                <div className="flex h-10 rounded-lg overflow-hidden shadow-sm">
                  <div className="flex items-center justify-center text-white text-xs font-bold" style={{ width: '40%', background: '#0C2054' }}>40% Azul</div>
                  <div className="flex items-center justify-center text-[#3B3537] text-xs font-bold" style={{ width: '30%', background: '#f0eeec' }}>30% Blanco</div>
                  <div className="flex items-center justify-center text-white text-xs font-bold" style={{ width: '15%', background: '#F79C31' }}>15%</div>
                  <div className="flex items-center justify-center text-white text-xs font-bold" style={{ width: '10%', background: '#3B3537' }}>10%</div>
                  <div className="flex items-center justify-center text-gray-400 text-[10px]" style={{ width: '5%', background: '#e0e0e0' }}>5%</div>
                </div>
              </Card>
            </div>

            {/* Typography */}
            <div>
              <h3 className="text-base font-bold text-[#1a1a2e] mb-4">Tipografías</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Bebas Neue', role: 'Títulos principales', sample: 'MANGONE LAW FIRM', style: { fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px', letterSpacing: '2px', color: '#0C2054' } },
                  { name: 'Montserrat Bold', role: 'Subtítulos', sample: 'Tu aliado en el camino legal', style: { fontFamily: 'Montserrat', fontWeight: 700, fontSize: '20px', color: '#0C2054' } },
                  { name: 'Montserrat Regular', role: 'Cuerpo de texto', sample: 'Apoyamos a los nuevos americanos en su camino hacia la estabilidad legal.', style: { fontFamily: 'Montserrat', fontWeight: 400, fontSize: '15px', color: '#3B3537' } },
                ].map(t => (
                  <Card key={t.name} className="p-5">
                    <p className="text-[#F79C31] text-[10px] font-bold uppercase tracking-widest mb-3">{t.name}</p>
                    <p className="text-xs text-[#8888a8] mb-3">{t.role}</p>
                    <p style={t.style as React.CSSProperties} className="leading-tight">{t.sample}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Logos */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#1a1a2e]">Logos Disponibles</h3>
                <span className="text-xs text-[#8888a8]">PNG · Alta resolución (7800×3800 px)</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Logo negro — sobre fondo claro */}
                <Card className="overflow-hidden">
                  <div className="bg-white flex items-center justify-center px-8 py-8 min-h-[180px]">
                    <NextImage
                      src="/brand/logo-negro.png"
                      alt="Logo Mangone Law Firm — versión negra"
                      width={280}
                      height={137}
                      className="object-contain max-w-full"
                      priority
                    />
                  </div>
                  <div className="flex items-center justify-between px-5 py-3 border-t border-[#f0f0f0]">
                    <div>
                      <p className="text-sm font-semibold text-[#1a1a2e]">Versión negra</p>
                      <p className="text-xs text-[#8888a8]">Uso en fondos claros / blancos</p>
                    </div>
                    <a
                      href="/brand/logo-negro.png"
                      download="Logo_Mangone_Negro.png"
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#0C2054] bg-[#f0f2f8] hover:bg-[#e4e8f5] px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar PNG
                    </a>
                  </div>
                </Card>

                {/* Logo blanco — sobre fondo oscuro */}
                <Card className="overflow-hidden">
                  <div className="bg-[#0C2054] flex items-center justify-center px-8 py-8 min-h-[180px]">
                    <NextImage
                      src="/brand/logo-blanco.png"
                      alt="Logo Mangone Law Firm — versión blanca"
                      width={280}
                      height={137}
                      className="object-contain max-w-full"
                      priority
                    />
                  </div>
                  <div className="flex items-center justify-between px-5 py-3 border-t border-[#f0f0f0]">
                    <div>
                      <p className="text-sm font-semibold text-[#1a1a2e]">Versión blanca</p>
                      <p className="text-xs text-[#8888a8]">Uso en fondos oscuros / azul Mangone</p>
                    </div>
                    <a
                      href="/brand/logo-blanco.png"
                      download="Logo_Mangone_Blanco.png"
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#0C2054] bg-[#f0f2f8] hover:bg-[#e4e8f5] px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar PNG
                    </a>
                  </div>
                </Card>

              </div>
            </div>

            {/* Awards */}
            <div>
              <h3 className="text-base font-bold text-[#1a1a2e] mb-4">Reconocimientos y Credenciales</h3>
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
                    className="flex items-start gap-3 p-4 bg-white border border-[#e8e8f0] rounded-xl hover:border-[#F79C31]/40 hover:shadow-sm transition-all"
                  >
                    <span className="text-2xl flex-shrink-0">{icon}</span>
                    <div>
                      <p className="text-sm font-bold text-[#1a1a2e]">{title}</p>
                      <p className="text-xs text-[#8888a8] mt-0.5">{sub}</p>
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
                <h2 className="text-xl font-bold text-[#0C2054]">Avatar del Cliente</h2>
                <p className="text-sm text-[#8888a8] mt-0.5">Perfil detallado de tu cliente ideal de Mangone Law Firm</p>
              </div>
              <div className="flex items-center gap-2">
                {avatars.length > 1 && (
                  <div className="flex gap-1 bg-white border border-[#e8eaf0] rounded-xl p-1">
                    {avatars.map(a => (
                      <button
                        key={a.id}
                        onClick={() => setSelectedAvatarId(a.id)}
                        title={a.name}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selectedAvatarId === a.id
                            ? 'bg-[#0C2054] text-white'
                            : 'text-[#4a4a6a] hover:bg-[#f7f8fc]'
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
                  className="flex items-center gap-2 bg-[#0C2054] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#1a3a7a] transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo avatar
                </button>
              </div>
            </div>

            {avatarLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 text-[#F79C31] animate-spin" />
              </div>
            ) : avatars.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#e8eaf0] p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#f0f2f8] flex items-center justify-center mx-auto mb-4 text-3xl">
                  👤
                </div>
                <h3 className="font-bold text-[#0C2054] text-lg mb-2">Sin avatar definido</h3>
                <p className="text-[#6b7280] text-sm mb-6 max-w-sm mx-auto">
                  Crea el perfil de tu cliente ideal para que todo el equipo tenga claro a quién le habla Mangone Law Firm.
                </p>
                <button
                  onClick={() => setShowCreateAvatar(true)}
                  className="inline-flex items-center gap-2 bg-[#0C2054] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a3a7a] transition-all"
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

      {/* ── Manual viewer modal ─────────────────────────────────────────── */}
      {manualOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm">
          <div className="flex items-center justify-between bg-[#0C2054] px-5 py-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#F79C31] flex items-center justify-center">
                <span className="font-bold text-[#0C2054] text-sm">M</span>
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
            className="flex-1 w-full border-0 bg-white"
          />
        </div>
      )}
    </div>
  );
}
