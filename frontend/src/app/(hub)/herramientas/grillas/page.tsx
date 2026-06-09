'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  grillasApi, ContentGrid, ContentGridList, GridPost,
  GridPostComment, GridPostVersion, SocialPlatform,
} from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  Plus, Sparkles, ChevronLeft, Copy, Check, Save,
  ImageIcon, Film, LayoutGrid, Loader2, Trash2, CheckCircle,
  X, ChevronRight, ArrowRight, Calendar, FileText, Zap,
  MessageCircle, History, ThumbsUp, Send, RotateCcw,
  Download, CalendarPlus, Printer, Eye, ChevronDown,
  Send as SendIcon, Clock, Globe,
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
  borrador:  { label: 'Borrador',           cls: 'bg-[var(--s-f0f0f0)] text-[var(--t-4a4a6a)]' },
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

// ── Export helpers ────────────────────────────────────────────────────────────

function weekDateForDay(weekStart: string, dayOfWeek: number): string {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + dayOfWeek);
  return d.toISOString().split('T')[0];
}

function exportCSV(grid: ContentGrid) {
  const SLOT_LABEL: Record<string, string> = { carousel: 'Carrusel/Post', foto: 'Foto', reel: 'Reel' };
  const CHANNEL: Record<string, string>    = { carousel: 'IG + FB', foto: 'IG + FB', reel: 'IG + TikTok' };

  const header = ['Día', 'Fecha', 'Slot', 'Canal', 'Titular / Headline', 'Caption', 'Hashtags', 'Notas visuales'];
  const rows = [...grid.posts]
    .sort((a, b) => a.day_of_week - b.day_of_week || a.slot.localeCompare(b.slot))
    .map(p => {
      const notes =
        p.slot === 'carousel' ? (p.slide_titles?.join(' | ') ?? '') :
        p.slot === 'reel'     ? (p.script_points?.slice(0, 2).join(' | ') ?? '') :
        p.photo_suggestion ?? '';
      return [
        DAYS[p.day_of_week],
        weekDateForDay(grid.week_start, p.day_of_week),
        SLOT_LABEL[p.slot] ?? p.slot,
        CHANNEL[p.slot] ?? '',
        p.slot === 'carousel' ? p.headline : p.slot === 'reel' ? p.video_title : p.photo_suggestion,
        p.caption,
        p.hashtags,
        notes,
      ].map(v => `"${(v ?? '').replace(/"/g, '""')}"`);
    });

  const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `grilla_${grid.tema}_${grid.week_start}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function postPreview(post: GridPost): string {
  if (post.slot === 'carousel') return post.headline || post.caption?.split('\n')[0] || '';
  if (post.slot === 'foto')     return post.photo_suggestion || post.caption?.split('\n')[0] || '';
  if (post.slot === 'reel')     return post.video_title || post.caption?.split('\n')[0] || '';
  return post.caption?.split('\n')[0] || '';
}

// ── BriefModal ────────────────────────────────────────────────────────────────

function BriefModal({ grid, onClose }: { grid: ContentGrid; onClose: () => void }) {
  const handlePrint = () => window.print();

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#brief-modal) { display: none !important; }
          #brief-modal { position: static !important; }
          .no-print { display: none !important; }
          .brief-page { page-break-after: always; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--surface)] overflow-y-auto" id="brief-modal">
        {/* Toolbar — hidden on print */}
        <div className="no-print sticky top-0 z-10 flex items-center justify-between bg-[var(--s-0c2054)] px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--s-f79c31)] flex items-center justify-center">
              <FileText size={14} className="text-[var(--t-0c2054)]" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Brief de Diseño — {grid.tema_display}</p>
              <p className="text-white/50 text-xs">{formatWeekRange(grid.week_start)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[var(--s-f79c31)] text-[var(--t-0c2054)] px-4 py-2 rounded-lg hover:bg-[var(--s-e08a20)] transition-colors"
            >
              <Printer size={13} /> Imprimir / PDF
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Brief content */}
        <div className="max-w-4xl mx-auto px-8 py-8 w-full space-y-10">
          {/* Cover */}
          <div className="text-center pb-8 border-b border-[var(--s-e8eaf0)]">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--t-f79c31)] mb-2">Brief de Diseño · Mangone Law Firm</p>
            <h1 className="text-3xl font-bold text-[var(--t-0c2054)] mb-1">{grid.tema_display}</h1>
            <p className="text-[var(--t-8888a8)]">{formatWeekRange(grid.week_start)}</p>
            <div className="flex justify-center gap-6 mt-6">
              {SLOTS.map(slot => {
                const cfg = SLOT_CONFIG[slot];
                const count = grid.posts.filter(p => p.slot === slot).length;
                return (
                  <div key={slot} className="text-center">
                    <p className="text-2xl font-bold text-[var(--t-0c2054)]">{count}</p>
                    <div className="flex items-center gap-1.5 justify-center mt-1">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <p className="text-xs text-[var(--t-8888a8)]">{cfg.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* One section per day */}
          {DAYS.map((dayName, dayIdx) => {
            const dayPosts = SLOTS.map(slot => getPost(grid.posts, dayIdx, slot)).filter(Boolean) as GridPost[];
            if (dayPosts.length === 0) return null;
            const date = weekDateForDay(grid.week_start, dayIdx);
            return (
              <div key={dayIdx} className="brief-page">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[var(--s-0c2054)] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {dayIdx + 1}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--t-0c2054)]">{dayName}</h2>
                    <p className="text-xs text-[var(--t-8888a8)]">{new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {dayPosts.map(post => {
                    const cfg = SLOT_CONFIG[post.slot];
                    return (
                      <div key={post.id} className={`rounded-xl border ${cfg.border} overflow-hidden`}>
                        <div className={`flex items-center gap-2 px-4 py-2.5 ${cfg.header}`}>
                          <div className={`w-5 h-5 rounded flex items-center justify-center ${cfg.badge}`}>
                            <cfg.Icon size={11} />
                          </div>
                          <span className={`text-xs font-bold ${cfg.badge} px-2 py-0.5 rounded-full`}>{cfg.label}</span>
                        </div>

                        <div className="px-5 py-4 grid grid-cols-2 gap-6">
                          {/* Left: design specs */}
                          <div className="space-y-3">
                            {post.slot === 'carousel' && (
                              <>
                                {post.headline && (
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--t-8888a8)] mb-1">Headline para Sara</p>
                                    <p className="text-sm font-semibold text-[var(--t-0c2054)] bg-[var(--s-f0f2f8)] rounded-lg px-3 py-2">{post.headline}</p>
                                  </div>
                                )}
                                {post.slide_titles?.length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--t-8888a8)] mb-1">Slides ({post.slide_titles.length})</p>
                                    <div className="space-y-1">
                                      {post.slide_titles.map((t, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                          <span className="text-[10px] font-mono text-[var(--t-8888a8)] w-4 mt-0.5">{i + 1}.</span>
                                          <p className="text-xs text-[var(--t-1a1a2e)]">{t}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            {post.slot === 'foto' && post.photo_suggestion && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--t-8888a8)] mb-1">Sugerencia de foto</p>
                                <p className="text-sm text-[var(--t-1a1a2e)] bg-[var(--s-faf0ff)] rounded-lg px-3 py-2">{post.photo_suggestion}</p>
                              </div>
                            )}
                            {post.slot === 'reel' && (
                              <>
                                {post.video_title && (
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--t-8888a8)] mb-1">Título en pantalla</p>
                                    <p className="text-sm font-semibold text-[var(--t-1a1a2e)] bg-[var(--s-fff7ed)] rounded-lg px-3 py-2">{post.video_title}</p>
                                  </div>
                                )}
                                {post.script_points?.length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--t-8888a8)] mb-1">Guión para Gloriana</p>
                                    <div className="space-y-1.5">
                                      {post.script_points.map((s, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                          <span className="text-[10px] font-mono text-[var(--t-8888a8)] w-4 mt-0.5">{i + 1}.</span>
                                          <p className="text-xs text-[var(--t-1a1a2e)] leading-relaxed">{s}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Right: caption */}
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--t-8888a8)] mb-1">Caption</p>
                            <p className="text-xs text-[var(--t-1a1a2e)] leading-relaxed whitespace-pre-wrap bg-[var(--s-f7f8fc)] rounded-lg px-3 py-2 border border-[var(--s-e8eaf0)]">
                              {post.caption || <span className="italic text-[var(--t-c0c0d0)]">Sin caption</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── FeedPreview ───────────────────────────────────────────────────────────────

function FeedPreview({ posts }: { posts: GridPost[] }) {
  // Show posts in publication order: Mon→Sun, within each day: carousel→foto→reel
  const ordered = [...posts].sort((a, b) =>
    a.day_of_week !== b.day_of_week
      ? a.day_of_week - b.day_of_week
      : SLOTS.indexOf(a.slot as typeof SLOTS[number]) - SLOTS.indexOf(b.slot as typeof SLOTS[number])
  );

  const SLOT_BG: Record<string, string> = {
    carousel: 'from-blue-100 to-blue-50 border-blue-200',
    foto:     'from-purple-100 to-purple-50 border-purple-200',
    reel:     'from-orange-100 to-orange-50 border-orange-200',
  };

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
        {ordered.map((post, i) => {
          const cfg = SLOT_CONFIG[post.slot];
          const preview = postPreview(post);
          const day = DAYS_SHORT[post.day_of_week];
          return (
            <div
              key={post.id}
              className={`aspect-square rounded-lg border bg-gradient-to-br ${SLOT_BG[post.slot]} flex flex-col p-2 relative overflow-hidden group`}
            >
              {/* Day badge */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] font-bold text-[var(--t-8888a8)]">{day}</span>
                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center ${cfg.badge}`}>
                  <cfg.Icon size={7} />
                </div>
              </div>
              {/* Preview text */}
              <p className="text-[9px] leading-tight text-[var(--t-1a1a2e)] line-clamp-4 flex-1">
                {preview || <span className="italic text-[var(--t-c0c0d0)]">vacío</span>}
              </p>
              {/* Post number */}
              <p className="text-[7px] text-[var(--t-c0c0d0)] mt-1 font-mono text-right">#{i + 1}</p>
              {/* Approved overlay */}
              {post.approved && (
                <div className="absolute top-1 left-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Check size={7} className="text-white" strokeWidth={3} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-[var(--t-8888a8)] mt-2">
        Orden de publicación: Lun → Dom · 3 posts/día · {posts.length} total
      </p>
    </div>
  );
}

// ── ExportMenu ────────────────────────────────────────────────────────────────

function ExportMenu({ grid, onCalendarPush }: {
  grid: ContentGrid;
  onCalendarPush: () => Promise<void>;
}) {
  const [open, setOpen]             = useState(false);
  const [pushing, setPushing]       = useState(false);
  const [pushed, setPushed]         = useState(false);
  const [showBrief, setShowBrief]   = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCalendar = async () => {
    setOpen(false);
    setPushing(true);
    try {
      await onCalendarPush();
      setPushed(true);
      setTimeout(() => setPushed(false), 3000);
    } finally { setPushing(false); }
  };

  const handleCSV = () => { setOpen(false); exportCSV(grid); };
  const handleBrief = () => { setOpen(false); setShowBrief(true); };

  return (
    <>
      {showBrief && <BriefModal grid={grid} onClose={() => setShowBrief(false)} />}

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(o => !o)}
          className={cn(
            'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all',
            pushed
              ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
              : 'bg-[var(--surface)] border-[var(--s-e8eaf0)] text-[var(--t-4a4a6a)] hover:border-[#0C2054]/30 hover:text-[var(--t-0c2054)]'
          )}
        >
          {pushing ? <Loader2 size={12} className="animate-spin" /> : pushed ? <Check size={12} /> : <Download size={12} />}
          {pushed ? '¡Enviado al calendario!' : 'Exportar'}
          {!pushing && !pushed && <ChevronDown size={11} className={cn('transition-transform', open && 'rotate-180')} />}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-[var(--surface)] border border-[var(--s-e8eaf0)] rounded-xl shadow-lg overflow-hidden z-30">
            <button
              onClick={handleCalendar}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-[var(--s-f7f8fc)] transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-[#0C2054]/10 flex items-center justify-center flex-shrink-0">
                <CalendarPlus size={13} className="text-[var(--t-0c2054)]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--t-1a1a2e)]">Enviar al Calendario</p>
                <p className="text-[10px] text-[var(--t-8888a8)]">Crea 21 eventos programados</p>
              </div>
            </button>

            <div className="h-px bg-[var(--s-f0f0f0)]" />

            <button
              onClick={handleCSV}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-[var(--s-f7f8fc)] transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <Download size={13} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--t-1a1a2e)]">Descargar CSV</p>
                <p className="text-[10px] text-[var(--t-8888a8)]">Para Meta Business Suite</p>
              </div>
            </button>

            <div className="h-px bg-[var(--s-f0f0f0)]" />

            <button
              onClick={handleBrief}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-[var(--s-f7f8fc)] transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-[#F79C31]/10 flex items-center justify-center flex-shrink-0">
                <Printer size={13} className="text-[var(--t-f79c31)]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--t-1a1a2e)]">Brief para Sara</p>
                <p className="text-[10px] text-[var(--t-8888a8)]">Vista imprimible de diseño</p>
              </div>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded hover:bg-[var(--s-f0f0f0)] text-[var(--t-8888a8)] hover:text-[var(--t-4a4a6a)] transition-colors"
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
            <MessageCircle size={24} className="mx-auto mb-2 text-[var(--t-d0d0e0)]" />
            <p className="text-xs text-[var(--t-8888a8)]">Sin comentarios aún.</p>
            <p className="text-[10px] text-[var(--t-c0c0d0)] mt-0.5">Sé el primero en dejar feedback.</p>
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
                  <span className="text-[11px] font-bold text-[var(--t-1a1a2e)]">{c.author_name}</span>
                  <span className="text-[10px] text-[var(--t-c0c0d0)]">{formatRelative(c.created_at)}</span>
                </div>
                <p className="text-xs text-[var(--t-4a4a6a)] leading-relaxed bg-[var(--s-f7f8fc)] rounded-xl px-3 py-2 border border-[var(--s-f0f0f0)]">
                  {c.text}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 flex-shrink-0 border-t border-[var(--s-f0f0f0)] pt-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={2}
          placeholder="Escribe un comentario… (Enter para enviar)"
          className="flex-1 text-sm bg-[var(--s-f7f8fc)] border border-[var(--s-e8e8f0)] rounded-xl px-3 py-2 outline-none focus:border-[var(--s-f79c31)] focus:bg-[var(--surface)] resize-none transition-colors"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="w-8 h-8 self-end flex items-center justify-center rounded-xl bg-[var(--s-0c2054)] text-white hover:bg-[var(--s-1a3a7a)] disabled:opacity-40 transition-all flex-shrink-0"
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
      <Loader2 size={20} className="animate-spin text-[var(--t-f79c31)]" />
    </div>
  );

  if (versions.length === 0) return (
    <div className="text-center py-10">
      <History size={24} className="mx-auto mb-2 text-[var(--t-d0d0e0)]" />
      <p className="text-xs text-[var(--t-8888a8)]">Sin versiones anteriores.</p>
      <p className="text-[10px] text-[var(--t-c0c0d0)] mt-0.5">El historial se crea al guardar cambios en el caption.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {versions.map((v, i) => (
        <div key={v.id} className="rounded-xl border border-[var(--s-e8eaf0)] bg-[var(--s-fafafa)] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--s-f0f0f0)]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--t-8888a8)] bg-[var(--s-f0f0f0)] px-1.5 py-0.5 rounded-md font-mono">
                v{versions.length - i}
              </span>
              <span className="text-[11px] text-[var(--t-8888a8)]">{formatRelative(v.created_at)}</span>
              {v.changed_by_name && (
                <span className="text-[10px] text-[var(--t-c0c0d0)]">· {v.changed_by_name}</span>
              )}
            </div>
            <button
              onClick={() => onRestore(v.caption)}
              className="flex items-center gap-1 text-[10px] font-semibold text-[var(--t-f79c31)] hover:text-[var(--t-e08a20)] transition-colors"
            >
              <RotateCcw size={10} /> Restaurar
            </button>
          </div>
          <p className="px-3 py-2 text-[11px] text-[var(--t-4a4a6a)] font-mono leading-relaxed line-clamp-4 whitespace-pre-wrap">
            {v.caption || <span className="italic text-[var(--t-c0c0d0)]">Caption vacío</span>}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── PostPanel (slide-over) ────────────────────────────────────────────────────

// ── ScheduleModal ─────────────────────────────────────────────────────────────

const PLATFORMS: { id: SocialPlatform; label: string; color: string; icon: string }[] = [
  { id: 'instagram', label: 'Instagram', color: 'bg-pink-100 text-pink-700 border-pink-200',    icon: '📸' },
  { id: 'facebook',  label: 'Facebook',  color: 'bg-blue-100 text-blue-700 border-blue-200',    icon: '👤' },
  { id: 'tiktok',    label: 'TikTok',    color: 'bg-slate-100 text-slate-700 border-slate-200', icon: '🎵' },
  { id: 'linkedin',  label: 'LinkedIn',  color: 'bg-sky-100 text-sky-700 border-sky-200',       icon: '💼' },
  { id: 'youtube',   label: 'YouTube',   color: 'bg-red-100 text-red-700 border-red-200',       icon: '▶️' },
];

const PUBLISH_STATUS_CONFIG = {
  scheduled:  { label: 'Programado',  cls: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400' },
  published:  { label: 'Publicado',   cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  failed:     { label: 'Error',       cls: 'bg-red-100 text-red-700',        dot: 'bg-red-500' },
  cancelled:  { label: 'Cancelado',   cls: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-400' },
} as const;

function ScheduleModal({ post, onClose, onDone }: {
  post: GridPost;
  onClose: () => void;
  onDone: (updated: GridPost) => void;
}) {
  const [tab, setTab]               = useState<'schedule' | 'now'>('schedule');
  const [platforms, setPlatforms]   = useState<SocialPlatform[]>(
    post.platforms?.length ? post.platforms : ['instagram', 'facebook'],
  );
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const togglePlatform = (p: SocialPlatform) =>
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleSchedule = async () => {
    if (!platforms.length) { setError('Selecciona al menos una plataforma.'); return; }
    setLoading(true); setError('');
    try {
      const updated = await grillasApi.schedulePost(post.id, {
        scheduled_at: new Date(scheduledAt).toISOString(),
        platforms,
      });
      onDone(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al programar el post.');
      setLoading(false);
    }
  };

  const handlePublishNow = async () => {
    if (!platforms.length) { setError('Selecciona al menos una plataforma.'); return; }
    setLoading(true); setError('');
    try {
      const updated = await grillasApi.publishNow(post.id, { platforms });
      onDone(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al publicar el post.');
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
        className="bg-[var(--surface)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 32px 80px rgba(12,32,84,0.22)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--s-f0f2f8)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--s-0c2054)] flex items-center justify-center">
              <Globe className="w-4 h-4 text-[var(--t-f79c31)]" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--t-0c2054)] text-sm">Publicar en redes sociales</h3>
              <p className="text-xs text-[var(--t-9ca3af)] mt-0.5 truncate max-w-[220px]">
                {post.slot === 'carousel' ? post.headline : post.slot === 'reel' ? post.video_title : post.photo_suggestion || 'Post seleccionado'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--t-9ca3af)] hover:text-[var(--t-374151)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-[var(--s-f0f2f8)] rounded-xl">
            {([['schedule', '🕐  Programar', 'Elige fecha y hora'], ['now', '⚡  Ahora mismo', 'Publica inmediatamente']] as const).map(([id, label, desc]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all text-center',
                  tab === id ? 'bg-[var(--surface)] text-[var(--t-0c2054)] shadow-sm' : 'text-[var(--t-6b7280)] hover:text-[var(--t-374151)]'
                )}
              >
                {label}
                <span className={cn('block text-[10px] font-normal mt-0.5', tab === id ? 'text-[var(--t-9ca3af)]' : 'text-[var(--t-c4c8d4)]')}>{desc}</span>
              </button>
            ))}
          </div>

          {/* Plataformas */}
          <div>
            <p className="text-xs font-semibold text-[var(--t-374151)] uppercase tracking-widest mb-3">Plataformas</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                    platforms.includes(p.id)
                      ? p.color + ' border-current shadow-sm'
                      : 'bg-[var(--surface)] border-[var(--s-e5e7eb)] text-[var(--t-9ca3af)] hover:border-[var(--s-d1d5db)]'
                  )}
                >
                  <span>{p.icon}</span> {p.label}
                  {platforms.includes(p.id) && <Check className="w-3 h-3 ml-0.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha/hora (solo tab schedule) */}
          {tab === 'schedule' && (
            <div>
              <p className="text-xs font-semibold text-[var(--t-374151)] uppercase tracking-widest mb-2">Fecha y hora de publicación</p>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--s-e5e7eb)] bg-[var(--s-f9fafb)] text-sm text-[var(--t-111827)] outline-none focus:border-[var(--s-0c2054)] focus:ring-2 focus:ring-[#0C2054]/10 focus:bg-[var(--surface)] transition-all"
              />
            </div>
          )}

          {/* Caption preview */}
          <div className="bg-[var(--s-f9fafb)] rounded-xl p-4 border border-[var(--s-f0f2f8)]">
            <p className="text-[10px] font-semibold text-[var(--t-9ca3af)] uppercase tracking-widest mb-2">Vista previa del caption</p>
            <p className="text-xs text-[var(--t-374151)] leading-relaxed line-clamp-4 whitespace-pre-line">
              {post.caption || 'Sin caption generado.'}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs">
              <span className="mt-0.5">⚠️</span> {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-[var(--s-e5e7eb)] text-sm text-[var(--t-6b7280)] font-medium hover:bg-[var(--s-f9fafb)] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={tab === 'schedule' ? handleSchedule : handlePublishNow}
              disabled={loading || !platforms.length}
              className="flex-1 py-3 rounded-xl bg-[var(--s-0c2054)] text-white text-sm font-semibold hover:bg-[var(--s-0f2960)] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading
                ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : tab === 'schedule' ? <><Clock className="w-4 h-4" /> Programar</> : <><SendIcon className="w-4 h-4" /> Publicar ahora</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PostPanel ─────────────────────────────────────────────────────────────────

type PanelTab = 'contenido' | 'comentarios' | 'historial';

function PostPanel({ post, onClose, onSave, onApprove }: {
  post: GridPost;
  onClose: () => void;
  onSave: (id: number, data: Partial<GridPost>) => Promise<void>;
  onApprove: (id: number) => Promise<void>;
}) {
  const cfg = SLOT_CONFIG[post.slot];
  const [draft, setDraft]           = useState<Partial<GridPost>>({});
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [approving, setApproving]   = useState(false);
  const [improving, setImproving]   = useState(false);
  const [tab, setTab]               = useState<PanelTab>('contenido');
  const [showSchedule, setShowSchedule] = useState(false);
  const [currentPost, setCurrentPost]   = useState<GridPost>(post);

  useEffect(() => { setDraft({}); setSaved(false); setTab('contenido'); setCurrentPost(post); }, [post.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleImprove = async () => {
    setImproving(true);
    try {
      const { caption } = await grillasApi.improvePost(post.id);
      setDraft(d => ({ ...d, caption }));
    } catch { /* silently fail */ }
    finally { setImproving(false); }
  };

  const ta  = 'w-full bg-[var(--s-f7f8fc)] border border-[var(--s-e8e8f0)] rounded-lg px-3 py-2 text-sm text-[var(--t-1a1a2e)] focus:outline-none focus:border-[var(--s-f79c31)] focus:bg-[var(--surface)] resize-none transition-colors';
  const inp = 'w-full bg-[var(--s-f7f8fc)] border border-[var(--s-e8e8f0)] rounded-lg px-3 py-2 text-sm text-[var(--t-1a1a2e)] focus:outline-none focus:border-[var(--s-f79c31)] focus:bg-[var(--surface)] transition-colors';
  const day = DAYS[post.day_of_week] ?? '';

  const TABS: { key: PanelTab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'contenido',   label: 'Contenido',    icon: FileText },
    { key: 'comentarios', label: 'Comentarios',  icon: MessageCircle, count: post.comments?.length ?? 0 },
    { key: 'historial',   label: 'Historial',    icon: History },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-[500px] bg-[var(--surface)] shadow-2xl flex flex-col overflow-hidden"
        style={{ borderLeft: '1px solid #e8eaf0' }}>

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b border-[var(--s-f0f0f0)] ${cfg.header} flex-shrink-0`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.badge}`}>
              <cfg.Icon size={13} />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--t-1a1a2e)]">{cfg.label}</p>
              <p className="text-[10px] text-[var(--t-8888a8)]">{day}</p>
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
                  : 'bg-[var(--surface)] border-[var(--s-e8eaf0)] text-[var(--t-8888a8)] hover:border-emerald-400 hover:text-emerald-600',
                approving && 'opacity-60 cursor-not-allowed'
              )}
            >
              {approving
                ? <Loader2 size={11} className="animate-spin" />
                : <ThumbsUp size={11} className={post.approved ? 'fill-current' : ''} />
              }
              {post.approved ? 'Aprobado' : 'Aprobar'}
            </button>

            {/* Publish status badge / schedule button */}
            {currentPost.publish_status && PUBLISH_STATUS_CONFIG[currentPost.publish_status] && (
              <span className={cn(
                'flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg',
                PUBLISH_STATUS_CONFIG[currentPost.publish_status].cls,
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', PUBLISH_STATUS_CONFIG[currentPost.publish_status].dot)} />
                {PUBLISH_STATUS_CONFIG[currentPost.publish_status].label}
              </span>
            )}
            {post.approved && !currentPost.publish_status && (
              <button
                onClick={() => setShowSchedule(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border bg-[var(--s-0c2054)] border-[var(--s-0c2054)] text-white hover:bg-[var(--s-1a3a7a)] transition-all shadow-sm"
              >
                <Globe size={11} />
                Publicar
              </button>
            )}
            {currentPost.publish_status === 'scheduled' && (
              <button
                onClick={() => setShowSchedule(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all"
              >
                <Clock size={10} /> Reprogramar
              </button>
            )}

            {/* Save */}
            {isDirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all',
                  saved ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--s-0c2054)] text-white hover:bg-[var(--s-1a3a7a)]',
                  saving && 'opacity-60 cursor-not-allowed'
                )}
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : saved ? <Check size={11} /> : <Save size={11} />}
                {saving ? 'Guardando…' : saved ? '¡Guardado!' : 'Guardar'}
              </button>
            )}

            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--t-8888a8)] hover:text-[var(--t-1a1a2e)] hover:bg-white/60 transition-colors">
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
        <div className="flex border-b border-[var(--s-f0f0f0)] px-5 flex-shrink-0">
          {TABS.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold border-b-2 -mb-px transition-all',
                tab === key
                  ? 'border-[var(--s-0c2054)] text-[var(--t-0c2054)]'
                  : 'border-transparent text-[var(--t-8888a8)] hover:text-[var(--t-4a4a6a)]'
              )}
            >
              <Icon size={12} />
              {label}
              {count !== undefined && count > 0 && (
                <span className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                  tab === key ? 'bg-[var(--s-0c2054)] text-white' : 'bg-[var(--s-f0f0f0)] text-[var(--t-8888a8)]'
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
                    <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Headline de la imagen</label>
                    <textarea rows={2} value={val('headline')} onChange={e => setDraft(d => ({ ...d, headline: e.target.value }))} className={ta} placeholder="Texto para la gráfica…" />
                  </div>
                  {post.format === 'carousel' && arr('slide_titles').length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">
                        Títulos de slides <span className="text-[var(--t-f79c31)] font-normal">— para Sara</span>
                      </label>
                      <div className="space-y-1.5">
                        {arr('slide_titles').map((t, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[10px] text-[var(--t-8888a8)] w-5 shrink-0 font-mono">{i + 1}.</span>
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
                  <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Sugerencia de foto</label>
                  <textarea rows={3} value={val('photo_suggestion')} onChange={e => setDraft(d => ({ ...d, photo_suggestion: e.target.value }))} className={ta} placeholder="Ej: Auguy en oficina mirando a cámara, traje azul…" />
                </div>
              )}

              {post.slot === 'reel' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Título en pantalla</label>
                    <input value={val('video_title')} onChange={e => setDraft(d => ({ ...d, video_title: e.target.value }))} className={inp} placeholder="Texto corto para el inicio del video…" />
                  </div>
                  {arr('script_points').length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">
                        Guión <span className="text-[var(--t-f79c31)] font-normal">— para Gloriana</span>
                      </label>
                      <div className="space-y-1.5">
                        {arr('script_points').map((p, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-[10px] text-[var(--t-8888a8)] mt-2.5 w-5 shrink-0 font-mono">{i + 1}.</span>
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
                  <label className="text-xs font-semibold text-[var(--t-4a4a6a)]">Caption completo</label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleImprove}
                      disabled={improving}
                      title="Mejorar con IA"
                      className={cn(
                        'flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition-all',
                        improving
                          ? 'bg-[#F79C31]/10 border-[#F79C31]/30 text-[var(--t-f79c31)] cursor-not-allowed'
                          : 'bg-[var(--surface)] border-[var(--s-e8e8f0)] text-[var(--t-8888a8)] hover:border-[var(--s-f79c31)] hover:text-[var(--t-f79c31)]'
                      )}
                    >
                      {improving
                        ? <Loader2 size={10} className="animate-spin" />
                        : <Sparkles size={10} />
                      }
                      {improving ? 'Mejorando…' : 'Mejorar con IA'}
                    </button>
                    <CopyButton text={val('caption')} />
                  </div>
                </div>
                <textarea
                  rows={10}
                  value={val('caption')}
                  onChange={e => setDraft(d => ({ ...d, caption: e.target.value }))}
                  className={cn(ta, 'font-mono text-[13px] leading-relaxed')}
                />
                <p className="text-[10px] text-[var(--t-8888a8)] mt-1 text-right">
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

      {/* Schedule modal */}
      {showSchedule && (
        <ScheduleModal
          post={currentPost}
          onClose={() => setShowSchedule(false)}
          onDone={(updated) => {
            setCurrentPost(updated);
            setShowSchedule(false);
          }}
        />
      )}
    </>
  );
}

// ── WeeklyGrid ────────────────────────────────────────────────────────────────

function WeeklyGrid({ posts, onSelectPost }: {
  posts: GridPost[];
  onSelectPost: (post: GridPost) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--s-e8eaf0)] bg-[var(--surface)] shadow-sm">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="border-b border-[var(--s-e8eaf0)]">
            <th className="w-28 px-4 py-3 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--t-8888a8)]">Slot</span>
            </th>
            {DAYS_SHORT.map((d, i) => (
              <th key={i} className="px-2 py-3 text-center">
                <p className="text-[11px] font-bold text-[var(--t-0c2054)]">{d}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((slot, ri) => {
            const cfg = SLOT_CONFIG[slot];
            return (
              <tr key={slot} className={ri < SLOTS.length - 1 ? 'border-b border-[var(--s-f4f4f8)]' : ''}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${cfg.dot} flex-shrink-0`} />
                    <span className="text-[11px] font-semibold text-[var(--t-4a4a6a)]">{cfg.label}</span>
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
                            <p className="text-[11px] text-[var(--t-1a1a2e)] leading-snug line-clamp-3 group-hover:text-[var(--t-0c2054)]">
                              {preview}
                            </p>
                          ) : (
                            <p className="text-[10px] text-[var(--t-c0c0d0)] italic">Sin contenido</p>
                          )}
                          {(post.comments?.length ?? 0) > 0 && (
                            <div className="flex items-center gap-0.5 mt-1.5">
                              <MessageCircle size={8} className="text-[var(--t-8888a8)]" />
                              <span className="text-[9px] text-[var(--t-8888a8)]">{post.comments.length}</span>
                            </div>
                          )}
                        </button>
                      ) : (
                        <div className="w-full min-h-[76px] rounded-xl border border-dashed border-[var(--s-e8eaf0)] flex items-center justify-center">
                          <span className="text-[10px] text-[var(--t-d0d0e0)]">—</span>
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

function GridDetail({ grid, onBack, onStatusChange, onPostSave, onPostApprove, onCalendarPush, onDelete }: {
  grid: ContentGrid;
  onBack: () => void;
  onStatusChange: (s: string) => Promise<void>;
  onPostSave: (id: number, data: Partial<GridPost>) => Promise<void>;
  onPostApprove: (id: number) => Promise<void>;
  onCalendarPush: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [selectedPost, setSelectedPost] = useState<GridPost | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showFeed, setShowFeed]             = useState(false);
  const [showHashtags, setShowHashtags]     = useState(false);
  const [hashtags, setHashtags]             = useState<{ pequeños: string[]; medianos: string[]; grandes: string[] } | null>(null);
  const [loadingHashtags, setLoadingHashtags] = useState(false);
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
          <button onClick={onBack} className="mt-1 text-[var(--t-8888a8)] hover:text-[var(--t-0c2054)] transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--t-0c2054)]">{grid.tema_display}</h1>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm text-[var(--t-8888a8)] mt-0.5">{formatWeekRange(grid.week_start)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Progress bars */}
          {hasPosts && (
            <div className="flex flex-col gap-1 bg-[var(--s-f7f8fc)] border border-[var(--s-e8eaf0)] rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--t-8888a8)] w-16">Contenido</span>
                <div className="w-20 h-1.5 bg-[var(--s-e8eaf0)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--s-f79c31)] rounded-full transition-all" style={{ width: `${(withContent / Math.max(total, 1)) * 100}%` }} />
                </div>
                <span className="text-[10px] font-bold text-[var(--t-4a4a6a)]">{withContent}/{total}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--t-8888a8)] w-16">Aprobados</span>
                <div className="w-20 h-1.5 bg-[var(--s-e8eaf0)] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(approved / Math.max(total, 1)) * 100}%` }} />
                </div>
                <span className="text-[10px] font-bold text-[var(--t-4a4a6a)]">{approved}/{total}</span>
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

          <ExportMenu grid={grid} onCalendarPush={onCalendarPush} />

          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)} className="p-1.5 rounded-lg text-[var(--t-8888a8)] hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={15} />
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              <span className="text-red-600 text-xs font-medium">¿Eliminar?</span>
              <button onClick={onDelete} className="text-red-600 hover:text-red-700 text-xs font-bold">Sí</button>
              <span className="text-red-300">·</span>
              <button onClick={() => setDeleteConfirm(false)} className="text-[var(--t-8888a8)] hover:text-[var(--t-4a4a6a)] text-xs">No</button>
            </div>
          )}
        </div>
      </div>

      {!hasPosts && (
        <div className="text-center py-20 text-[var(--t-8888a8)] border border-dashed border-[var(--s-e8eaf0)] rounded-2xl bg-[var(--surface)]">
          <Sparkles size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-[var(--t-4a4a6a)]">La grilla no tiene contenido generado.</p>
        </div>
      )}

      {hasPosts && (
        <>
          <div className="flex items-center gap-5 text-xs text-[var(--t-8888a8)]">
            {SLOTS.map(slot => {
              const cfg = SLOT_CONFIG[slot];
              return (
                <span key={slot} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              );
            })}
            <span className="text-[var(--t-d0d0e0)]">·</span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" /> = aprobado
            </span>
            <span className="text-[var(--t-d0d0e0)]">·</span>
            <span>Clic en celda para editar</span>
          </div>

          <WeeklyGrid posts={grid.posts} onSelectPost={setSelectedPost} />

          {/* Hashtags panel */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] overflow-hidden">
            <button
              onClick={async () => {
                setShowHashtags(s => !s);
                if (!hashtags && !showHashtags) {
                  setLoadingHashtags(true);
                  try { setHashtags(await grillasApi.generateHashtags(grid.id)); }
                  catch { /* silently fail */ }
                  finally { setLoadingHashtags(false); }
                }
              }}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--s-f7f8fc)] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#F79C31]/10 flex items-center justify-center">
                  <span className="text-sm">#</span>
                </div>
                <p className="text-sm font-bold text-[var(--t-1a1a2e)]">Hashtags con IA</p>
                <span className="text-[10px] text-[var(--t-8888a8)] bg-[var(--s-f0f0f0)] px-2 py-0.5 rounded-full">30 tags · por reach</span>
              </div>
              {loadingHashtags
                ? <Loader2 size={14} className="text-[var(--t-f79c31)] animate-spin" />
                : <ChevronDown size={14} className={cn('text-[var(--t-8888a8)] transition-transform', showHashtags && 'rotate-180')} />
              }
            </button>
            {showHashtags && hashtags && (
              <div className="px-5 pb-5 border-t border-[var(--s-f0f0f0)] pt-4 space-y-4">
                {([
                  { key: 'pequeños' as const,  label: '🎯 Nicho',    desc: '< 100K posts · alta conversión',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                  { key: 'medianos' as const,  label: '⚖️ Balance',  desc: '100K–1M posts · reach + conversión', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { key: 'grandes' as const,   label: '🚀 Alcance',  desc: '> 1M posts · máxima exposición',    color: 'bg-purple-50 text-purple-700 border-purple-200' },
                ] as const).map(({ key, label, desc, color }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-bold text-[var(--t-1a1a2e)]">{label}</p>
                        <p className="text-[10px] text-[var(--t-8888a8)]">{desc}</p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(hashtags[key].join(' '))}
                        className="text-[10px] font-semibold text-[var(--t-8888a8)] hover:text-[var(--t-0c2054)] flex items-center gap-1 transition-colors"
                      >
                        <Copy size={10} /> Copiar grupo
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {hashtags[key].map(tag => (
                        <button
                          key={tag}
                          onClick={() => navigator.clipboard.writeText(tag)}
                          title="Copiar"
                          className={`text-[11px] font-medium px-2 py-1 rounded-lg border transition-all hover:shadow-sm ${color}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  onClick={async () => {
                    setLoadingHashtags(true);
                    try { setHashtags(await grillasApi.generateHashtags(grid.id)); }
                    catch { /* silently fail */ }
                    finally { setLoadingHashtags(false); }
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[var(--t-8888a8)] hover:text-[var(--t-0c2054)] transition-colors"
                >
                  <Sparkles size={11} /> Regenerar hashtags
                </button>
              </div>
            )}
          </div>

          {/* Feed preview toggle */}
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] overflow-hidden">
            <button
              onClick={() => setShowFeed(f => !f)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--s-f7f8fc)] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--s-f0f2f8)] flex items-center justify-center">
                  <Eye size={13} className="text-[var(--t-0c2054)]" />
                </div>
                <p className="text-sm font-bold text-[var(--t-1a1a2e)]">Vista previa del feed</p>
                <span className="text-[10px] text-[var(--t-8888a8)] bg-[var(--s-f0f0f0)] px-2 py-0.5 rounded-full">21 posts en orden</span>
              </div>
              <ChevronDown size={14} className={cn('text-[var(--t-8888a8)] transition-transform', showFeed && 'rotate-180')} />
            </button>
            {showFeed && (
              <div className="px-5 pb-5 border-t border-[var(--s-f0f0f0)]">
                <div className="pt-4">
                  <FeedPreview posts={grid.posts} />
                </div>
              </div>
            )}
          </div>
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
      className="w-full text-left bg-[var(--surface)] border border-[var(--s-e8eaf0)] hover:border-[#0C2054]/30 rounded-2xl p-5 transition-all hover:shadow-md group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--s-f0f2f8)] flex items-center justify-center text-xl flex-shrink-0">
            {tema?.emoji ?? '📅'}
          </div>
          <div>
            <p className="font-bold text-[var(--t-0c2054)] text-sm group-hover:text-[#1a3a7a] transition-colors">{grilla.tema_display}</p>
            <p className="text-xs text-[var(--t-8888a8)] mt-0.5">{formatWeekRange(grilla.week_start)}</p>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${s.cls}`}>{s.label}</span>
      </div>

      {/* Approval progress */}
      {grilla.post_count > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 bg-[var(--s-f0f0f0)] rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-[var(--t-8888a8)] font-medium">{grilla.approved_count}/{grilla.post_count}</span>
        </div>
      )}

      <div className="flex items-center gap-3 pt-3 border-t border-[var(--s-f4f4f8)]">
        <div className="flex gap-1.5">
          {SLOTS.map(slot => <div key={slot} className={`w-1.5 h-1.5 rounded-full ${SLOT_CONFIG[slot].dot}`} />)}
        </div>
        <span className="text-xs text-[var(--t-8888a8)]">{grilla.post_count} posts</span>
        <span className="text-[var(--t-d0d0e0)]">·</span>
        <span className="text-xs text-[var(--t-8888a8)]">
          {new Date(grilla.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <ChevronRight size={12} className="ml-auto text-[var(--t-d0d0e0)] group-hover:text-[var(--t-0c2054)] transition-colors" />
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
  const [genStep, setGenStep]       = useState(0);
  const [error, setError]           = useState('');

  const GEN_STEPS = [
    'Analizando el tema y el tono…',
    'Generando carruseles y posts estáticos…',
    'Creando fotos y reels…',
    'Redactando captions en español…',
    'Verificando cumplimiento legal…',
    '¡Casi listo! Finalizando 21 posts…',
  ];

  const selectedTema = TEMAS.find(t => t.value === tema);
  const selectedWeek = mondays.find(m => m.value === week);

  const handleGenerate = async () => {
    setGenerating(true); setGenStep(0); setError('');
    // Animate through steps while the real call runs
    const interval = setInterval(() => {
      setGenStep(s => (s < GEN_STEPS.length - 1 ? s + 1 : s));
    }, 5000);
    try { await onCreate({ week_start: week, tema, tono, notes: notes.trim() || undefined }); }
    catch (e: any) { setError(String(e)); setGenerating(false); }
    finally { clearInterval(interval); }
  };

  const STEPS = [
    { n: 1, label: 'Semana',     Icon: Calendar },
    { n: 2, label: 'Tema',       Icon: FileText },
    { n: 3, label: 'Configurar', Icon: Zap },
  ];

  return (
    <div className="max-w-2xl mx-auto p-8">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-[var(--t-8888a8)] hover:text-[var(--t-0c2054)] transition-colors mb-8">
        <ChevronLeft size={16} /> Volver a grillas
      </button>

      <div className="flex items-center gap-0 mb-10">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              step === s.n ? 'bg-[var(--s-0c2054)] text-white shadow-md' :
              step > s.n  ? 'bg-emerald-100 text-emerald-700'   : 'bg-[var(--s-f0f2f8)] text-[var(--t-8888a8)]'
            )}>
              {step > s.n ? <Check size={14} /> : <s.Icon size={14} />}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <ArrowRight size={14} className="mx-2 text-[var(--t-d0d0e0)] flex-shrink-0" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--t-0c2054)] mb-1">¿Para qué semana?</h2>
            <p className="text-sm text-[var(--t-8888a8)]">Selecciona la semana de publicación</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {mondays.map((m, i) => (
              <button key={m.value} onClick={() => setWeek(m.value)}
                className={cn('flex flex-col items-start p-3.5 rounded-xl border text-left transition-all',
                  week === m.value ? 'bg-[var(--s-0c2054)] border-[var(--s-0c2054)] text-white shadow-md' :
                  'bg-[var(--surface)] border-[var(--s-e8eaf0)] hover:border-[#0C2054]/30 hover:shadow-sm')}>
                {i === 0 && <span className="text-[9px] font-bold uppercase tracking-widest mb-1 text-[var(--t-f79c31)]">Esta semana</span>}
                <p className={cn('text-xs font-bold', week === m.value ? 'text-white' : 'text-[var(--t-0c2054)]')}>{m.label}</p>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} disabled={!week}
            className="flex items-center gap-2 bg-[var(--s-0c2054)] text-white font-semibold text-sm px-6 py-3 rounded-xl hover:bg-[var(--s-1a3a7a)] transition-colors disabled:opacity-50 shadow-sm">
            Siguiente <ArrowRight size={15} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--t-0c2054)] mb-1">¿Cuál es el tema?</h2>
            <p className="text-sm text-[var(--t-8888a8)]">El tema define el ángulo legal de los 21 posts</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {TEMAS.map(t => (
              <button key={t.value} onClick={() => setTema(t.value)}
                className={cn('flex items-center gap-3 p-4 rounded-xl border text-left transition-all',
                  tema === t.value ? 'bg-[var(--s-0c2054)] border-[var(--s-0c2054)] shadow-md' :
                  'bg-[var(--surface)] border-[var(--s-e8eaf0)] hover:border-[#0C2054]/30 hover:shadow-sm')}>
                <span className="text-2xl flex-shrink-0">{t.emoji}</span>
                <div>
                  <p className={cn('text-sm font-bold', tema === t.value ? 'text-white' : 'text-[var(--t-0c2054)]')}>{t.label}</p>
                  <p className={cn('text-xs mt-0.5', tema === t.value ? 'text-white/60' : 'text-[var(--t-8888a8)]')}>{t.desc}</p>
                </div>
                {tema === t.value && <Check size={14} className="ml-auto text-[var(--t-f79c31)] flex-shrink-0" />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setStep(1)} className="px-5 py-2.5 text-sm font-semibold border border-[var(--s-e8eaf0)] text-[var(--t-4a4a6a)] rounded-xl hover:bg-[var(--s-f7f8fc)] transition-colors">Atrás</button>
            <button onClick={() => setStep(3)} disabled={!tema}
              className="flex items-center gap-2 bg-[var(--s-0c2054)] text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-[var(--s-1a3a7a)] transition-colors disabled:opacity-50 shadow-sm">
              Siguiente <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--t-0c2054)] mb-1">Configuración final</h2>
            <p className="text-sm text-[var(--t-8888a8)]">Ajusta el tono y agrega contexto adicional</p>
          </div>
          <div className="bg-[var(--s-f7f8fc)] border border-[var(--s-e8eaf0)] rounded-xl p-4 flex items-center gap-4">
            <span className="text-2xl">{selectedTema?.emoji}</span>
            <div>
              <p className="text-sm font-bold text-[var(--t-0c2054)]">{selectedTema?.label}</p>
              <p className="text-xs text-[var(--t-8888a8)]">{selectedWeek?.full}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--t-1a1a2e)] mb-2.5">Tono de los posts</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TONOS.map(t => (
                <button key={t.value} onClick={() => setTono(t.value)}
                  className={cn('flex flex-col items-center p-3 rounded-xl border text-center transition-all',
                    tono === t.value ? 'bg-[#F79C31]/10 border-[var(--s-f79c31)] shadow-sm' :
                    'bg-[var(--surface)] border-[var(--s-e8eaf0)] hover:border-[#F79C31]/40')}>
                  <p className={cn('text-xs font-bold', tono === t.value ? 'text-[var(--t-0c2054)]' : 'text-[var(--t-4a4a6a)]')}>{t.label}</p>
                  <p className="text-[10px] text-[var(--t-8888a8)] mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--t-1a1a2e)] mb-1.5">
              Contexto adicional <span className="text-[var(--t-8888a8)] font-normal">(opcional)</span>
            </label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Esta semana hay Consultation Day el jueves. Incluir llamado a ese evento en al menos 3 posts…"
              className="w-full bg-[var(--s-f7f8fc)] border border-[var(--s-e8e8f0)] rounded-xl px-4 py-3 text-sm text-[var(--t-1a1a2e)] focus:outline-none focus:border-[var(--s-f79c31)] focus:bg-[var(--surface)] resize-none transition-colors" />
            <p className="text-[10px] text-[var(--t-8888a8)] mt-1">Este texto se envía directamente al prompt de la IA.</p>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}
          {generating && (
            <div className="bg-gradient-to-br from-[#0C2054] to-[#1a3a7a] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#F79C31]/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={20} className="text-[var(--t-f79c31)] animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Generando tu grilla…</p>
                  <p className="text-[11px] text-white/50">20–40 segundos · {selectedTema?.label} · {TONOS.find(t => t.value === tono)?.label}</p>
                </div>
              </div>

              {/* Progress steps */}
              <div className="space-y-2 mb-4">
                {GEN_STEPS.map((s, i) => (
                  <div key={i} className={cn('flex items-center gap-2.5 transition-all', i > genStep && 'opacity-20')}>
                    <div className={cn(
                      'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                      i < genStep  ? 'bg-emerald-500'      :
                      i === genStep ? 'bg-[var(--s-f79c31)] animate-pulse' : 'bg-white/10'
                    )}>
                      {i < genStep
                        ? <Check size={9} className="text-white" strokeWidth={3} />
                        : i === genStep
                        ? <Loader2 size={9} className="text-white animate-spin" />
                        : <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                      }
                    </div>
                    <p className={cn(
                      'text-xs transition-all',
                      i === genStep ? 'text-white font-semibold' :
                      i < genStep  ? 'text-emerald-300'  : 'text-white/30'
                    )}>{s}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--s-f79c31)] rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(((genStep + 1) / GEN_STEPS.length) * 90, 90)}%` }}
                />
              </div>
            </div>
          )}
          {!generating && (
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(2)} className="px-5 py-2.5 text-sm font-semibold border border-[var(--s-e8eaf0)] text-[var(--t-4a4a6a)] rounded-xl hover:bg-[var(--s-f7f8fc)] transition-colors">Atrás</button>
              <button onClick={handleGenerate}
                className="flex items-center gap-2 bg-[var(--s-f79c31)] text-[var(--t-0c2054)] font-bold text-sm px-7 py-2.5 rounded-xl hover:bg-[var(--s-e08a20)] transition-colors shadow-sm">
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

  const handleCalendarPush = async () => {
    if (!selectedGrid) return;
    await grillasApi.toCalendar(selectedGrid.id);
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
          onCalendarPush={handleCalendarPush}
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
          <h1 className="text-2xl font-bold text-[var(--t-0c2054)]">Generador de Grillas</h1>
          <p className="text-sm text-[var(--t-8888a8)] mt-1">Planning semanal para Instagram, Facebook, TikTok y más</p>
        </div>
        <button
          onClick={() => { setError(''); setView('create'); }}
          className="flex items-center gap-2 bg-[var(--s-0c2054)] text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-[var(--s-1a3a7a)] transition-colors shadow-sm flex-shrink-0"
        >
          <Plus size={15} /> Nueva Grilla
        </button>
      </div>

      <div className="flex items-center gap-5 text-xs text-[var(--t-8888a8)]">
        {SLOTS.map(slot => {
          const cfg = SLOT_CONFIG[slot];
          return <span key={slot} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.label}</span>;
        })}
        <span className="text-[var(--t-d0d0e0)]">·</span>
        <span>3 posts por día · 21 posts por semana</span>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}

      {loadingList ? (
        <div className="flex items-center justify-center py-28">
          <Loader2 size={28} className="animate-spin text-[var(--t-f79c31)]" />
        </div>
      ) : grillas.length === 0 ? (
        <div className="text-center py-28 border border-dashed border-[var(--s-e8eaf0)] rounded-2xl bg-[var(--surface)]">
          <div className="w-16 h-16 rounded-2xl bg-[var(--s-f0f2f8)] flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-[var(--t-0c2054)] opacity-40" />
          </div>
          <p className="text-base font-bold text-[var(--t-0c2054)]">Aún no hay grillas</p>
          <p className="text-sm text-[var(--t-8888a8)] mt-1 mb-6">Crea la primera y deja que la IA planifique tu semana</p>
          <button
            onClick={() => setView('create')}
            className="inline-flex items-center gap-2 bg-[var(--s-0c2054)] text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:bg-[var(--s-1a3a7a)] transition-colors shadow-sm"
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
