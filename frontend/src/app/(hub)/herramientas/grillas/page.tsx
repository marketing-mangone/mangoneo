'use client';

import { useState, useEffect, useCallback } from 'react';
import { grillasApi, ContentGrid, ContentGridList, GridPost } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  Plus, Sparkles, ChevronLeft, Copy, Check, Save,
  ImageIcon, Film, LayoutGrid, Loader2, Trash2, CheckCircle,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const TEMAS = [
  { value: 'vawa',             label: 'VAWA' },
  { value: 'visa_t',           label: 'Visa T' },
  { value: 'visa_u',           label: 'Visa U' },
  { value: 'visa_t_laboral',   label: 'Visa T – Laboral' },
  { value: 'visa_t_trafico',   label: 'Visa T – Tráfico' },
  { value: 'sijs',             label: 'SIJS' },
  { value: 'ajuste_estatus',   label: 'Ajuste de Estatus' },
  { value: 'proceso_consular', label: 'Proceso Consular' },
  { value: 'uscis',            label: 'USCIS – Noticias' },
];

const DAYS       = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const SLOT_CONFIG = {
  carousel: { label: 'Carrusel / Post',  border: 'border-blue-200',   header: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700',    Icon: LayoutGrid },
  foto:     { label: 'Foto',             border: 'border-purple-200', header: 'bg-purple-50',  badge: 'bg-purple-100 text-purple-700', Icon: ImageIcon  },
  reel:     { label: 'Reel',             border: 'border-orange-200', header: 'bg-orange-50',  badge: 'bg-orange-100 text-orange-700', Icon: Film       },
} as const;

const STATUS_CONFIG = {
  borrador: { label: 'Borrador',           cls: 'bg-[#f0f0f0] text-[#4a4a6a]' },
  lista:    { label: 'Lista para revisar', cls: 'bg-emerald-100 text-emerald-700' },
  publicada:{ label: 'Publicada',          cls: 'bg-blue-100 text-blue-700' },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getUpcomingMondays(count = 10) {
  const today = new Date();
  const dow = today.getDay();
  const toNext = dow === 1 ? 7 : ((1 - dow + 7) % 7 || 7);
  return Array.from({ length: count }, (_, i) => {
    const mon = new Date(today);
    mon.setDate(today.getDate() + toNext + i * 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return { value: mon.toISOString().split('T')[0], label: `${fmt(mon)} – ${fmt(sun)}, ${mon.getFullYear()}` };
  });
}

function formatWeekRange(weekStart: string) {
  const mon = new Date(weekStart + 'T00:00:00');
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  return `${fmt(mon)} – ${fmt(sun)}, ${mon.getFullYear()}`;
}

function getPostsForDay(posts: GridPost[], day: number) {
  return (['carousel', 'foto', 'reel'] as const)
    .map(slot => posts.find(p => p.day_of_week === day && p.slot === slot))
    .filter(Boolean) as GridPost[];
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
      title="Copiar al portapapeles"
    >
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────────────

function PostCard({ post, onSave }: { post: GridPost; onSave: (id: number, data: Partial<GridPost>) => Promise<void> }) {
  const cfg = SLOT_CONFIG[post.slot];
  const [draft, setDraft] = useState<Partial<GridPost>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const val = (f: keyof GridPost) => ((draft[f] !== undefined ? draft[f] : post[f]) as string) ?? '';
  const arr = (f: 'slide_titles' | 'script_points') => ((draft[f] !== undefined ? draft[f] : post[f]) as string[]) ?? [];
  const isDirty = Object.keys(draft).length > 0;

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    try { await onSave(post.id, draft); setDraft({}); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    finally { setSaving(false); }
  };

  const setArr = (f: 'slide_titles' | 'script_points', i: number, v: string) => {
    const next = [...arr(f)]; next[i] = v; setDraft(d => ({ ...d, [f]: next }));
  };

  const textareaClass = "w-full bg-white border border-[#e8e8f0] rounded-lg px-3 py-2 text-sm text-[#1a1a2e] focus:outline-none focus:border-[#F79C31] resize-none";
  const inputClass    = "w-full bg-white border border-[#e8e8f0] rounded-lg px-3 py-2 text-sm text-[#1a1a2e] focus:outline-none focus:border-[#F79C31]";

  return (
    <div className={`rounded-xl border ${cfg.border} overflow-hidden bg-white shadow-sm`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${cfg.header}`}>
        <div className="flex items-center gap-2">
          <cfg.Icon size={14} className="text-[#4a4a6a]" />
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
          {post.slot === 'carousel' && (
            <span className="text-xs text-[#8888a8]">{post.format === 'carousel' ? '· Carrusel' : '· Post Estático'}</span>
          )}
        </div>
        {isDirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={10} className="animate-spin" /> : saved ? <Check size={10} /> : <Save size={10} />}
            {saving ? 'Guardando…' : saved ? 'Guardado' : 'Guardar'}
          </button>
        )}
      </div>

      <div className="px-4 pb-4 pt-3 space-y-4">
        {/* Carousel / Static */}
        {post.slot === 'carousel' && (
          <>
            <div>
              <label className="text-xs text-[#4a4a6a] font-medium block mb-1">Headline de la imagen</label>
              <textarea rows={2} value={val('headline')} onChange={e => setDraft(d => ({ ...d, headline: e.target.value }))} className={textareaClass} placeholder="Texto para la gráfica…" />
            </div>
            {post.format === 'carousel' && arr('slide_titles').length > 0 && (
              <div>
                <label className="text-xs text-[#4a4a6a] font-medium block mb-1">Títulos de slides (para Sara)</label>
                <div className="space-y-1.5">
                  {arr('slide_titles').map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-[#8888a8] w-4 shrink-0">{i + 1}.</span>
                      <input value={t} onChange={e => setArr('slide_titles', i, e.target.value)} className={inputClass} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Foto */}
        {post.slot === 'foto' && (
          <div>
            <label className="text-xs text-[#4a4a6a] font-medium block mb-1">Sugerencia de foto</label>
            <textarea rows={2} value={val('photo_suggestion')} onChange={e => setDraft(d => ({ ...d, photo_suggestion: e.target.value }))} className={textareaClass} placeholder="Ej: Auguy en oficina mirando a cámara, traje azul…" />
          </div>
        )}

        {/* Reel */}
        {post.slot === 'reel' && (
          <>
            <div>
              <label className="text-xs text-[#4a4a6a] font-medium block mb-1">Título en pantalla</label>
              <input value={val('video_title')} onChange={e => setDraft(d => ({ ...d, video_title: e.target.value }))} className={inputClass} placeholder="Texto corto para el inicio del video…" />
            </div>
            {arr('script_points').length > 0 && (
              <div>
                <label className="text-xs text-[#4a4a6a] font-medium block mb-1">Guión para Gloriana</label>
                <div className="space-y-1.5">
                  {arr('script_points').map((p, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs text-[#8888a8] mt-2 w-4 shrink-0">{i + 1}.</span>
                      <textarea rows={2} value={p} onChange={e => setArr('script_points', i, e.target.value)} className={textareaClass} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Caption */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-[#4a4a6a] font-medium">Caption completo</label>
            <CopyButton text={val('caption')} />
          </div>
          <textarea rows={8} value={val('caption')} onChange={e => setDraft(d => ({ ...d, caption: e.target.value }))} className={cn(textareaClass, 'font-mono leading-relaxed')} />
          <p className="text-xs text-[#8888a8] mt-1 text-right">{val('caption').length} / 2,200</p>
        </div>
      </div>
    </div>
  );
}

// ── GridDetail ────────────────────────────────────────────────────────────────

function GridDetail({ grid, onBack, onStatusChange, onPostSave, onDelete }: {
  grid: ContentGrid;
  onBack: () => void;
  onStatusChange: (s: string) => Promise<void>;
  onPostSave: (id: number, data: Partial<GridPost>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [activeDay, setActiveDay] = useState(0);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const statusCfg = STATUS_CONFIG[grid.status];
  const hasPosts = grid.posts.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="mt-0.5 text-[#8888a8] hover:text-[#0C2054] transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#0C2054]">{grid.tema_display}</h1>
            <p className="text-sm text-[#8888a8] mt-0.5">{formatWeekRange(grid.week_start)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusCfg.cls}`}>{statusCfg.label}</span>
          {grid.status === 'borrador' && hasPosts && (
            <Button
              size="sm" variant="primary"
              onClick={async () => { setStatusLoading(true); try { await onStatusChange('lista'); } finally { setStatusLoading(false); } }}
              disabled={statusLoading}
            >
              {statusLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Marcar como Lista
            </Button>
          )}
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)} className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors" title="Eliminar grilla">
              <Trash2 size={16} />
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-red-400">¿Eliminar?</span>
              <button onClick={onDelete} className="text-red-400 hover:text-red-300 font-medium">Sí</button>
              <button onClick={() => setDeleteConfirm(false)} className="text-zinc-400 hover:text-white">No</button>
            </div>
          )}
        </div>
      </div>

      {!hasPosts && (
        <div className="text-center py-16 text-[#8888a8] border border-dashed border-[#e8eaf0] rounded-2xl bg-white">
          <Sparkles size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">La grilla no tiene contenido generado.</p>
        </div>
      )}

      {hasPosts && (
        <>
          {/* Day tabs */}
          <div className="flex gap-1 flex-wrap border-b border-[#e8eaf0] pb-0">
            {DAYS_SHORT.map((d, i) => (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                className={cn(
                  'px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px',
                  activeDay === i
                    ? 'text-[#0C2054] border-[#F79C31] bg-[#f7f8fc]'
                    : 'text-[#8888a8] border-transparent hover:text-[#4a4a6a]'
                )}
              >
                {d}
                <span className="ml-1 text-[#c0c0d0] text-xs">
                  {getPostsForDay(grid.posts, i).length}
                </span>
              </button>
            ))}
          </div>

          {/* Day content */}
          <div>
            <p className="text-sm font-medium text-[#4a4a6a] mb-4">{DAYS[activeDay]}</p>
            {getPostsForDay(grid.posts, activeDay).length === 0 ? (
              <p className="text-xs text-[#8888a8] py-8 text-center">Sin posts para este día.</p>
            ) : (
              <div className="space-y-4">
                {getPostsForDay(grid.posts, activeDay).map(post => (
                  <PostCard key={post.id} post={post} onSave={onPostSave} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── GrillaCard ────────────────────────────────────────────────────────────────

function GrillaCard({ grilla, onClick }: { grilla: ContentGridList; onClick: () => void }) {
  const s = STATUS_CONFIG[grilla.status];
  return (
    <button onClick={onClick} className="w-full text-left bg-white border border-[#e8eaf0] hover:border-[#d0d4e8] rounded-xl p-4 transition-all hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[#0C2054] text-sm">{grilla.tema_display}</p>
          <p className="text-xs text-[#8888a8] mt-0.5">{formatWeekRange(grilla.week_start)}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${s.cls}`}>{s.label}</span>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <span className="text-xs text-[#8888a8]">{grilla.post_count} posts</span>
        <span className="text-[#d0d0e0]">·</span>
        <span className="text-xs text-[#8888a8]">
          {new Date(grilla.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GrillasPage() {
  const mondays = getUpcomingMondays();
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [grillas, setGrillas] = useState<ContentGridList[]>([]);
  const [selectedGrid, setSelectedGrid] = useState<ContentGrid | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ week_start: mondays[0]?.value ?? '', tema: '' });

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try { const d = await grillasApi.list(); setGrillas(d.results); }
    catch { setError('No se pudo cargar la lista de grillas.'); }
    finally { setLoadingList(false); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const handleCreateAndGenerate = async () => {
    if (!form.week_start || !form.tema) return;
    setGenerating(true); setError('');
    try {
      const created = await grillasApi.create({ week_start: form.week_start, tema: form.tema });
      const populated = await grillasApi.generate(created.id);
      setSelectedGrid(populated); setView('detail'); await loadList();
    } catch (e) { setError(String(e)); }
    finally { setGenerating(false); }
  };

  const handleOpenGrid = async (id: number) => {
    try { const g = await grillasApi.get(id); setSelectedGrid(g); setView('detail'); }
    catch { setError('No se pudo cargar la grilla.'); }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedGrid) return;
    const updated = await grillasApi.update(selectedGrid.id, { status });
    setSelectedGrid(updated); await loadList();
  };

  const handlePostSave = async (postId: number, data: Partial<GridPost>) => {
    await grillasApi.updatePost(postId, data);
    if (selectedGrid) { const r = await grillasApi.get(selectedGrid.id); setSelectedGrid(r); }
  };

  const handleDelete = async () => {
    if (!selectedGrid) return;
    await grillasApi.delete(selectedGrid.id);
    setSelectedGrid(null); setView('list'); await loadList();
  };

  const selectClass = "w-full bg-white border border-[#e8e8f0] rounded-lg px-3 py-2.5 text-sm text-[#1a1a2e] focus:outline-none focus:border-[#F79C31] appearance-none cursor-pointer";

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (view === 'detail' && selectedGrid) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <GridDetail grid={selectedGrid} onBack={() => { setSelectedGrid(null); setView('list'); }} onStatusChange={handleStatusChange} onPostSave={handlePostSave} onDelete={handleDelete} />
      </div>
    );
  }

  // ── Create view ─────────────────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <div className="max-w-lg mx-auto p-8">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => setView('list')} className="text-[#8888a8] hover:text-[#0C2054] transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-[#0C2054]">Nueva Grilla</h1>
        </div>

        <div className="bg-white border border-[#e8eaf0] rounded-2xl p-6 space-y-5 shadow-sm">
          <div>
            <label className="text-sm text-[#4a4a6a] font-medium block mb-2">Semana</label>
            <div className="relative">
              <select value={form.week_start} onChange={e => setForm(f => ({ ...f, week_start: e.target.value }))} className={selectClass}>
                {mondays.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-[#4a4a6a] font-medium block mb-2">Tema de la semana</label>
            <select value={form.tema} onChange={e => setForm(f => ({ ...f, tema: e.target.value }))} className={selectClass}>
              <option value="" disabled>Selecciona el tema…</option>
              {TEMAS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {generating && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-4 text-center">
              <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
              <p className="text-sm text-blue-700 font-medium">
                {form.tema === 'uscis'
                  ? 'Consultando noticias de USCIS y generando 21 posts…'
                  : 'Generando 21 posts con IA…'}
              </p>
              <p className="text-xs text-blue-500 mt-1">Esto puede tomar 20–40 segundos</p>

            </div>
          )}

          <Button
            onClick={handleCreateAndGenerate}
            disabled={!form.week_start || !form.tema || generating}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            {generating
              ? <><Loader2 size={16} className="animate-spin" /> Generando…</>
              : <><Sparkles size={16} /> Generar con IA</>
            }
          </Button>
        </div>
      </div>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0C2054]">Generador de Grillas</h1>
          <p className="text-sm text-[#8888a8] mt-1">Planning semanal para Instagram y Facebook</p>
        </div>
        <Button onClick={() => { setError(''); setView('create'); }} variant="secondary">
          <Plus size={16} /> Nueva Grilla
        </Button>
      </div>

      <div className="flex items-center gap-4 text-xs text-[#8888a8]">
        <span className="flex items-center gap-1.5"><LayoutGrid size={12} className="text-blue-500" /> Carrusel / Post</span>
        <span className="flex items-center gap-1.5"><ImageIcon size={12} className="text-purple-500" /> Foto</span>
        <span className="flex items-center gap-1.5"><Film size={12} className="text-orange-500" /> Reel</span>
        <span className="text-[#d0d0e0]">·</span>
        <span>3 posts por día · 21 posts por semana</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {loadingList ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-[#F79C31]" />
        </div>
      ) : grillas.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-[#e8eaf0] rounded-2xl text-[#8888a8] bg-white">
          <Sparkles size={36} className="mx-auto mb-4 opacity-30" />
          <p className="text-base font-medium text-[#4a4a6a]">No hay grillas creadas</p>
          <p className="text-sm mt-1">Crea la primera grilla con el botón de arriba</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {grillas.map(g => <GrillaCard key={g.id} grilla={g} onClick={() => handleOpenGrid(g.id)} />)}
        </div>
      )}
    </div>
  );
}
