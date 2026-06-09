'use client';

import { useState, useEffect, useCallback } from 'react';
import { grillasApi, GridPost, PublishStatus, SocialPlatform } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Globe, Clock, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Loader2, ChevronRight, Trash2, Zap, Send, RotateCcw, X,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<SocialPlatform, { label: string; emoji: string; color: string }> = {
  instagram: { label: 'Instagram', emoji: '📸', color: 'bg-pink-100 text-pink-700' },
  facebook:  { label: 'Facebook',  emoji: '👤', color: 'bg-blue-100 text-blue-700' },
  tiktok:    { label: 'TikTok',    emoji: '🎵', color: 'bg-slate-100 text-slate-700' },
  linkedin:  { label: 'LinkedIn',  emoji: '💼', color: 'bg-sky-100 text-sky-700' },
  youtube:   { label: 'YouTube',   emoji: '▶️', color: 'bg-red-100 text-red-700' },
};

const STATUS_CONFIG: Record<PublishStatus, {
  label: string; icon: React.ElementType; cls: string; dot: string; bg: string;
}> = {
  scheduled: { label: 'Programado',  icon: Clock,         cls: 'text-amber-700',   dot: 'bg-amber-400',   bg: 'bg-amber-50 border-amber-100' },
  published: { label: 'Publicado',   icon: CheckCircle2,  cls: 'text-emerald-700', dot: 'bg-emerald-500', bg: 'bg-emerald-50 border-emerald-100' },
  failed:    { label: 'Error',       icon: AlertCircle,   cls: 'text-red-700',     dot: 'bg-red-500',     bg: 'bg-red-50 border-red-100' },
  cancelled: { label: 'Cancelado',   icon: XCircle,       cls: 'text-slate-500',   dot: 'bg-slate-400',   bg: 'bg-slate-50 border-slate-200' },
};

const SLOT_LABELS: Record<string, string> = {
  carousel: 'Carrusel', foto: 'Foto', reel: 'Reel',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function postTitle(p: GridPost) {
  if (p.slot === 'carousel') return p.headline || p.caption?.split('\n')[0] || 'Sin título';
  if (p.slot === 'reel')     return p.video_title || p.caption?.split('\n')[0] || 'Sin título';
  return p.photo_suggestion || p.caption?.split('\n')[0] || 'Sin título';
}

// ── RescheduleModal ───────────────────────────────────────────────────────────

function RescheduleModal({ post, onClose, onDone }: {
  post: GridPost;
  onClose: () => void;
  onDone: (updated: GridPost) => void;
}) {
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(
    post.platforms?.length ? post.platforms : ['instagram', 'facebook'],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const PLATFORMS: { id: SocialPlatform; label: string; emoji: string }[] = [
    { id: 'instagram', label: 'Instagram', emoji: '📸' },
    { id: 'facebook',  label: 'Facebook',  emoji: '👤' },
    { id: 'tiktok',    label: 'TikTok',    emoji: '🎵' },
    { id: 'linkedin',  label: 'LinkedIn',  emoji: '💼' },
    { id: 'youtube',   label: 'YouTube',   emoji: '▶️' },
  ];

  const toggle = (p: SocialPlatform) =>
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handle = async () => {
    if (!platforms.length) { setError('Selecciona al menos una plataforma.'); return; }
    setLoading(true); setError('');
    try {
      const updated = await grillasApi.schedulePost(post.id, {
        scheduled_at: new Date(scheduledAt).toISOString(),
        platforms,
      });
      onDone(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al reprogramar.');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(12,32,84,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-5"
        style={{ boxShadow: '0 32px 80px rgba(12,32,84,0.22)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[var(--t-0c2054)] text-sm">Reprogramar publicación</h3>
          <button onClick={onClose} className="text-[var(--t-9ca3af)] hover:text-[var(--t-374151)]"><X className="w-4 h-4" /></button>
        </div>

        <div>
          <p className="text-xs font-semibold text-[var(--t-6b7280)] uppercase tracking-widest mb-2">Nueva fecha y hora</p>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full px-4 py-3 rounded-xl border border-[var(--s-e5e7eb)] bg-[var(--s-f9fafb)] text-sm outline-none focus:border-[var(--s-0c2054)] focus:ring-2 focus:ring-[#0C2054]/10 focus:bg-[var(--surface)] transition-all"
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-[var(--t-6b7280)] uppercase tracking-widest mb-2">Plataformas</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                  platforms.includes(p.id)
                    ? 'bg-[var(--s-0c2054)] border-[var(--s-0c2054)] text-white'
                    : 'bg-[var(--surface)] border-[var(--s-e5e7eb)] text-[var(--t-9ca3af)]'
                )}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">⚠️ {error}</div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--s-e5e7eb)] text-sm text-[var(--t-6b7280)] font-medium hover:bg-[var(--s-f9fafb)] transition-colors">
            Cancelar
          </button>
          <button
            onClick={handle}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-[var(--s-0c2054)] text-white text-sm font-semibold hover:bg-[var(--s-0f2960)] transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Clock className="w-4 h-4" /> Reprogramar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PostRow ───────────────────────────────────────────────────────────────────

function PostRow({ post, onUpdate }: { post: GridPost; onUpdate: (updated: GridPost) => void }) {
  const status = post.publish_status!;
  const cfg    = STATUS_CONFIG[status];
  const Icon   = cfg.icon;
  const [cancelling, setCancelling]   = useState(false);
  const [retrying, setRetrying]       = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [expanded, setExpanded]       = useState(false);

  const handleCancel = async () => {
    if (!confirm('¿Cancelar esta publicación programada?')) return;
    setCancelling(true);
    try { onUpdate(await grillasApi.cancelSchedule(post.id)); }
    finally { setCancelling(false); }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      onUpdate(await grillasApi.publishNow(post.id, { platforms: post.platforms }));
    } finally { setRetrying(false); }
  };

  return (
    <>
      <div className={cn('rounded-2xl border p-5 transition-all', cfg.bg)}>
        <div className="flex items-start gap-4">
          {/* Status icon */}
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
            status === 'scheduled' ? 'bg-amber-100' :
            status === 'published' ? 'bg-emerald-100' :
            status === 'failed'    ? 'bg-red-100' : 'bg-slate-100'
          )}>
            <Icon className={cn('w-4 h-4', cfg.cls)} />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1', cfg.cls,
                    status === 'scheduled' ? 'bg-amber-100' :
                    status === 'published' ? 'bg-emerald-100' :
                    status === 'failed'    ? 'bg-red-100' : 'bg-slate-100'
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                    {cfg.label}
                  </span>
                  <span className="text-[11px] text-[var(--t-9ca3af)] bg-white/70 px-2 py-0.5 rounded-full border border-white">
                    {SLOT_LABELS[post.slot] ?? post.slot}
                  </span>
                  {post.grid_tema && (
                    <span className="text-[11px] text-[var(--t-9ca3af)]">{post.grid_tema}</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-[var(--t-0c2054)] truncate">{postTitle(post)}</p>
                <p className="text-xs text-[var(--t-6b7280)] mt-0.5">
                  {status === 'scheduled' && post.scheduled_at && (
                    <><Clock className="w-3 h-3 inline mr-1" />Programado: {formatDateTime(post.scheduled_at)}</>
                  )}
                  {status === 'published' && post.published_at && (
                    <><CheckCircle2 className="w-3 h-3 inline mr-1 text-emerald-500" />Publicado: {formatDateTime(post.published_at)}</>
                  )}
                  {status === 'failed' && <span className="text-red-600">Error al publicar</span>}
                  {status === 'cancelled' && 'Publicación cancelada'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {status === 'scheduled' && (
                  <>
                    <button
                      onClick={() => setShowReschedule(true)}
                      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-amber-200 text-amber-700 hover:bg-amber-50 transition-all"
                    >
                      <RotateCcw className="w-3 h-3" /> Reprogramar
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-red-200 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                    >
                      {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Cancelar
                    </button>
                  </>
                )}
                {status === 'failed' && (
                  <button
                    onClick={handleRetry}
                    disabled={retrying}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--s-0c2054)] text-[var(--t-0c2054)] hover:bg-[var(--s-f0f2f8)] transition-all disabled:opacity-50"
                  >
                    {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    Reintentar
                  </button>
                )}
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="text-[var(--t-9ca3af)] hover:text-[var(--t-374151)] transition-colors p-1"
                >
                  <ChevronRight className={cn('w-4 h-4 transition-transform', expanded && 'rotate-90')} />
                </button>
              </div>
            </div>

            {/* Platforms */}
            {post.platforms?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {post.platforms.map(p => (
                  <span key={p} className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', PLATFORM_CONFIG[p]?.color ?? 'bg-gray-100 text-gray-600')}>
                    {PLATFORM_CONFIG[p]?.emoji} {PLATFORM_CONFIG[p]?.label ?? p}
                  </span>
                ))}
              </div>
            )}

            {/* Error detail */}
            {status === 'failed' && post.publish_error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-xs text-red-700 font-mono">{post.publish_error}</p>
              </div>
            )}

            {/* Caption expanded */}
            {expanded && post.caption && (
              <div className="mt-3 p-3 bg-white/70 rounded-xl border border-white">
                <p className="text-[11px] font-semibold text-[var(--t-9ca3af)] uppercase tracking-widest mb-1.5">Caption</p>
                <p className="text-xs text-[var(--t-374151)] leading-relaxed whitespace-pre-line">{post.caption}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showReschedule && (
        <RescheduleModal
          post={post}
          onClose={() => setShowReschedule(false)}
          onDone={(updated) => { onUpdate(updated); setShowReschedule(false); }}
        />
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const FILTER_STATUSES: { value: PublishStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'Todos' },
  { value: 'scheduled', label: 'Programados' },
  { value: 'published', label: 'Publicados' },
  { value: 'failed',    label: 'Con error' },
  { value: 'cancelled', label: 'Cancelados' },
];

export default function PublicacionesPage() {
  const [posts, setPosts]         = useState<GridPost[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<PublishStatus | 'all'>('all');
  const [platform, setPlatform]   = useState<SocialPlatform | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await grillasApi.getPublishingQueue(
        filter !== 'all' || platform !== 'all'
          ? {
              ...(filter   !== 'all' ? { status:   filter   as PublishStatus }   : {}),
              ...(platform !== 'all' ? { platform: platform as SocialPlatform } : {}),
            }
          : undefined,
      );
      setPosts(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, platform]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = (updated: GridPost) =>
    setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));

  // Stats
  const stats = {
    scheduled: posts.filter(p => p.publish_status === 'scheduled').length,
    published: posts.filter(p => p.publish_status === 'published').length,
    failed:    posts.filter(p => p.publish_status === 'failed').length,
  };

  const filtered = filter === 'all' ? posts : posts.filter(p => p.publish_status === filter);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--s-0c2054)] flex items-center justify-center">
              <Globe className="w-5 h-5 text-[var(--t-f79c31)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--t-0c2054)]">Publicaciones</h1>
              <p className="text-sm text-[var(--t-9ca3af)]">Cola de publicación en redes sociales via Ayrshare</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--s-e5e7eb)] bg-[var(--surface)] text-sm font-medium text-[var(--t-374151)] hover:bg-[var(--s-f9fafb)] transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Programados',  value: stats.scheduled, icon: Clock,        bg: 'bg-amber-50',   border: 'border-amber-100',   txt: 'text-amber-700',   dot: 'bg-amber-400' },
          { label: 'Publicados',   value: stats.published, icon: CheckCircle2, bg: 'bg-emerald-50', border: 'border-emerald-100', txt: 'text-emerald-700', dot: 'bg-emerald-500' },
          { label: 'Con error',    value: stats.failed,    icon: AlertCircle,  bg: 'bg-red-50',     border: 'border-red-100',     txt: 'text-red-700',     dot: 'bg-red-500' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn('rounded-2xl border p-5', s.bg, s.border)}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className={cn('w-4 h-4', s.txt)} />
                <span className={cn('text-xs font-semibold', s.txt)}>{s.label}</span>
              </div>
              <p className={cn('text-3xl font-bold', s.txt)}>{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 p-1 bg-[var(--surface)] rounded-xl border border-[var(--s-e5e7eb)] shadow-sm">
          {FILTER_STATUSES.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                filter === f.value
                  ? 'bg-[var(--s-0c2054)] text-white shadow-sm'
                  : 'text-[var(--t-6b7280)] hover:text-[var(--t-374151)]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          value={platform}
          onChange={e => setPlatform(e.target.value as SocialPlatform | 'all')}
          className="px-3 py-2 rounded-xl border border-[var(--s-e5e7eb)] bg-[var(--surface)] text-xs font-semibold text-[var(--t-374151)] outline-none focus:border-[var(--s-0c2054)] transition-all"
        >
          <option value="all">Todas las plataformas</option>
          {(Object.entries(PLATFORM_CONFIG) as [SocialPlatform, typeof PLATFORM_CONFIG[SocialPlatform]][]).map(([id, cfg]) => (
            <option key={id} value={id}>{cfg.emoji} {cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Connection notice */}
      <div className="flex items-start gap-3 p-4 bg-[var(--s-fef6e7)] border border-[#F79C31]/30 rounded-2xl">
        <div className="w-8 h-8 rounded-lg bg-[#F79C31]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Zap className="w-4 h-4 text-[var(--t-f79c31)]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--t-92400e)]">Conecta Ayrshare para activar la publicación automática</p>
          <p className="text-xs text-[var(--t-b45309)] mt-1 leading-relaxed">
            Agrega tu <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">AYRSHARE_API_KEY</code> en el archivo <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env</code> del backend (y en Railway para producción).
            Obtén tu clave en{' '}
            <span className="font-semibold">app.ayrshare.com → Profile → API Key</span>.
          </p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--t-9ca3af)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-[var(--surface)] rounded-2xl border border-[var(--s-e5e7eb)]">
          <div className="w-14 h-14 rounded-2xl bg-[var(--s-f0f2f8)] flex items-center justify-center mx-auto mb-4">
            <Send className="w-6 h-6 text-[var(--t-9ca3af)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--t-374151)]">
            {filter === 'all' ? 'Aún no hay publicaciones' : `No hay posts ${FILTER_STATUSES.find(f => f.value === filter)?.label.toLowerCase()}`}
          </p>
          <p className="text-xs text-[var(--t-9ca3af)] mt-1 max-w-xs mx-auto">
            Aprueba un post en el Generador de Grillas y usa el botón <strong>Publicar</strong> para programarlo aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(post => (
            <PostRow key={post.id} post={post} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
