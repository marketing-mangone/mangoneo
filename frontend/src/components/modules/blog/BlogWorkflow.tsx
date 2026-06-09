'use client';

import { useState, useEffect, useCallback } from 'react';
import { blogApi, type BlogPost, type BlogStage, type BlogPostInput } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Plus, Loader2, X, ChevronRight, ChevronLeft, Edit2, Trash2,
  Globe, Lightbulb, PenLine, Search, CheckCircle2, Rocket,
  Calendar, Tag, User2, Target, AlignLeft, Link2, FileText,
  AlertCircle, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// ── Config ───────────────────────────────────────────────────────────────────

const STAGES: { key: BlogStage; label: string; icon: React.ElementType; color: string; dot: string }[] = [
  { key: 'idea',      label: 'Idea',       icon: Lightbulb,    color: 'text-violet-700',  dot: 'bg-violet-400' },
  { key: 'redaccion', label: 'Redacción',  icon: PenLine,      color: 'text-blue-700',    dot: 'bg-blue-400' },
  { key: 'revision',  label: 'Revisión',   icon: Search,       color: 'text-amber-700',   dot: 'bg-amber-400' },
  { key: 'aprobado',  label: 'Aprobado',   icon: CheckCircle2, color: 'text-emerald-700', dot: 'bg-emerald-500' },
  { key: 'publicado', label: 'Publicado',  icon: Rocket,       color: 'text-[#0C2054]',   dot: 'bg-[#F79C31]' },
];

const STAGE_BG: Record<BlogStage, string> = {
  idea:      'bg-violet-50 border-violet-100',
  redaccion: 'bg-blue-50 border-blue-100',
  revision:  'bg-amber-50 border-amber-100',
  aprobado:  'bg-emerald-50 border-emerald-100',
  publicado: 'bg-[var(--s-fef5e7)] border-[#F79C31]/20',
};

const PRIORITY_CONFIG: Record<string, { label: string; cls: string }> = {
  alta:  { label: 'Alta',   cls: 'bg-red-50 text-red-700 border-red-100' },
  media: { label: 'Media',  cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  baja:  { label: 'Baja',   cls: 'bg-slate-50 text-slate-600 border-slate-200' },
};

const PRACTICE_AREAS = [
  { value: 'vawa',               label: 'VAWA' },
  { value: 'visa_u',             label: 'Visa U' },
  { value: 'visa_t',             label: 'Visa T' },
  { value: 'sijs',               label: 'SIJS' },
  { value: 'ajuste_estatus',     label: 'Ajuste de Estatus' },
  { value: 'reunion_familiar',   label: 'Reunificación Familiar' },
  { value: 'defensa_deportacion',label: 'Defensa de Deportación' },
  { value: 'naturalizacion',     label: 'Naturalización' },
  { value: 'proceso_consular',   label: 'Proceso Consular' },
  { value: 'general',            label: 'General / Inmigración' },
];

const inputCls =
  'w-full px-3 py-2.5 text-sm border border-[var(--s-e8e8f0)] bg-[var(--s-f7f8fc)] rounded-lg outline-none ' +
  'text-[var(--t-1a1a2e)] focus:border-[var(--s-f79c31)] focus:bg-[var(--surface)] transition-all ' +
  'placeholder-[var(--t-8888a8)] disabled:opacity-60';
const labelCls = 'block text-xs font-semibold text-[var(--t-6b7280)] uppercase tracking-wide mb-1.5';

function fmtDate(d?: string | null) {
  if (!d) return null;
  return new Date(d + 'T12:00:00').toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── PostCard ──────────────────────────────────────────────────────────────────

function PostCard({ post, onSelect }: { post: BlogPost; onSelect: () => void }) {
  const stage = STAGES.find(s => s.key === post.stage)!;
  const prio  = PRIORITY_CONFIG[post.priority];
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md',
        STAGE_BG[post.stage]
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[13px] font-bold text-[var(--t-1a1a2e)] leading-snug line-clamp-2">{post.title}</p>
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0', prio.cls)}>
          {prio.label}
        </span>
      </div>

      {post.keyword && (
        <p className="text-[11px] text-[var(--t-6b7280)] flex items-center gap-1 mb-2">
          <Tag className="w-3 h-3" /> {post.keyword}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {post.practice_area_display && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--s-0c2054)]/10 text-[var(--t-0c2054)]">
            {post.practice_area_display}
          </span>
        )}
        {post.assigned_to_name && (
          <span className="text-[10px] text-[var(--t-8888a8)] flex items-center gap-1">
            <User2 className="w-3 h-3" /> {post.assigned_to_name}
          </span>
        )}
        {post.due_date && (
          <span className="text-[10px] text-[var(--t-8888a8)] flex items-center gap-1 ml-auto">
            <Calendar className="w-3 h-3" /> {fmtDate(post.due_date)}
          </span>
        )}
      </div>

      {post.webflow_url && (
        <div className="flex items-center gap-1 mt-2">
          <Globe className="w-3 h-3 text-emerald-500" />
          <span className="text-[10px] text-emerald-600 font-medium truncate">{post.webflow_url}</span>
        </div>
      )}
    </button>
  );
}

// ── PostModal (detail + edit) ─────────────────────────────────────────────────

const EMPTY: BlogPostInput = {
  title: '', keyword: '', practice_area: 'general', priority: 'media',
  word_count_target: 800, brief: '', notes: '', webflow_url: '', due_date: null,
  assigned_to: null, reviewed_by: null,
};

function PostModal({
  post, mode, onClose, onSaved, onDeleted,
}: {
  post: BlogPost | null;
  mode: 'create' | 'edit' | 'view';
  onClose: () => void;
  onSaved: (p: BlogPost) => void;
  onDeleted?: (id: number) => void;
}) {
  const [editing, setEditing] = useState(mode !== 'view');
  const [form, setForm]       = useState<BlogPostInput>(post ? {
    title: post.title, keyword: post.keyword, practice_area: post.practice_area,
    priority: post.priority, word_count_target: post.word_count_target,
    brief: post.brief, notes: post.notes, webflow_url: post.webflow_url,
    due_date: post.due_date, assigned_to: post.assigned_to, reviewed_by: post.reviewed_by,
  } : EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [backing,   setBacking]   = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [error,     setError]     = useState('');

  function set<K extends keyof BlogPostInput>(k: K, v: BlogPostInput[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  const currentStage = STAGES.find(s => s.key === post?.stage);
  const stageIdx     = post ? STAGES.findIndex(s => s.key === post.stage) : -1;
  const isLast       = stageIdx === STAGES.length - 1;
  const isFirst      = stageIdx === 0;

  async function save() {
    if (!form.title?.trim()) { setError('El título es obligatorio.'); return; }
    setSaving(true); setError('');
    try {
      const saved = post
        ? await blogApi.update(post.id, form)
        : await blogApi.create(form);
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function advance() {
    if (!post) return;
    setAdvancing(true); setError('');
    try { onSaved(await blogApi.advance(post.id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error.'); }
    finally { setAdvancing(false); }
  }

  async function back() {
    if (!post) return;
    setBacking(true); setError('');
    try { onSaved(await blogApi.back(post.id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error.'); }
    finally { setBacking(false); }
  }

  async function remove() {
    if (!post || !confirm(`¿Eliminar "${post.title}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try { await blogApi.remove(post.id); onDeleted?.(post.id); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error al eliminar.'); setDeleting(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(12,32,84,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        style={{ boxShadow: '0 32px 80px rgba(12,32,84,0.22)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--s-e8e8f0)] sticky top-0 bg-[var(--surface)] z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--s-0c2054)] flex items-center justify-center">
              <FileText className="w-4 h-4 text-[var(--t-f79c31)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--t-1a1a2e)]">
                {mode === 'create' ? 'Nuevo post' : editing ? 'Editar post' : post?.title}
              </h2>
              {post && currentStage && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn('w-1.5 h-1.5 rounded-full', currentStage.dot)} />
                  <span className={cn('text-[11px] font-semibold', currentStage.color)}>{currentStage.label}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {post && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg text-[var(--t-8888a8)] hover:text-[var(--t-374151)] hover:bg-[var(--s-f0f2f8)] transition-all"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {post && (
              <button
                onClick={remove}
                disabled={deleting}
                className="p-1.5 rounded-lg text-[var(--t-8888a8)] hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--t-8888a8)] hover:text-[var(--t-374151)] transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-medium border border-red-100">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Stage progress (view mode) */}
          {post && !editing && (
            <div className="bg-[var(--s-f7f8fc)] rounded-2xl border border-[var(--s-e8e8f0)] p-4">
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {STAGES.map((s, i) => {
                  const done   = i < stageIdx;
                  const active = i === stageIdx;
                  return (
                    <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
                      <div className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                        active ? 'bg-[var(--s-0c2054)] text-white shadow-sm' :
                        done   ? 'bg-emerald-50 text-emerald-700' :
                                 'text-[var(--t-9ca3af)]'
                      )}>
                        <s.icon className="w-3 h-3" />
                        {s.label}
                        {done && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      {i < STAGES.length - 1 && (
                        <ArrowRight className={cn('w-3 h-3 flex-shrink-0', done ? 'text-emerald-400' : 'text-[var(--t-d1d5db)]')} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {editing ? (
            /* ── EDIT FORM ── */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelCls}>Título *</label>
                  <input className={inputCls} value={form.title ?? ''} onChange={e => set('title', e.target.value)} placeholder="Ej: Qué es la Visa U y quién puede solicitarla" />
                </div>
                <div>
                  <label className={labelCls}>Keyword SEO</label>
                  <input className={inputCls} value={form.keyword ?? ''} onChange={e => set('keyword', e.target.value)} placeholder="Ej: visa u inmigrantes víctimas" />
                </div>
                <div>
                  <label className={labelCls}>Área de práctica</label>
                  <select className={inputCls} value={form.practice_area ?? 'general'} onChange={e => set('practice_area', e.target.value)}>
                    {PRACTICE_AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Prioridad</label>
                  <select className={inputCls} value={form.priority ?? 'media'} onChange={e => set('priority', e.target.value as BlogPostInput['priority'])}>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Palabras objetivo</label>
                  <input type="number" className={inputCls} value={form.word_count_target ?? 800} min={100} step={100}
                    onChange={e => set('word_count_target', parseInt(e.target.value) || 800)} />
                </div>
                <div>
                  <label className={labelCls}>Fecha límite</label>
                  <input type="date" className={inputCls} value={form.due_date ?? ''} onChange={e => set('due_date', e.target.value || null)} />
                </div>
                <div>
                  <label className={labelCls}>URL en Webflow</label>
                  <input className={inputCls} value={form.webflow_url ?? ''} onChange={e => set('webflow_url', e.target.value)} placeholder="https://mangonelaw.com/blog/..." />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Brief / ángulo del artículo</label>
                  <textarea className={cn(inputCls, 'min-h-[80px] resize-y')} value={form.brief ?? ''} onChange={e => set('brief', e.target.value)}
                    placeholder="Puntos clave a cubrir, enfoque, audiencia objetivo..." />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Notas internas</label>
                  <textarea className={cn(inputCls, 'min-h-[60px] resize-y')} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)}
                    placeholder="Observaciones del equipo, referencias, contexto..." />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button variant="primary" size="md" onClick={save} loading={saving}>
                  {mode === 'create' ? 'Crear post' : 'Guardar cambios'}
                </Button>
                {mode !== 'create' && (
                  <Button variant="ghost" size="md" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
                )}
              </div>
            </>
          ) : (
            /* ── VIEW MODE ── */
            post && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <ReadRow icon={<Tag className="w-4 h-4" />} label="Keyword" value={post.keyword} />
                  <ReadRow icon={<Target className="w-4 h-4" />} label="Área de práctica" value={post.practice_area_display} />
                  <ReadRow icon={<User2 className="w-4 h-4" />} label="Redactor" value={post.assigned_to_name} />
                  <ReadRow icon={<User2 className="w-4 h-4" />} label="Revisor" value={post.reviewed_by_name} />
                  <ReadRow icon={<Calendar className="w-4 h-4" />} label="Fecha límite" value={fmtDate(post.due_date)} />
                  <ReadRow icon={<FileText className="w-4 h-4" />} label="Palabras objetivo" value={post.word_count_target ? `${post.word_count_target} palabras` : null} />
                </div>
                {post.brief && (
                  <div>
                    <p className={labelCls + ' flex items-center gap-1'}><AlignLeft className="w-3 h-3" /> Brief</p>
                    <p className="text-sm text-[var(--t-374151)] leading-relaxed whitespace-pre-wrap bg-[var(--s-f7f8fc)] border border-[var(--s-e8e8f0)] rounded-xl p-3">{post.brief}</p>
                  </div>
                )}
                {post.notes && (
                  <div>
                    <p className={labelCls}>Notas internas</p>
                    <p className="text-sm text-[var(--t-374151)] leading-relaxed whitespace-pre-wrap">{post.notes}</p>
                  </div>
                )}
                {post.webflow_url && (
                  <div>
                    <p className={labelCls + ' flex items-center gap-1'}><Link2 className="w-3 h-3" /> URL publicado</p>
                    <a href={post.webflow_url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1 break-all">
                      <Globe className="w-3.5 h-3.5 flex-shrink-0" /> {post.webflow_url}
                    </a>
                  </div>
                )}

                {/* Stage actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-[var(--s-e8e8f0)]">
                  {!isFirst && (
                    <button onClick={back} disabled={backing}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-[var(--s-e8e8f0)] text-[var(--t-6b7280)] hover:bg-[var(--s-f0f2f8)] transition-all disabled:opacity-50">
                      {backing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                      Retroceder
                    </button>
                  )}
                  {!isLast && (
                    <button onClick={advance} disabled={advancing}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-[var(--s-0c2054)] text-white hover:bg-[var(--s-0f2960)] transition-all shadow-sm disabled:opacity-50 ml-auto">
                      {advancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      Pasar a "{STAGES[stageIdx + 1]?.label}"
                    </button>
                  )}
                  {isLast && (
                    <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl">
                      <Rocket className="w-3.5 h-3.5" /> Publicado
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function ReadRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-[var(--t-8888a8)] uppercase tracking-wide flex items-center gap-1 mb-1">
        {icon} {label}
      </p>
      <p className="text-sm font-medium text-[var(--t-1a1a2e)]">{value || <span className="text-[var(--t-8888a8)] font-normal">—</span>}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BlogWorkflow() {
  const [posts,   setPosts]   = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<{ post: BlogPost | null; mode: 'create' | 'edit' | 'view' } | null>(null);
  const [filter,  setFilter]  = useState<BlogStage | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await blogApi.list();
      setPosts(data.results ?? (data as unknown as BlogPost[]));
    } catch {
      // error silencioso — sin backend en dev muestra kanban vacío
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(p: BlogPost) {
    setPosts(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      return idx >= 0 ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev];
    });
    setModal(null);
  }

  function handleDeleted(id: number) {
    setPosts(prev => prev.filter(p => p.id !== id));
    setModal(null);
  }

  const byStage = (stage: BlogStage) => posts.filter(p => p.stage === stage);

  const visible = filter === 'all'
    ? posts
    : posts.filter(p => p.stage === filter);

  // Stats
  const stats = STAGES.map(s => ({ ...s, count: byStage(s.key).length }));

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 p-1 bg-[var(--surface)] rounded-xl border border-[var(--s-e5e7eb)] shadow-sm">
          <button
            onClick={() => setFilter('all')}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              filter === 'all' ? 'bg-[var(--s-0c2054)] text-white shadow-sm' : 'text-[var(--t-6b7280)] hover:text-[var(--t-374151)]'
            )}
          >
            Todos ({posts.length})
          </button>
          {STAGES.map(s => (
            <button key={s.key} onClick={() => setFilter(s.key)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                filter === s.key ? 'bg-[var(--s-0c2054)] text-white shadow-sm' : 'text-[var(--t-6b7280)] hover:text-[var(--t-374151)]'
              )}
            >
              {s.label} ({byStage(s.key).length})
            </button>
          ))}
        </div>
        <Button variant="primary" size="md" onClick={() => setModal({ post: null, mode: 'create' })}>
          <Plus className="w-4 h-4" /> Nuevo post
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3">
        {stats.map(s => (
          <div key={s.key} className={cn('rounded-2xl border p-4 text-center', STAGE_BG[s.key])}>
            <s.icon className={cn('w-4 h-4 mx-auto mb-1', s.color)} />
            <p className={cn('text-2xl font-bold', s.color)}>{s.count}</p>
            <p className={cn('text-[10px] font-semibold', s.color)}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--t-8888a8)]">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : filter === 'all' ? (
        /* Board view */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {STAGES.map(s => {
            const stagePosts = byStage(s.key);
            return (
              <div key={s.key} className="space-y-2">
                {/* Column header */}
                <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border', STAGE_BG[s.key])}>
                  <s.icon className={cn('w-3.5 h-3.5', s.color)} />
                  <span className={cn('text-xs font-bold', s.color)}>{s.label}</span>
                  <span className={cn('ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full', s.color,
                    'bg-white/60'
                  )}>{stagePosts.length}</span>
                </div>
                {stagePosts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--s-e5e7eb)] p-4 text-center">
                    <p className="text-[11px] text-[var(--t-9ca3af)]">Sin posts</p>
                  </div>
                ) : (
                  stagePosts.map(p => (
                    <PostCard key={p.id} post={p} onSelect={() => setModal({ post: p, mode: 'view' })} />
                  ))
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List view when filtered */
        visible.length === 0 ? (
          <div className="text-center py-16 bg-[var(--surface)] rounded-2xl border border-[var(--s-e5e7eb)]">
            <FileText className="w-10 h-10 text-[var(--t-9ca3af)] mx-auto mb-3" />
            <p className="text-sm font-semibold text-[var(--t-374151)]">Sin posts en esta etapa</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map(p => (
              <PostCard key={p.id} post={p} onSelect={() => setModal({ post: p, mode: 'view' })} />
            ))}
          </div>
        )
      )}

      {/* Empty state (no posts at all) */}
      {!loading && posts.length === 0 && (
        <div className="text-center py-16 bg-[var(--surface)] rounded-2xl border border-[var(--s-e5e7eb)]">
          <div className="w-14 h-14 rounded-2xl bg-[var(--s-f0f2f8)] flex items-center justify-center mx-auto mb-4">
            <PenLine className="w-6 h-6 text-[var(--t-9ca3af)]" />
          </div>
          <p className="text-sm font-bold text-[var(--t-374151)] mb-1">Aún no hay posts de blog</p>
          <p className="text-xs text-[var(--t-9ca3af)] mb-4 max-w-xs mx-auto">
            Crea tu primer post y llévalo por el workflow hasta publicarlo en Webflow.
          </p>
          <Button variant="primary" size="md" onClick={() => setModal({ post: null, mode: 'create' })}>
            <Plus className="w-4 h-4" /> Crear primer post
          </Button>
        </div>
      )}

      {modal && (
        <PostModal
          post={modal.post}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
