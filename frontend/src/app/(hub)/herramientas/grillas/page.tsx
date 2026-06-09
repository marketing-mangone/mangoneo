'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  grillasApi, ContentGrid, ContentGridList, GridPost,
  GridPostComment, GridPostVersion,
} from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  Plus, Sparkles, ChevronLeft, Copy, Check, Save,
  ImageIcon, Film, LayoutGrid, Loader2, Trash2, CheckCircle,
  X, ChevronRight, ArrowRight, Calendar, FileText, Zap,
  MessageCircle, History, ThumbsUp, Send, RotateCcw,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const TEMAS = [
  { value: 'vawa',             label: 'VAWA',               emoji: '🛡️', desc: 'Violencia contra la mujer' },
  { value: 'visa_u',           label: 'Visa U',             emoji: '🔵', desc: 'Víctimas de crimen' },
  { value: 'visa_t',           label: 'Visa T',             emoji: '🟣', desc: 'Víctimas de trata' },
  { value: 'visa_t_laboral',   label: 'Visa T – Laboral',   emoji: '💼', desc: 'Trata laboral' },
  { value: 'visa_t_trafico',   label: 'Visa T – Tráfico',   emoji: '🚨', desc: 'Tráfico humano' },
  { value: 'sijs',             label: 'SIJS',               emoji: '👦', desc: 'Estatus inmigrante especial' },
  { value: 'ajuste_estatus',   label: 'Ajuste de Estatus',  emoji: '📋', desc: 'Residencia permanente' },
  { value: 'proceso_consular', label: 'Proceso Consular',   emoji: '🏛️', desc: 'Trámite en consulado' },
  { value: 'uscis',            label: 'USCIS – Noticias',   emoji: '📰', desc: 'Actualizaciones oficiales' },
];

const TONOS = [
  { value: 'educativo',  label: 'Educativo',  desc: 'Informar y enseñar' },
  { value: 'emotivo',    label: 'Emotivo',    desc: 'Conectar con la historia' },
  { value: 'urgente',    label: 'Urgente',    desc: 'Llamado a la acción' },
  { value: 'inspirador', label: 'Inspirador', desc: 'Esperanza y posibilidad' },
];

const DAYS       = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const SLOTS      = ['carousel', 'foto', 'reel'] as const;

const SLOT_CONFIG = {
  carousel: {
    label: 'Carrusel / Post', border: 'border-blue-200', header: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    cell: 'bg-blue-50/60 border-blue-100 hover:border-blue-300 hover:bg-blue-50',
    dot: 'bg-blue-500', Icon: LayoutGrid,
  },
  foto: {
    label: 'Foto', border: 'border-purple-200', header: 'bg-purple-50',
    badge: 'bg-purple-100 text-purple-700',
    cell: 'bg-purple-50/60 border-purple-100 hover:border-purple-300 hover:bg-purple-50',
    dot: 'bg-purple-500', Icon: ImageIcon,
  },
  reel: {
    label: 'Reel', border: 'border-orange-200', header: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-700',
    cell: 'bg-orange-50/60 border-orange-100 hover:border-orange-300 hover:bg-orange-50',
    dot: 'bg-orange-500', Icon: Film,
  },
} as const;

const STATUS_CONFIG = {
  borrador:  { label: 'Borrador',           cls: 'bg-[#f0f0f0] text-[#4a4a6a]' },
  lista:     { label: 'Lista para revisar', cls: 'bg-emerald-100 text-emerald-700' },
  publicada: { label: 'Publicada',          cls: 'bg-blue-100 text-blue-700' },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getUpcomingMondays(count = 12) {
  const today = new Date();
  const dow = today.getDay();
  const toNext = dow === 1 ? 0 : ((1 - dow + 7) % 7 || 7);
  return Array.from({ length: count }, (_, i) => {
    const mon = new Date(today);
    mon.setDate(today.getDate() + toNext + i * 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmtShort = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const fmtLong  = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    return {
      value: mon.toISOString().split('T')[0],
      label: `${fmtShort(mon)} – ${fmtShort(sun)}`,
      full:  `${fmtLong(mon)} – ${fmtLong(sun)}, ${mon.getFullYear()}`,
    };
  });
}

function formatWeekRange(weekStart: string) {
  const mon = new Date(weekStart + 'T00:00:00');
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  return `${fmt(mon)} – ${fmt(sun)}, ${mon.getFullYear()}`;
}

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function getPost(posts: GridPost[], day: number, slot: typeof SLOTS[number]) {
  return posts.find(p => p.day_of_week === day && p.slot === slot) ?? null;
}

function postPreview(post: GridPost): string {
  if (post.slot === 'carousel') return post.headline || post.caption?.split('\n')[0] || '';
  if (post.slot === 'foto')     return post.photo_suggestion || post.caption?.split('\n')[0] || '';
  if (post.slot === 'reel')     return post.video_title || post.caption?.split('\n')[0] || '';
  return post.caption?.split('\n')[0] || '';
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded hover:bg-[#f0f0f0] text-[#8888a8] hover:text-[#4a4a6a] transition-colors"
      title="Copiar"
    >
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  );
}

// ── CommentsPanel ─────────────────────────────────────────────────────────────

function CommentsPanel({ postId, comments: initial }: { postId: number; comments: GridPostComment[] }) {
  const [comments, setComments] = useState<GridPostComment[]>(initial);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setComments(initial); }, [initial]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      const c = await grillasApi.addComment(postId, t);
      setComments(prev => [...prev, c]);
      setText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } finally { setSending(false); }
  };

  const MEMBER_COLORS: Record<string, string> = {
    sebastian: '#0C2054', sebas: '#0C2054',
    alejandra: '#F79C31', sara: '#ec4899',
    gloriana: '#8b5cf6', andrés: '#10b981', jesus: '#06b6d4',
  };

  const avatarColor = (name: string) => {
    const key = name.toLowerCase().split(' ')[0];
    return MEMBER_COLORS[key] ?? '#0C2054';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Comment list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle size={24} className="mx-auto mb-2 text-[#d0d0e0]" />
            <p className="text-xs text-[#8888a8]">Sin comentarios aún.</p>
            <p className="text-[10px] text-[#c0c0d0] mt-0.5">Sé el primero en dejar feedback.</p>
          </div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5"
                style={{ background: avatarColor(c.author_name) }}
              >
                {c.author_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-[11px] font-bold text-[#1a1a2e]">{c.author_name}</span>
                  <span className="text-[10px] text-[#c0c0d0]">{formatRelative(c.created_at)}</span>
                </div>
                <p className="text-xs text-[#4a4a6a] leading-relaxed bg-[#f7f8fc] rounded-xl px-3 py-2 border border-[#f0f0f0]">
                  {c.text}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 flex-shrink-0 border-t border-[#f0f0f0] pt-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={2}
          placeholder="Escribe un comentario… (Enter para enviar)"
          className="flex-1 text-sm bg-[#f7f8fc] border border-[#e8e8f0] rounded-xl px-3 py-2 outline-none focus:border-[#F79C31] focus:bg-white resize-none transition-colors"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="w-8 h-8 self-end flex items-center justify-center rounded-xl bg-[#0C2054] text-white hover:bg-[#1a3a7a] disabled:opacity-40 transition-all flex-shrink-0"
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </button>
      </div>
    </div>
  );
}

// ── HistoryPanel ──────────────────────────────────────────────────────────────

function HistoryPanel({ postId, onRestore }: {
  postId: number;
  onRestore: (caption: string) => void;
}) {
  const [versions, setVersions] = useState<GridPostVersion[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    grillasApi.getHistory(postId)
      .then(setVersions)
      .finally(() => setLoading(false));
  }, [postId]);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={20} className="animate-spin text-[#F79C31]" />
    </div>
  );

  if (versions.length === 0) return (
    <div className="text-center py-10">
      <History size={24} className="mx-auto mb-2 text-[#d0d0e0]" />
      <p className="text-xs text-[#8888a8]">Sin versiones anteriores.</p>
      <p className="text-[10px] text-[#c0c0d0] mt-0.5">El historial se crea al guardar cambios en el caption.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {versions.map((v, i) => (
        <div key={v.id} className="rounded-xl border border-[#e8eaf0] bg-[#fafafa] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#f0f0f0]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#8888a8] bg-[#f0f0f0] px-1.5 py-0.5 rounded-md font-mono">
                v{versions.length - i}
              </span>
              <span className="text-[11px] text-[#8888a8]">{formatRelative(v.created_at)}</span>
              {v.changed_by_name && (
                <span className="text-[10px] text-[#c0c0d0]">· {v.changed_by_name}</span>
              )}
            </div>
            <button
              onClick={() => onRestore(v.caption)}
              className="flex items-center gap-1 text-[10px] font-semibold text-[#F79C31] hover:text-[#e08a20] transition-colors"
            >
              <RotateCcw size={10} /> Restaurar
            </button>
          </div>
          <p className="px-3 py-2 text-[11px] text-[#4a4a6a] font-mono leading-relaxed line-clamp-4 whitespace-pre-wrap">
            {v.caption || <span className="italic text-[#c0c0d0]">Caption vacío</span>}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── PostPanel (slide-over) ────────────────────────────────────────────────────

type PanelTab = 'contenido' | 'comentarios' | 'historial';

function PostPanel({ post, onClose, onSave, onApprove }: {
  post: GridPost;
  onClose: () => void;
  onSave: (id: number, data: Partial<GridPost>) => Promise<void>;
  onApprove: (id: number) => Promise<void>;
}) {
  const cfg = SLOT_CONFIG[post.slot];
  const [draft, setDraft]     = useState<Partial<GridPost>>({});
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [approving, setApproving] = useState(false);
  const [tab, setTab]         = useState<PanelTab>('contenido');

  useEffect(() => { setDraft({}); setSaved(false); setTab('contenido'); }, [post.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const val = (f: keyof GridPost) => ((draft[f] !== undefined ? draft[f] : post[f]) as string) ?? '';
  const arr = (f: 'slide_titles' | 'script_points') =>
    ((draft[f] !== undefined ? draft[f] : post[f]) as string[]) ?? [];
  const isDirty = Object.keys(draft).length > 0;

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    try { await onSave(post.id, draft); setDraft({}); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    finally { setSaving(false); }
  };

  const handleApprove = async () => {
    setApproving(true);
    try { await onApprove(post.id); }
    finally { setApproving(false); }
  };

  const setArr = (f: 'slide_titles' | 'script_points', i: number, v: string) => {
    const next = [...arr(f)]; next[i] = v; setDraft(d => ({ ...d, [f]: next }));
  };

  const ta  = 'w-full bg-[#f7f8fc] border border-[#e8e8f0] rounded-lg px-3 py-2 text-sm text-[#1a1a2e] focus:outline-none focus:border-[#F79C31] focus:bg-white resize-none transition-colors';
  const inp = 'w-full bg-[#f7f8fc] border border-[#e8e8f0] rounded-lg px-3 py-2 text-sm text-[#1a1a2e] focus:outline-none focus:border-[#F79C31] focus:bg-white transition-colors';
  const day = DAYS[post.day_of_week] ?? '';

  const TABS: { key: PanelTab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'contenido',   label: 'Contenido',    icon: FileText },
    { key: 'comentarios', label: 'Comentarios',  icon: MessageCircle, count: post.comments?.length ?? 0 },
    { key: 'historial',   label: 'Historial',    icon: History },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-[500px] bg-white shadow-2xl flex flex-col overflow-hidden"
        style={{ borderLeft: '1px solid #e8eaf0' }}>

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b border-[#f0f0f0] ${cfg.header} flex-shrink-0`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.badge}`}>
              <cfg.Icon size={13} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#1a1a2e]">{cfg.label}</p>
              <p className="text-[10px] text-[#8888a8]">{day}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Approval toggle */}
            <button
              onClick={handleApprove}
              disabled={approving}
              title={post.approved ? `Aprobado por ${post.approved_by_name ?? 'alguien'}` : 'Marcar como aprobado'}
              className={cn(
                'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all',
                post.approved
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                  : 'bg-white border-[#e8eaf0] text-[#8888a8] hover:border-emerald-400 hover:text-emerald-600',
                approving && 'opacity-60 cursor-not-allowed'
              )}
            >
              {approving
                ? <Loader2 size={11} className="animate-spin" />
                : <ThumbsUp size={11} className={post.approved ? 'fill-current' : ''} />
              }
              {post.approved ? 'Aprobado' : 'Aprobar'}
            </button>

            {/* Save */}
            {isDirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all',
                  saved ? 'bg-emerald-100 text-emerald-700' : 'bg-[#0C2054] text-white hover:bg-[#1a3a7a]',
                  saving && 'opacity-60 cursor-not-allowed'
                )}
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : saved ? <Check size={11} /> : <Save size={11} />}
                {saving ? 'Guardando…' : saved ? '¡Guardado!' : 'Guardar'}
              </button>
            )}

            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#8888a8] hover:text-[#1a1a2e] hover:bg-white/60 transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Approval banner */}
        {post.approved && post.approved_by_name && (
          <div className="flex items-center gap-2 px-5 py-2 bg-emerald-50 border-b border-emerald-100 flex-shrink-0">
            <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
            <p className="text-[11px] text-emerald-700">
              Aprobado por <strong>{post.approved_by_name}</strong>
              {post.approved_at && <> · {formatRelative(post.approved_at)}</>}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#f0f0f0] px-5 flex-shrink-0">
          {TABS.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold border-b-2 -mb-px transition-all',
                tab === key
                  ? 'border-[#0C2054] text-[#0C2054]'
                  : 'border-transparent text-[#8888a8] hover:text-[#4a4a6a]'
              )}
            >
              <Icon size={12} />
              {label}
              {count !== undefined && count > 0 && (
                <span className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                  tab === key ? 'bg-[#0C2054] text-white' : 'bg-[#f0f0f0] text-[#8888a8]'
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* ── Contenido ── */}
          {tab === 'contenido' && (
            <div className="space-y-5">
              {post.slot === 'carousel' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">Headline de la imagen</label>
                    <textarea rows={2} value={val('headline')} onChange={e => setDraft(d => ({ ...d, headline: e.target.value }))} className={ta} placeholder="Texto para la gráfica…" />
                  </div>
                  {post.format === 'carousel' && arr('slide_titles').length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">
                        Títulos de slides <span className="text-[#F79C31] font-normal">— para Sara</span>
                      </label>
                      <div className="space-y-1.5">
                        {arr('slide_titles').map((t, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[10px] text-[#8888a8] w-5 shrink-0 font-mono">{i + 1}.</span>
                            <input value={t} onChange={e => setArr('slide_titles', i, e.target.value)} className={inp} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {post.slot === 'foto' && (
                <div>
                  <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">Sugerencia de foto</label>
                  <textarea rows={3} value={val('photo_suggestion')} onChange={e => setDraft(d => ({ ...d, photo_suggestion: e.target.value }))} className={ta} placeholder="Ej: Auguy en oficina mirando a cámara, traje azul…" />
                </div>
              )}

              {post.slot === 'reel' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">Título en pantalla</label>
                    <input value={val('video_title')} onChange={e => setDraft(d => ({ ...d, video_title: e.target.value }))} className={inp} placeholder="Texto corto para el inicio del video…" />
                  </div>
                  {arr('script_points').length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">
                        Guión <span className="text-[#F79C31] font-normal">— para Gloriana</span>
                      </label>
                      <div className="space-y-1.5">
                        {arr('script_points').map((p, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-[10px] text-[#8888a8] mt-2.5 w-5 shrink-0 font-mono">{i + 1}.</span>
                            <textarea rows={2} value={p} onChange={e => setArr('script_points', i, e.target.value)} className={ta} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#4a4a6a]">Caption completo</label>
                  <CopyButton text={val('caption')} />
                </div>
                <textarea
                  rows={10}
                  value={val('caption')}
                  onChange={e => setDraft(d => ({ ...d, caption: e.target.value }))}
                  className={cn(ta, 'font-mono text-[13px] leading-relaxed')}
                />
                <p className="text-[10px] text-[#8888a8] mt-1 text-right">
                  <span className={val('caption').length > 2000 ? 'text-amber-500 font-semibold' : ''}>
                    {val('caption').length}
                  </span>{' / 2,200'}
                </p>
              </div>
            </div>
          )}

          {/* ── Comentarios ── */}
          {tab === 'comentarios' && (
            <CommentsPanel postId={post.id} comments={post.comments ?? []} />
          )}

          {/* ── Historial ── */}
          {tab === 'historial' && (
            <HistoryPanel
              postId={post.id}
              onRestore={(caption) => {
                setDraft(d => ({ ...d, caption }));
                setTab('contenido');
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ── WeeklyGrid ────────────────────────────────────────────────────────────────

function WeeklyGrid({ posts, onSelectPost }: {
  posts: GridPost[];
  onSelectPost: (post: GridPost) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e8eaf0] bg-white shadow-sm">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="border-b border-[#e8eaf0]">
            <th className="w-28 px-4 py-3 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8888a8]">Slot</span>
            </th>
            {DAYS_SHORT.map((d, i) => (
              <th key={i} className="px-2 py-3 text-center">
                <p className="text-[11px] font-bold text-[#0C2054]">{d}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((slot, ri) => {
            const cfg = SLOT_CONFIG[slot];
            return (
              <tr key={slot} className={ri < SLOTS.length - 1 ? 'border-b border-[#f4f4f8]' : ''}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />
                    <span className="text-[11px] font-semibold text-[#4a4a6a]">{cfg.label}</span>
                  </div>
                </td>
                {Array.from({ length: 7 }, (_, day) => {
                  const post = getPost(posts, day, slot);
                  const preview = post ? postPreview(post) : null;
                  return (
                    <td key={day} className="px-2 py-2">
                      {post ? (
                        <button
                          onClick={() => onSelectPost(post)}
                          className={cn(
                            'w-full min-h-[76px] rounded-xl border p-2.5 text-left transition-all group relative',
                            cfg.cell
                          )}
                        >
                          {/* Approval checkmark */}
                          {post.approved && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                              <Check size={9} className="text-white" strokeWidth={3} />
                            </div>
                          )}
                          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide mb-1.5 ${cfg.badge}`}>
                            <cfg.Icon size={8} />
                          </div>
                          {preview ? (
                            <p className="text-[11px] text-[#1a1a2e] leading-snug line-clamp-3 group-hover:text-[#0C2054]">
                              {preview}
                            </p>
                          ) : (
                            <p className="text-[10px] text-[#c0c0d0] italic">Sin contenido</p>
                          )}
                          {(post.comments?.length ?? 0) > 0 && (
                            <div className="flex items-center gap-0.5 mt-1.5">
                              <MessageCircle size={8} className="text-[#8888a8]" />
                              <span className="text-[9px] text-[#8888a8]">{post.comments.length}</span>
                            </div>
                          )}
                        </button>
                      ) : (
                        <div className="w-full min-h-[76px] rounded-xl border border-dashed border-[#e8eaf0] flex items-center justify-center">
                          <span className="text-[10px] text-[#d0d0e0]">—</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── GridDetail ────────────────────────────────────────────────────────────────

function GridDetail({ grid, onBack, onStatusChange, onPostSave, onPostApprove, onDelete }: {
  grid: ContentGrid;
  onBack: () => void;
  onStatusChange: (s: string) => Promise<void>;
  onPostSave: (id: number, data: Partial<GridPost>) => Promise<void>;
  onPostApprove: (id: number) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [selectedPost, setSelectedPost] = useState<GridPost | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const statusCfg = STATUS_CONFIG[grid.status];
  const hasPosts   = grid.posts.length > 0;
  const total      = grid.posts.length;
  const approved   = grid.posts.filter(p => p.approved).length;
  const withContent = grid.posts.filter(p => p.caption && p.caption.trim().length > 0).length;
  const allApproved = total > 0 && approved === total;

  // Keep selectedPost in sync when grid refreshes
  useEffect(() => {
    if (selectedPost) {
      const updated = grid.posts.find(p => p.id === selectedPost.id);
      if (updated) setSelectedPost(updated);
    }
  }, [grid.posts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="mt-1 text-[#8888a8] hover:text-[#0C2054] transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-[#0C2054]">{grid.tema_display}</h1>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm text-[#8888a8] mt-0.5">{formatWeekRange(grid.week_start)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Progress bars */}
          {hasPosts && (
            <div className="flex flex-col gap-1 bg-[#f7f8fc] border border-[#e8eaf0] rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#8888a8] w-16">Contenido</span>
                <div className="w-20 h-1.5 bg-[#e8eaf0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#F79C31] rounded-full transition-all" style={{ width: `${(withContent / Math.max(total, 1)) * 100}%` }} />
                </div>
                <span className="text-[10px] font-bold text-[#4a4a6a]">{withContent}/{total}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#8888a8] w-16">Aprobados</span>
                <div className="w-20 h-1.5 bg-[#e8eaf0] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(approved / Math.max(total, 1)) * 100}%` }} />
                </div>
                <span className="text-[10px] font-bold text-[#4a4a6a]">{approved}/{total}</span>
              </div>
            </div>
          )}

          {grid.status === 'borrador' && hasPosts && (
            <Button
              size="sm" variant="primary"
              onClick={async () => { setStatusLoading(true); try { await onStatusChange('lista'); } finally { setStatusLoading(false); } }}
              disabled={statusLoading || !allApproved}
              title={!allApproved ? `Aprueba todos los posts primero (${approved}/${total})` : undefined}
            >
              {statusLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
              {allApproved ? 'Marcar como Lista' : `Aprobar todos (${approved}/${total})`}
            </Button>
          )}

          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)} className="p-1.5 rounded-lg text-[#8888a8] hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={15} />
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              <span className="text-red-600 text-xs font-medium">¿Eliminar?</span>
              <button onClick={onDelete} className="text-red-600 hover:text-red-700 text-xs font-bold">Sí</button>
              <span className="text-red-300">·</span>
              <button onClick={() => setDeleteConfirm(false)} className="text-[#8888a8] hover:text-[#4a4a6a] text-xs">No</button>
            </div>
          )}
        </div>
      </div>

      {!hasPosts && (
        <div className="text-center py-20 text-[#8888a8] border border-dashed border-[#e8eaf0] rounded-2xl bg-white">
          <Sparkles size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-[#4a4a6a]">La grilla no tiene contenido generado.</p>
        </div>
      )}

      {hasPosts && (
        <>
          <div className="flex items-center gap-5 text-xs text-[#8888a8]">
            {SLOTS.map(slot => {
              const cfg = SLOT_CONFIG[slot];
              return (
                <span key={slot} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              );
            })}
            <span className="text-[#d0d0e0]">·</span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" /> = aprobado
            </span>
            <span className="text-[#d0d0e0]">·</span>
            <span>Clic en celda para editar</span>
          </div>

          <WeeklyGrid posts={grid.posts} onSelectPost={setSelectedPost} />
        </>
      )}

      {selectedPost && (
        <PostPanel
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onSave={onPostSave}
          onApprove={onPostApprove}
        />
      )}
    </div>
  );
}

// ── GrillaCard ────────────────────────────────────────────────────────────────

function GrillaCard({ grilla, onClick }: { grilla: ContentGridList; onClick: () => void }) {
  const s    = STATUS_CONFIG[grilla.status];
  const tema = TEMAS.find(t => t.value === grilla.tema);
  const pct  = grilla.post_count > 0 ? Math.round((grilla.approved_count / grilla.post_count) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-[#e8eaf0] hover:border-[#0C2054]/30 rounded-2xl p-5 transition-all hover:shadow-md group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f0f2f8] flex items-center justify-center text-xl flex-shrink-0">
            {tema?.emoji ?? '📅'}
          </div>
          <div>
            <p className="font-bold text-[#0C2054] text-sm group-hover:text-[#1a3a7a] transition-colors">{grilla.tema_display}</p>
            <p className="text-xs text-[#8888a8] mt-0.5">{formatWeekRange(grilla.week_start)}</p>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${s.cls}`}>{s.label}</span>
      </div>

      {/* Approval progress */}
      {grilla.post_count > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-[#8888a8] font-medium">{grilla.approved_count}/{grilla.post_count}</span>
        </div>
      )}

      <div className="flex items-center gap-3 pt-3 border-t border-[#f4f4f8]">
        <div className="flex gap-1.5">
          {SLOTS.map(slot => <div key={slot} className={`w-1.5 h-1.5 rounded-full ${SLOT_CONFIG[slot].dot}`} />)}
        </div>
        <span className="text-xs text-[#8888a8]">{grilla.post_count} posts</span>
        <span className="text-[#d0d0e0]">·</span>
        <span className="text-xs text-[#8888a8]">
          {new Date(grilla.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <ChevronRight size={12} className="ml-auto text-[#d0d0e0] group-hover:text-[#0C2054] transition-colors" />
      </div>
    </button>
  );
}

// ── CreateWizard ──────────────────────────────────────────────────────────────

function CreateWizard({ onBack, onCreate }: {
  onBack: () => void;
  onCreate: (params: { week_start: string; tema: string; tono?: string; notes?: string }) => Promise<void>;
}) {
  const mondays = getUpcomingMondays();
  const [step, setStep]             = useState<1 | 2 | 3>(1);
  const [week, setWeek]             = useState(mondays[0]?.value ?? '');
  const [tema, setTema]             = useState('');
  const [tono, setTono]             = useState('educativo');
  const [notes, setNotes]           = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState('');

  const selectedTema = TEMAS.find(t => t.value === tema);
  const selectedWeek = mondays.find(m => m.value === week);

  const handleGenerate = async () => {
    setGenerating(true); setError('');
    try { await onCreate({ week_start: week, tema, tono, notes: notes.trim() || undefined }); }
    catch (e: any) { setError(String(e)); setGenerating(false); }
  };

  const STEPS = [
    { n: 1, label: 'Semana',     Icon: Calendar },
    { n: 2, label: 'Tema',       Icon: FileText },
    { n: 3, label: 'Configurar', Icon: Zap },
  ];

  return (
    <div className="max-w-2xl mx-auto p-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[#8888a8] hover:text-[#0C2054] transition-colors mb-8">
        <ChevronLeft size={16} /> Volver a grillas
      </button>

      <div className="flex items-center gap-0 mb-10">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              step === s.n ? 'bg-[#0C2054] text-white shadow-md' :
              step > s.n  ? 'bg-emerald-100 text-emerald-700'   : 'bg-[#f0f2f8] text-[#8888a8]'
            )}>
              {step > s.n ? <Check size={14} /> : <s.Icon size={14} />}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <ArrowRight size={14} className="mx-2 text-[#d0d0e0] flex-shrink-0" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#0C2054] mb-1">¿Para qué semana?</h2>
            <p className="text-sm text-[#8888a8]">Selecciona la semana de publicación</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {mondays.map((m, i) => (
              <button key={m.value} onClick={() => setWeek(m.value)}
                className={cn('flex flex-col items-start p-3.5 rounded-xl border text-left transition-all',
                  week === m.value ? 'bg-[#0C2054] border-[#0C2054] text-white shadow-md' :
                  'bg-white border-[#e8eaf0] hover:border-[#0C2054]/30 hover:shadow-sm')}>
                {i === 0 && <span className="text-[9px] font-bold uppercase tracking-widest mb-1 text-[#F79C31]">Esta semana</span>}
                <p className={cn('text-xs font-bold', week === m.value ? 'text-white' : 'text-[#0C2054]')}>{m.label}</p>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} disabled={!week}
            className="flex items-center gap-2 bg-[#0C2054] text-white font-semibold text-sm px-6 py-3 rounded-xl hover:bg-[#1a3a7a] transition-colors disabled:opacity-50 shadow-sm">
            Siguiente <ArrowRight size={15} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#0C2054] mb-1">¿Cuál es el tema?</h2>
            <p className="text-sm text-[#8888a8]">El tema define el ángulo legal de los 21 posts</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {TEMAS.map(t => (
              <button key={t.value} onClick={() => setTema(t.value)}
                className={cn('flex items-center gap-3 p-4 rounded-xl border text-left transition-all',
                  tema === t.value ? 'bg-[#0C2054] border-[#0C2054] shadow-md' :
                  'bg-white border-[#e8eaf0] hover:border-[#0C2054]/30 hover:shadow-sm')}>
                <span className="text-2xl flex-shrink-0">{t.emoji}</span>
                <div>
                  <p className={cn('text-sm font-bold', tema === t.value ? 'text-white' : 'text-[#0C2054]')}>{t.label}</p>
                  <p className={cn('text-xs mt-0.5', tema === t.value ? 'text-white/60' : 'text-[#8888a8]')}>{t.desc}</p>
                </div>
                {tema === t.value && <Check size={14} className="ml-auto text-[#F79C31] flex-shrink-0" />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setStep(1)} className="px-5 py-2.5 text-sm font-semibold border border-[#e8eaf0] text-[#4a4a6a] rounded-xl hover:bg-[#f7f8fc] transition-colors">Atrás</button>
            <button onClick={() => setStep(3)} disabled={!tema}
              className="flex items-center gap-2 bg-[#0C2054] text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-[#1a3a7a] transition-colors disabled:opacity-50 shadow-sm">
              Siguiente <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#0C2054] mb-1">Configuración final</h2>
            <p className="text-sm text-[#8888a8]">Ajusta el tono y agrega contexto adicional</p>
          </div>
          <div className="bg-[#f7f8fc] border border-[#e8eaf0] rounded-xl p-4 flex items-center gap-4">
            <span className="text-2xl">{selectedTema?.emoji}</span>
            <div>
              <p className="text-sm font-bold text-[#0C2054]">{selectedTema?.label}</p>
              <p className="text-xs text-[#8888a8]">{selectedWeek?.full}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1a1a2e] mb-2.5">Tono de los posts</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TONOS.map(t => (
                <button key={t.value} onClick={() => setTono(t.value)}
                  className={cn('flex flex-col items-center p-3 rounded-xl border text-center transition-all',
                    tono === t.value ? 'bg-[#F79C31]/10 border-[#F79C31] shadow-sm' :
                    'bg-white border-[#e8eaf0] hover:border-[#F79C31]/40')}>
                  <p className={cn('text-xs font-bold', tono === t.value ? 'text-[#0C2054]' : 'text-[#4a4a6a]')}>{t.label}</p>
                  <p className="text-[10px] text-[#8888a8] mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1a1a2e] mb-1.5">
              Contexto adicional <span className="text-[#8888a8] font-normal">(opcional)</span>
            </label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Esta semana hay Consultation Day el jueves. Incluir llamado a ese evento en al menos 3 posts…"
              className="w-full bg-[#f7f8fc] border border-[#e8e8f0] rounded-xl px-4 py-3 text-sm text-[#1a1a2e] focus:outline-none focus:border-[#F79C31] focus:bg-white resize-none transition-colors" />
            <p className="text-[10px] text-[#8888a8] mt-1">Este texto se envía directamente al prompt de la IA.</p>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}
          {generating && (
            <div className="bg-gradient-to-r from-[#0C2054] to-[#1a3a7a] rounded-xl p-5 text-center">
              <Loader2 size={28} className="animate-spin mx-auto mb-3 text-[#F79C31]" />
              <p className="text-sm font-bold text-white mb-1">
                {tema === 'uscis' ? 'Consultando noticias de USCIS…' : 'Generando 21 posts con IA…'}
              </p>
              <p className="text-xs text-white/50">Esto puede tomar 20–40 segundos</p>
              <div className="flex justify-center gap-1 mt-3">
                {['Carruseles', 'Fotos', 'Reels'].map(l => (
                  <span key={l} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/60">{l}</span>
                ))}
              </div>
            </div>
          )}
          {!generating && (
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(2)} className="px-5 py-2.5 text-sm font-semibold border border-[#e8eaf0] text-[#4a4a6a] rounded-xl hover:bg-[#f7f8fc] transition-colors">Atrás</button>
              <button onClick={handleGenerate}
                className="flex items-center gap-2 bg-[#F79C31] text-[#0C2054] font-bold text-sm px-7 py-2.5 rounded-xl hover:bg-[#e08a20] transition-colors shadow-sm">
                <Sparkles size={15} /> Generar con IA
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GrillasPage() {
  const [view, setView]                 = useState<'list' | 'create' | 'detail'>('list');
  const [grillas, setGrillas]           = useState<ContentGridList[]>([]);
  const [selectedGrid, setSelectedGrid] = useState<ContentGrid | null>(null);
  const [loadingList, setLoadingList]   = useState(true);
  const [error, setError]               = useState('');

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try { const d = await grillasApi.list(); setGrillas(d.results); }
    catch { setError('No se pudo cargar la lista de grillas.'); }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const refreshGrid = async () => {
    if (!selectedGrid) return;
    const r = await grillasApi.get(selectedGrid.id);
    setSelectedGrid(r);
    await loadList();
  };

  const handleCreate = async (params: { week_start: string; tema: string; tono?: string; notes?: string }) => {
    const created   = await grillasApi.create({ week_start: params.week_start, tema: params.tema });
    const populated = await grillasApi.generate(created.id);
    setSelectedGrid(populated);
    setView('detail');
    await loadList();
  };

  const handleOpenGrid = async (id: number) => {
    try { const g = await grillasApi.get(id); setSelectedGrid(g); setView('detail'); }
    catch { setError('No se pudo cargar la grilla.'); }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedGrid) return;
    const updated = await grillasApi.update(selectedGrid.id, { status });
    setSelectedGrid(updated);
    await loadList();
  };

  const handlePostSave = async (postId: number, data: Partial<GridPost>) => {
    await grillasApi.updatePost(postId, data);
    await refreshGrid();
  };

  const handlePostApprove = async (postId: number) => {
    await grillasApi.approvePost(postId);
    await refreshGrid();
  };

  const handleDelete = async () => {
    if (!selectedGrid) return;
    await grillasApi.delete(selectedGrid.id);
    setSelectedGrid(null);
    setView('list');
    await loadList();
  };

  // ── Detail ──
  if (view === 'detail' && selectedGrid) {
    return (
      <div className="px-8 py-8 max-w-6xl mx-auto">
        <GridDetail
          grid={selectedGrid}
          onBack={() => { setSelectedGrid(null); setView('list'); }}
          onStatusChange={handleStatusChange}
          onPostSave={handlePostSave}
          onPostApprove={handlePostApprove}
          onDelete={handleDelete}
        />
      </div>
    );
  }

  // ── Create ──
  if (view === 'create') {
    return <CreateWizard onBack={() => { setError(''); setView('list'); }} onCreate={handleCreate} />;
  }

  // ── List ──
  return (
    <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0C2054]">Generador de Grillas</h1>
          <p className="text-sm text-[#8888a8] mt-1">Planning semanal para Instagram, Facebook, TikTok y más</p>
        </div>
        <button
          onClick={() => { setError(''); setView('create'); }}
          className="flex items-center gap-2 bg-[#0C2054] text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-[#1a3a7a] transition-colors shadow-sm flex-shrink-0"
        >
          <Plus size={15} /> Nueva Grilla
        </button>
      </div>

      <div className="flex items-center gap-5 text-xs text-[#8888a8]">
        {SLOTS.map(slot => {
          const cfg = SLOT_CONFIG[slot];
          return <span key={slot} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.label}</span>;
        })}
        <span className="text-[#d0d0e0]">·</span>
        <span>3 posts por día · 21 posts por semana</span>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}

      {loadingList ? (
        <div className="flex items-center justify-center py-28">
          <Loader2 size={28} className="animate-spin text-[#F79C31]" />
        </div>
      ) : grillas.length === 0 ? (
        <div className="text-center py-28 border border-dashed border-[#e8eaf0] rounded-2xl bg-white">
          <div className="w-16 h-16 rounded-2xl bg-[#f0f2f8] flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-[#0C2054] opacity-40" />
          </div>
          <p className="text-base font-bold text-[#0C2054]">Aún no hay grillas</p>
          <p className="text-sm text-[#8888a8] mt-1 mb-6">Crea la primera y deja que la IA planifique tu semana</p>
          <button
            onClick={() => setView('create')}
            className="inline-flex items-center gap-2 bg-[#0C2054] text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-[#1a3a7a] transition-colors shadow-sm"
          >
            <Plus size={15} /> Nueva Grilla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {grillas.map(g => <GrillaCard key={g.id} grilla={g} onClick={() => handleOpenGrid(g.id)} />)}
        </div>
      )}
    </div>
  );
}
