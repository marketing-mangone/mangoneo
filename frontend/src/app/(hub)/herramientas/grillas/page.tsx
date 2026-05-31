'use client';

import { useState, useEffect, useCallback } from 'react';
import { grillasApi, ContentGrid, ContentGridList, GridPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus, Sparkles, ChevronLeft, Copy, Check, Save,
  ImageIcon, Film, LayoutGrid, Loader2, Trash2, CheckCircle,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const TEMAS = [
  { value: 'vawa',            label: 'VAWA' },
  { value: 'visa_t',          label: 'Visa T' },
  { value: 'visa_u',          label: 'Visa U' },
  { value: 'visa_t_laboral',  label: 'Visa T – Laboral' },
  { value: 'visa_t_trafico',  label: 'Visa T – Tráfico' },
  { value: 'sijs',            label: 'SIJS' },
  { value: 'ajuste_estatus',  label: 'Ajuste de Estatus' },
  { value: 'proceso_consular', label: 'Proceso Consular' },
];

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const SLOT_CONFIG = {
  carousel: { label: 'Carrusel / Post',  color: 'bg-blue-900/40 border-blue-700',  badge: 'bg-blue-800 text-blue-100',  icon: LayoutGrid },
  foto:     { label: 'Foto',             color: 'bg-purple-900/40 border-purple-700', badge: 'bg-purple-800 text-purple-100', icon: ImageIcon },
  reel:     { label: 'Reel',             color: 'bg-orange-900/40 border-orange-700', badge: 'bg-orange-800 text-orange-100', icon: Film },
};

const STATUS_CONFIG = {
  borrador: { label: 'Borrador',           class: 'bg-zinc-700 text-zinc-200' },
  lista:    { label: 'Lista para revisar', class: 'bg-emerald-700 text-emerald-100' },
  publicada:{ label: 'Publicada',          class: 'bg-blue-700 text-blue-100' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getUpcomingMondays(count = 10): { value: string; label: string }[] {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const daysToNextMonday = dow === 1 ? 7 : ((1 - dow + 7) % 7 || 7);
  return Array.from({ length: count }, (_, i) => {
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToNextMonday + i * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    return {
      value: monday.toISOString().split('T')[0],
      label: `${fmt(monday)} – ${fmt(sunday)}, ${monday.getFullYear()}`,
    };
  });
}

function formatWeekRange(weekStart: string): string {
  const monday = new Date(weekStart + 'T00:00:00');
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  return `${fmt(monday)} – ${fmt(sunday)}, ${monday.getFullYear()}`;
}

function getPostsForDay(posts: GridPost[], day: number): GridPost[] {
  const order = ['carousel', 'foto', 'reel'];
  return order
    .map(slot => posts.find(p => p.day_of_week === day && p.slot === slot))
    .filter(Boolean) as GridPost[];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
      title="Copiar al portapapeles"
    >
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  );
}

function PostCard({
  post,
  onSave,
}: {
  post: GridPost;
  onSave: (postId: number, data: Partial<GridPost>) => Promise<void>;
}) {
  const cfg = SLOT_CONFIG[post.slot];
  const Icon = cfg.icon;
  const [draft, setDraft] = useState<Partial<GridPost>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const current = (field: keyof GridPost) =>
    (draft[field] !== undefined ? draft[field] : post[field]) as string;

  const currentArray = (field: 'slide_titles' | 'script_points') =>
    (draft[field] !== undefined ? draft[field] : post[field]) as string[];

  const isDirty = Object.keys(draft).length > 0;

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      await onSave(post.id, draft);
      setDraft({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const updateArray = (field: 'slide_titles' | 'script_points', index: number, value: string) => {
    const arr = [...currentArray(field)];
    arr[index] = value;
    setDraft(d => ({ ...d, [field]: arr }));
  };

  return (
    <div className={`rounded-xl border ${cfg.color} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-zinc-300" />
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
          {post.format && (
            <span className="text-xs text-zinc-400">
              {post.format === 'carousel' ? '· Carrusel' : post.format === 'static' ? '· Post Estático' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-6 text-xs px-2 bg-emerald-700 hover:bg-emerald-600"
            >
              {saving ? <Loader2 size={10} className="animate-spin" /> : saved ? <Check size={10} /> : <Save size={10} />}
              <span className="ml-1">{saving ? 'Guardando…' : saved ? 'Guardado' : 'Guardar'}</span>
            </Button>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 space-y-4">
        {/* CAROUSEL / STATIC fields */}
        {post.slot === 'carousel' && (
          <>
            <div>
              <Label className="text-xs text-zinc-400 mb-1 block">Headline de la imagen</Label>
              <Textarea
                rows={2}
                value={current('headline')}
                onChange={e => setDraft(d => ({ ...d, headline: e.target.value }))}
                className="bg-black/30 border-zinc-700 text-sm resize-none"
                placeholder="Texto para la gráfica…"
              />
            </div>
            {post.format === 'carousel' && currentArray('slide_titles').length > 0 && (
              <div>
                <Label className="text-xs text-zinc-400 mb-1 block">Títulos de slides (para Sara)</Label>
                <div className="space-y-1.5">
                  {currentArray('slide_titles').map((title, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs text-zinc-500 mt-2 w-5 shrink-0">{i + 1}.</span>
                      <input
                        value={title}
                        onChange={e => updateArray('slide_titles', i, e.target.value)}
                        className="flex-1 bg-black/30 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* FOTO fields */}
        {post.slot === 'foto' && (
          <div>
            <Label className="text-xs text-zinc-400 mb-1 block">Sugerencia de foto (guía para el equipo)</Label>
            <Textarea
              rows={2}
              value={current('photo_suggestion')}
              onChange={e => setDraft(d => ({ ...d, photo_suggestion: e.target.value }))}
              className="bg-black/30 border-zinc-700 text-sm resize-none"
              placeholder="Ej: Auguy en oficina mirando a cámara, traje azul…"
            />
          </div>
        )}

        {/* REEL fields */}
        {post.slot === 'reel' && (
          <>
            <div>
              <Label className="text-xs text-zinc-400 mb-1 block">Título en pantalla</Label>
              <input
                value={current('video_title')}
                onChange={e => setDraft(d => ({ ...d, video_title: e.target.value }))}
                className="w-full bg-black/30 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
                placeholder="Texto corto para el inicio del video…"
              />
            </div>
            {currentArray('script_points').length > 0 && (
              <div>
                <Label className="text-xs text-zinc-400 mb-1 block">Guión para Gloriana</Label>
                <div className="space-y-1.5">
                  {currentArray('script_points').map((point, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs text-zinc-500 mt-2 w-4 shrink-0">{i + 1}.</span>
                      <Textarea
                        rows={2}
                        value={point}
                        onChange={e => updateArray('script_points', i, e.target.value)}
                        className="flex-1 bg-black/30 border-zinc-700 text-sm resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Caption — shown for all slots */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs text-zinc-400">Caption completo</Label>
            <CopyButton text={current('caption')} />
          </div>
          <Textarea
            rows={8}
            value={current('caption')}
            onChange={e => setDraft(d => ({ ...d, caption: e.target.value }))}
            className="bg-black/30 border-zinc-700 text-sm resize-none font-mono leading-relaxed"
          />
          <p className="text-xs text-zinc-600 mt-1 text-right">
            {current('caption').length} / 2,200 caracteres
          </p>
        </div>
      </div>
    </div>
  );
}

function GridDetail({
  grid,
  onBack,
  onStatusChange,
  onPostSave,
  onDelete,
}: {
  grid: ContentGrid;
  onBack: () => void;
  onStatusChange: (status: string) => Promise<void>;
  onPostSave: (postId: number, data: Partial<GridPost>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const statusCfg = STATUS_CONFIG[grid.status];
  const hasPosts = grid.posts.length > 0;
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleMarkReady = async () => {
    setStatusLoading(true);
    try { await onStatusChange('lista'); } finally { setStatusLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="mt-0.5 text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{grid.tema_display}</h1>
            <p className="text-sm text-zinc-400 mt-0.5">{formatWeekRange(grid.week_start)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusCfg.class}`}>
            {statusCfg.label}
          </span>
          {grid.status === 'borrador' && hasPosts && (
            <Button
              size="sm"
              onClick={handleMarkReady}
              disabled={statusLoading}
              className="bg-emerald-700 hover:bg-emerald-600 text-white"
            >
              {statusLoading
                ? <Loader2 size={14} className="animate-spin mr-1" />
                : <CheckCircle size={14} className="mr-1" />}
              Marcar como Lista
            </Button>
          )}
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
              title="Eliminar grilla"
            >
              <Trash2 size={16} />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-400">¿Eliminar?</span>
              <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300 font-medium">Sí</button>
              <button onClick={() => setDeleteConfirm(false)} className="text-xs text-zinc-400 hover:text-white">No</button>
            </div>
          )}
        </div>
      </div>

      {!hasPosts && (
        <div className="text-center py-16 text-zinc-500">
          <Sparkles size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">La grilla no tiene contenido generado.</p>
        </div>
      )}

      {hasPosts && (
        <Tabs defaultValue="0">
          <TabsList className="bg-zinc-900 border border-zinc-800 h-auto flex-wrap gap-1 p-1">
            {DAYS_SHORT.map((day, i) => {
              const dayPosts = getPostsForDay(grid.posts, i);
              return (
                <TabsTrigger
                  key={i}
                  value={String(i)}
                  className="text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white"
                >
                  {day}
                  {dayPosts.length > 0 && (
                    <span className="ml-1.5 text-zinc-500 text-xs">{dayPosts.length}</span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {DAYS.map((dayName, dayIndex) => {
            const dayPosts = getPostsForDay(grid.posts, dayIndex);
            return (
              <TabsContent key={dayIndex} value={String(dayIndex)} className="mt-4">
                <p className="text-sm font-medium text-zinc-400 mb-3">{dayName}</p>
                {dayPosts.length === 0 ? (
                  <p className="text-xs text-zinc-600 py-8 text-center">Sin posts para este día.</p>
                ) : (
                  <div className="space-y-4">
                    {dayPosts.map(post => (
                      <PostCard key={post.id} post={post} onSave={onPostSave} />
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}

function GrillaCard({
  grilla,
  onClick,
}: {
  grilla: ContentGridList;
  onClick: () => void;
}) {
  const statusCfg = STATUS_CONFIG[grilla.status];
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-all hover:bg-zinc-800/60"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-white text-sm">{grilla.tema_display}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{formatWeekRange(grilla.week_start)}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${statusCfg.class}`}>
          {statusCfg.label}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <span className="text-xs text-zinc-500">
          {grilla.post_count} posts generados
        </span>
        <span className="text-xs text-zinc-700">·</span>
        <span className="text-xs text-zinc-500">
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
    try {
      const data = await grillasApi.list();
      setGrillas(data.results);
    } catch {
      setError('No se pudo cargar la lista de grillas.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const handleCreateAndGenerate = async () => {
    if (!form.week_start || !form.tema) return;
    setGenerating(true);
    setError('');
    try {
      const created = await grillasApi.create({ week_start: form.week_start, tema: form.tema });
      const populated = await grillasApi.generate(created.id);
      setSelectedGrid(populated);
      setView('detail');
      await loadList();
    } catch (e) {
      setError(String(e));
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenGrid = async (id: number) => {
    try {
      const grid = await grillasApi.get(id);
      setSelectedGrid(grid);
      setView('detail');
    } catch {
      setError('No se pudo cargar la grilla.');
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedGrid) return;
    const updated = await grillasApi.update(selectedGrid.id, { status });
    setSelectedGrid(updated);
    await loadList();
  };

  const handlePostSave = async (postId: number, data: Partial<GridPost>) => {
    await grillasApi.updatePost(postId, data);
    if (selectedGrid) {
      const refreshed = await grillasApi.get(selectedGrid.id);
      setSelectedGrid(refreshed);
    }
  };

  const handleDelete = async () => {
    if (!selectedGrid) return;
    await grillasApi.delete(selectedGrid.id);
    setSelectedGrid(null);
    setView('list');
    await loadList();
  };

  const handleBack = () => {
    setSelectedGrid(null);
    setView('list');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (view === 'detail' && selectedGrid) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <GridDetail
          grid={selectedGrid}
          onBack={handleBack}
          onStatusChange={handleStatusChange}
          onPostSave={handlePostSave}
          onDelete={handleDelete}
        />
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="max-w-lg mx-auto p-8">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => setView('list')} className="text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-white">Nueva Grilla</h1>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div>
            <Label className="text-zinc-300 mb-2 block">Semana</Label>
            <Select value={form.week_start} onValueChange={v => setForm(f => ({ ...f, week_start: v }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Selecciona la semana…" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {mondays.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-zinc-200 focus:bg-zinc-800">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-zinc-300 mb-2 block">Tema de la semana</Label>
            <Select value={form.tema} onValueChange={v => setForm(f => ({ ...f, tema: v }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Selecciona el tema…" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {TEMAS.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-zinc-200 focus:bg-zinc-800">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {generating && (
            <div className="bg-blue-950/40 border border-blue-800 rounded-lg px-4 py-4 text-center">
              <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-400" />
              <p className="text-sm text-blue-300 font-medium">Generando 21 posts con IA…</p>
              <p className="text-xs text-blue-500 mt-1">Esto puede tomar 20–40 segundos</p>
            </div>
          )}

          <Button
            onClick={handleCreateAndGenerate}
            disabled={!form.week_start || !form.tema || generating}
            className="w-full bg-[#0C2054] hover:bg-[#0C2054]/80 border border-blue-800 text-white font-medium"
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin mr-2" /> Generando…</>
            ) : (
              <><Sparkles size={16} className="mr-2" /> Generar con IA</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Generador de Grillas</h1>
          <p className="text-sm text-zinc-400 mt-1">Planning semanal de contenido para Instagram y Facebook</p>
        </div>
        <Button
          onClick={() => { setError(''); setView('create'); }}
          className="bg-[#0C2054] hover:bg-[#0C2054]/80 border border-blue-800 text-white"
        >
          <Plus size={16} className="mr-2" />
          Nueva Grilla
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <LayoutGrid size={12} className="text-blue-400" /> Carrusel / Post
        </span>
        <span className="flex items-center gap-1.5">
          <ImageIcon size={12} className="text-purple-400" /> Foto
        </span>
        <span className="flex items-center gap-1.5">
          <Film size={12} className="text-orange-400" /> Reel
        </span>
        <span className="text-zinc-700">·</span>
        <span>3 posts por día · 21 posts por semana</span>
      </div>

      {error && (
        <div className="bg-red-950/50 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loadingList ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-zinc-500" />
        </div>
      ) : grillas.length === 0 ? (
        <div className="text-center py-24 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
          <Sparkles size={36} className="mx-auto mb-4 opacity-30" />
          <p className="text-base font-medium text-zinc-400">No hay grillas creadas</p>
          <p className="text-sm mt-1">Crea la primera grilla con el botón de arriba</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {grillas.map(g => (
            <GrillaCard
              key={g.id}
              grilla={g}
              onClick={() => handleOpenGrid(g.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
