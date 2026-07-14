'use client';
import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import {
  Plus, Search, Clock, CheckCircle2, Circle, AlertCircle, Ban,
  Calendar, MoreVertical, X, Loader2, Trash2, Pencil, CheckSquare,
  GanttChart, ChevronLeft, ChevronRight, Send, Copy, Check,
} from 'lucide-react';
import { tasksApi, teamApi, auth, ApiTask, ApiTeamMember } from '@/lib/api';
import { formatDate } from '@/lib/utils';

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:     { label: 'Pendiente',   icon: Circle,       color: 'text-amber-500',  bg: 'bg-amber-50',   border: 'border-amber-200',  bar: 'bg-amber-400'  },
  in_progress: { label: 'En progreso', icon: Clock,        color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200',   bar: 'bg-blue-500'   },
  review:      { label: 'En revisión', icon: AlertCircle,  color: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-200', bar: 'bg-purple-500' },
  done:        { label: 'Completada',  icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200',  bar: 'bg-green-500'  },
  blocked:     { label: 'Bloqueada',   icon: Ban,          color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-200',    bar: 'bg-red-500'    },
} as const;

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgente', text: 'text-red-700 bg-red-50' },
  high:   { label: 'Alta',    text: 'text-orange-700 bg-orange-50' },
  medium: { label: 'Media',   text: 'text-blue-700 bg-blue-50' },
  low:    { label: 'Baja',    text: 'text-gray-600 bg-gray-50' },
} as const;

const AVATAR_COLORS: Record<string, string> = {
  'Sebastian Quijada': '#0C2054',
  'Alejandra Andrade': '#7c3aed',
  'Andrés Coronel':    '#0984e3',
  'Gloriana López':    '#00b894',
  'Sara Castaño':      '#e17055',
};

function getInitials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
}

function isOverdue(dueDate: string | null, status: ApiTask['status']) {
  return status !== 'done' && !!dueDate && new Date(dueDate) < new Date();
}

// ── Roadmap helpers ───────────────────────────────────────────────────────────

const DAY_PX   = 22;   // px por día — 1 semana = 154px, scrolleable libremente
const LABEL_PX = 208;  // ancho columna de nombres (sticky)

function getMonday(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function parseLocalDate(s: string): Date {
  const d = new Date(s + 'T00:00:00');
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Task Modal (create / edit) ────────────────────────────────────────────────

function TaskModal({
  task,
  onClose,
  onSaved,
}: {
  task: ApiTask | null;
  onClose: () => void;
  onSaved: (t: ApiTask) => void;
}) {
  const isEdit = !!task;

  const [title,        setTitle]        = useState(task?.title ?? '');
  const [description,  setDescription]  = useState(task?.description ?? '');
  const [status,       setStatus]       = useState<ApiTask['status']>(task?.status ?? 'pending');
  const [priority,     setPriority]     = useState<ApiTask['priority']>(task?.priority ?? 'medium');
  const [startDate,    setStartDate]    = useState(task?.start_date ?? '');
  const [dueDate,      setDueDate]      = useState(task?.due_date ?? '');
  const [project,      setProject]      = useState(task?.project ?? '');
  const [progress,     setProgress]     = useState(task?.progress ?? 0);
  const [tagsInput,    setTagsInput]    = useState((task?.tags ?? []).join(', '));
  const [assignee,     setAssignee]     = useState<number | null>(task?.assignee ?? null);
  const [teamMembers,  setTeamMembers]  = useState<ApiTeamMember[]>([]);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    teamApi.list().then(data => setTeamMembers(data.results)).catch(() => {});
  }, []);

  const submit = async () => {
    if (!title.trim()) { setError('El título es obligatorio.'); return; }
    setSaving(true);
    setError('');
    const payload = {
      title:       title.trim(),
      description: description.trim(),
      status,
      priority,
      start_date:  startDate || null,
      due_date:    dueDate || null,
      project:     project.trim(),
      progress,
      tags:        tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      assignee:    assignee,
    };
    try {
      const saved = isEdit
        ? await tasksApi.update(task!.id, payload)
        : await tasksApi.create(payload);
      onSaved(saved);
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Error al guardar la tarea.');
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2.5 text-sm border border-[var(--s-e8e8f0)] rounded-lg outline-none focus:border-[var(--s-f79c31)] transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--s-f0f0f0)] sticky top-0 bg-[var(--surface)] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F79C31]/10 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-[var(--t-f79c31)]" />
            </div>
            <h3 className="font-bold text-[var(--t-1a1a2e)]">{isEdit ? 'Editar tarea' : 'Nueva tarea'}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--s-f7f8fc)] text-[var(--t-8888a8)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nombre de la tarea"
              className={inputCls}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">
              Descripción <span className="text-[var(--t-8888a8)] font-normal">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalle de la tarea..."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Estado</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(STATUS_CONFIG) as [ApiTask['status'], typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setStatus(key)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    status === key
                      ? `${cfg.bg} ${cfg.color} border-current`
                      : 'bg-[var(--surface)] text-[var(--t-4a4a6a)] border-[var(--s-e8e8f0)] hover:bg-[var(--s-f7f8fc)]'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Prioridad</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(PRIORITY_CONFIG) as [ApiTask['priority'], typeof PRIORITY_CONFIG[keyof typeof PRIORITY_CONFIG]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setPriority(key)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    priority === key
                      ? `${cfg.text} border-current`
                      : 'bg-[var(--surface)] text-[var(--t-4a4a6a)] border-[var(--s-e8e8f0)] hover:bg-[var(--s-f7f8fc)]'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fechas */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">Fechas</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[var(--t-8888a8)] mb-1">Fecha de inicio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] text-[var(--t-8888a8)] mb-1">Fecha límite</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Proyecto */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">
              Proyecto <span className="text-[var(--t-8888a8)] font-normal">(opcional)</span>
            </label>
            <input
              value={project}
              onChange={e => setProject(e.target.value)}
              placeholder="Ej: Blog Q2"
              className={inputCls}
            />
          </div>

          {/* Progreso */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">
              <label>Progreso</label>
              <span className="text-[var(--t-f79c31)]">{progress}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={e => setProgress(Number(e.target.value))}
              className="w-full accent-[#F79C31]"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">
              Etiquetas <span className="text-[var(--t-8888a8)] font-normal">(separadas por coma)</span>
            </label>
            <input
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="diseño, redes, VAWA"
              className={inputCls}
            />
          </div>

          {/* Responsable */}
          <div>
            <label className="block text-xs font-semibold text-[var(--t-4a4a6a)] mb-1.5">
              Responsable <span className="text-[var(--t-8888a8)] font-normal">(opcional)</span>
            </label>
            <select
              value={assignee ?? ''}
              onChange={e => setAssignee(e.target.value ? Number(e.target.value) : null)}
              className={`${inputCls} text-[var(--t-1a1a2e)] bg-[var(--surface)]`}
            >
              <option value="">— Sin asignar —</option>
              {teamMembers
                .filter(m => m.status === 'active')
                .map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.name} {m.position ? `· ${m.position}` : ''}
                  </option>
                ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold border border-[var(--s-e8e8f0)] rounded-lg text-[var(--t-4a4a6a)] hover:bg-[var(--s-f7f8fc)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold bg-[var(--s-f79c31)] text-white rounded-lg hover:bg-[var(--s-e08a20)] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Guardar cambios' : 'Crear tarea'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onStatusToggle,
  onEdit,
  onDelete,
}: {
  task: ApiTask;
  onStatusToggle: (id: number) => void;
  onEdit: (task: ApiTask) => void;
  onDelete: (id: number) => void;
}) {
  const [menuOpen,       setMenuOpen]       = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);

  const st      = STATUS_CONFIG[task.status];
  const pr      = PRIORITY_CONFIG[task.priority];
  const StatusIcon = st.icon;
  const overdue = isOverdue(task.due_date, task.status);
  const avatarBg = AVATAR_COLORS[task.assignee_name ?? ''] ?? '#8888a8';

  const handleDelete = () => {
    if (confirmDelete) { onDelete(task.id); }
    else { setConfirmDelete(true); }
  };

  return (
    <Card className={`p-4 hover:shadow-md transition-all ${overdue ? 'border-red-200' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onStatusToggle(task.id)}
          className={`mt-0.5 flex-shrink-0 ${st.color} hover:opacity-70 transition-opacity`}
        >
          <StatusIcon className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={`text-sm font-semibold leading-tight ${task.status === 'done' ? 'line-through text-[var(--t-8888a8)]' : 'text-[var(--t-1a1a2e)]'}`}>
              {task.title}
            </p>

            <div className="relative flex-shrink-0">
              <button
                onClick={() => { setMenuOpen(v => !v); setConfirmDelete(false); }}
                className="text-[var(--t-8888a8)] hover:text-[var(--t-4a4a6a)] p-0.5"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => { setMenuOpen(false); setConfirmDelete(false); }} />
                  <div className="absolute right-0 top-6 z-20 bg-[var(--surface)] border border-[var(--s-e8e8f0)] rounded-xl shadow-lg py-1 w-36 overflow-hidden">
                    <button
                      onClick={() => { onEdit(task); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--t-4a4a6a)] hover:bg-[var(--s-f7f8fc)] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={handleDelete}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                        confirmDelete
                          ? 'text-white bg-red-500 hover:bg-red-600'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {confirmDelete ? '¿Confirmar?' : 'Eliminar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-[var(--t-8888a8)] line-clamp-2 mb-2">{task.description}</p>
          )}

          {task.progress > 0 && task.status !== 'done' && (
            <div className="mb-2">
              <div className="flex justify-between text-[10px] text-[var(--t-8888a8)] mb-1">
                <span>Progreso</span>
                <span>{task.progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[var(--s-f0f0f0)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${task.progress}%`, background: task.progress >= 80 ? '#00b894' : '#F79C31' }}
                />
              </div>
            </div>
          )}

          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--s-f7f8fc)] text-[var(--t-8888a8)]">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                style={{ background: avatarBg }}
              >
                {getInitials(task.assignee_name)}
              </div>
              <span className="text-xs text-[var(--t-8888a8)] truncate max-w-[100px]">
                {task.assignee_name ? task.assignee_name.split(' ')[0] : '—'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pr.text}`}>
                {pr.label}
              </span>
              {task.due_date && (
                <span className={`flex items-center gap-0.5 text-[10px] font-medium ${overdue ? 'text-red-600' : 'text-[var(--t-8888a8)]'}`}>
                  <Calendar className="w-3 h-3" />
                  {overdue ? '¡Vencida!' : formatDate(task.due_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Columna Kanban ────────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  tasks,
  onStatusToggle,
  onEdit,
  onDelete,
  onTaskDragStart,
  onTaskDragEnd,
  onDropOnColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  isDragOver,
  draggingId,
}: {
  status: ApiTask['status'];
  tasks: ApiTask[];
  onStatusToggle: (id: number) => void;
  onEdit: (task: ApiTask) => void;
  onDelete: (id: number) => void;
  onTaskDragStart: (id: number) => void;
  onTaskDragEnd: () => void;
  onDropOnColumn: (status: ApiTask['status']) => void;
  onDragOverColumn: (status: ApiTask['status']) => void;
  onDragLeaveColumn: (status: ApiTask['status']) => void;
  isDragOver: boolean;
  draggingId: number | null;
}) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <div
      className="flex flex-col min-w-[280px]"
      onDragOver={e => { e.preventDefault(); onDragOverColumn(status); }}
      onDragLeave={() => onDragLeaveColumn(status)}
      onDrop={() => onDropOnColumn(status)}
    >
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg mb-3 border ${config.bg} ${config.border}`}>
        <StatusIcon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-sm font-bold ${config.color}`}>{config.label}</span>
        <span className="ml-auto text-xs font-bold bg-[var(--surface)] rounded-full w-5 h-5 flex items-center justify-center text-[var(--t-4a4a6a)] shadow-sm">
          {tasks.length}
        </span>
      </div>
      <div className={`space-y-3 flex-1 rounded-xl transition-colors min-h-[80px] ${
        isDragOver ? 'bg-[#F79C31]/8 outline-2 outline-dashed outline-[#F79C31]/40' : ''
      }`}>
        {tasks.map(task => (
          <div
            key={task.id}
            draggable
            onDragStart={() => onTaskDragStart(task.id)}
            onDragEnd={onTaskDragEnd}
            className={`cursor-grab active:cursor-grabbing ${draggingId === task.id ? 'opacity-40' : ''}`}
          >
            <TaskCard task={task} onStatusToggle={onStatusToggle} onEdit={onEdit} onDelete={onDelete} />
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="border-2 border-dashed border-[var(--s-e8e8f0)] rounded-xl p-6 text-center">
            <p className="text-sm text-[var(--t-8888a8)]">Sin tareas</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Roadmap View ──────────────────────────────────────────────────────────────

function RoadmapView({ tasks, onEdit }: { tasks: ApiTask[]; onEdit: (t: ApiTask) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Date range: año actual + año siguiente (≈730 días × 22px = ~16 060px de timeline)
  const today      = new Date(); today.setHours(0, 0, 0, 0);
  const rangeStart = new Date(today.getFullYear(), 0, 1);
  const rangeEnd   = new Date(today.getFullYear() + 2, 0, 1);   // exclusivo
  const totalDays  = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000);
  const timelinePx = totalDays * DAY_PX;

  // Offset en px donde cae "hoy"
  const todayPx = Math.round((today.getTime() - rangeStart.getTime()) / 86400000) * DAY_PX;

  // Al montar, scrollear para que "hoy" quede cerca del inicio visible
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, todayPx - 160);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToToday = () => {
    scrollRef.current?.scrollTo({ left: Math.max(0, todayPx - 160), behavior: 'smooth' });
  };

  // Cabeceras de año
  const years: { year: number; startPx: number; widthPx: number }[] = [];
  for (let y = rangeStart.getFullYear(); y < rangeEnd.getFullYear(); y++) {
    const ys = new Date(y, 0, 1);
    const ye = new Date(y + 1, 0, 1);
    const s  = Math.max(0, (ys.getTime() - rangeStart.getTime()) / 86400000) * DAY_PX;
    const e  = Math.min(timelinePx, (ye.getTime() - rangeStart.getTime()) / 86400000 * DAY_PX);
    if (e > s) years.push({ year: y, startPx: s, widthPx: e - s });
  }

  // Cabeceras de mes + posiciones de líneas de cuadrícula
  type MonthItem = { label: string; startPx: number; widthPx: number };
  const months: MonthItem[] = [];
  {
    let cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cur < rangeEnd) {
      const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      const s = (cur.getTime() - rangeStart.getTime()) / 86400000 * DAY_PX;
      const e = Math.min(timelinePx, (next.getTime() - rangeStart.getTime()) / 86400000 * DAY_PX);
      months.push({
        label:   cur.toLocaleDateString('es-ES', { month: 'short' }),
        startPx: Math.max(0, s),
        widthPx: e - Math.max(0, s),
      });
      cur = next;
    }
  }
  const monthBoundaries = months.map(m => m.startPx);

  // Posición y ancho de una barra (en px absolutos dentro del timeline)
  function getBarPx(task: ApiTask): { leftPx: number; widthPx: number; hasSoft: boolean } | null {
    const end     = task.due_date   ? parseLocalDate(task.due_date)   : null;
    const hasSoft = !task.start_date && !!end;
    const start   = task.start_date ? parseLocalDate(task.start_date) : (end ? addDays(end, -2) : null);
    if (!start || !end) return null;

    const s = (start.getTime() - rangeStart.getTime()) / 86400000;
    const e = (end.getTime()   - rangeStart.getTime()) / 86400000 + 1;
    if (e < 0 || s > totalDays) return null;

    const leftPx  = Math.max(0, s * DAY_PX);
    const rightPx = Math.min(timelinePx, e * DAY_PX);
    return { leftPx, widthPx: Math.max(rightPx - leftPx, DAY_PX), hasSoft };
  }

  // Agrupar tareas
  const withDates    = tasks.filter(t => t.due_date || t.start_date);
  const withoutDates = tasks.filter(t => !t.due_date && !t.start_date);
  const projectMap   = new Map<string, ApiTask[]>();
  for (const task of withDates) {
    const key = task.project || 'Sin proyecto';
    if (!projectMap.has(key)) projectMap.set(key, []);
    projectMap.get(key)!.push(task);
  }
  const groups = Array.from(projectMap.entries()).map(([name, grpTasks]) => ({ name, tasks: grpTasks }));

  // ── Render ────────────────────────────────────────────────────────────────

  // Helper: lane de timeline (grid lines + today line) — reutilizado en cada fila
  const TodayLine = () => (
    <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10" style={{ left: todayPx }} />
  );
  const GridLines = () => (
    <>
      {monthBoundaries.map((px, i) => (
        <div key={i} className="absolute top-0 bottom-0 w-px bg-[var(--s-f0f0f0)]" style={{ left: px }} />
      ))}
    </>
  );

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8e8f0)] overflow-hidden">

      {/* Barra superior: rango visible + botón Hoy */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--s-f0f0f0)] bg-[var(--s-fafafe)]">
        <span className="text-xs text-[var(--t-8888a8)] font-medium">
          {rangeStart.getFullYear()} – {rangeEnd.getFullYear() - 1}
          <span className="ml-2 text-[var(--t-c0c0d0)]">· Arrastra para navegar</span>
        </span>
        <button
          onClick={scrollToToday}
          className="text-xs font-semibold text-[var(--t-f79c31)] px-3 py-1.5 rounded-lg border border-[#F79C31]/40 hover:bg-[#F79C31]/5 transition-colors"
        >
          Hoy
        </button>
      </div>

      {/* Canvas scrollable */}
      <div ref={scrollRef} className="overflow-x-auto overflow-y-visible">
        <div style={{ width: `${LABEL_PX + timelinePx}px` }}>

          {/* Fila año */}
          <div className="flex border-b border-[var(--s-dde0ea)] bg-[var(--s-eef0f7)]" style={{ height: 28 }}>
            <div className="flex-shrink-0 border-r border-[var(--s-dde0ea)]" style={{ width: LABEL_PX }} />
            <div className="relative flex-shrink-0" style={{ width: timelinePx }}>
              {years.map(y => (
                <div
                  key={y.year}
                  className="absolute top-0 bottom-0 border-l border-[var(--s-cdd0de)] flex items-center justify-center"
                  style={{ left: y.startPx, width: y.widthPx }}
                >
                  <span className="text-[11px] font-bold text-[var(--t-4a4a6a)] tracking-wide">{y.year}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fila mes */}
          <div className="flex border-b border-[var(--s-e8e8f0)] bg-[var(--s-fafafe)]" style={{ height: 30 }}>
            <div
              className="flex-shrink-0 border-r border-[var(--s-e8e8f0)] px-4 flex items-center"
              style={{ width: LABEL_PX }}
            >
              <span className="text-[10px] font-bold text-[var(--t-8888a8)] uppercase tracking-wider">Tarea</span>
            </div>
            <div className="relative flex-shrink-0" style={{ width: timelinePx }}>
              {months.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-[var(--s-ebebeb)] flex items-center justify-center overflow-hidden"
                  style={{ left: m.startPx, width: m.widthPx }}
                >
                  <span className="text-[11px] font-semibold text-[var(--t-8888a8)] capitalize select-none">{m.label}</span>
                </div>
              ))}
              {/* Línea hoy en cabecera */}
              <TodayLine />
            </div>
          </div>

          {/* Estado vacío */}
          {groups.length === 0 && withoutDates.length === 0 && (
            <div className="py-16 text-center text-[var(--t-8888a8)] text-sm">
              No hay tareas con fechas. Edita las tareas para agregar fechas de inicio y límite.
            </div>
          )}

          {/* Grupos */}
          {groups.map(group => (
            <div key={group.name}>
              {/* Cabecera de grupo */}
              <div className="flex bg-[var(--s-f7f8fc)] border-b border-[var(--s-edeef5)]" style={{ height: 28 }}>
                <div
                  className="flex-shrink-0 px-4 flex items-center border-r border-[var(--s-e8e8f0)] sticky left-0 bg-[var(--s-f7f8fc)] z-10"
                  style={{ width: LABEL_PX }}
                >
                  <span className="text-[10px] font-bold text-[var(--t-4a4a6a)] uppercase tracking-wider truncate">{group.name}</span>
                </div>
                <div className="relative flex-shrink-0" style={{ width: timelinePx }}>
                  <GridLines />
                  <div className="absolute top-0 bottom-0 w-0.5 bg-red-300/50 z-10" style={{ left: todayPx }} />
                </div>
              </div>

              {/* Filas de tareas */}
              {group.tasks.map(task => {
                const bar      = getBarPx(task);
                const stCfg    = STATUS_CONFIG[task.status];
                const overdue  = isOverdue(task.due_date, task.status);
                const avatarBg = AVATAR_COLORS[task.assignee_name ?? ''] ?? '#8888a8';

                return (
                  <div key={task.id} className="flex h-12 border-b border-[var(--s-f8f8f8)] hover:bg-[var(--s-fafafe)] transition-colors group">

                    {/* Nombre (sticky) */}
                    <div
                      className="flex-shrink-0 px-4 flex items-center gap-2.5 sticky left-0 bg-[var(--surface)] group-hover:bg-[var(--s-fafafe)] z-10 transition-colors border-r border-[var(--s-f0f0f0)]"
                      style={{ width: LABEL_PX }}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${stCfg.bar}`} />
                      <span
                        className={`text-xs font-medium truncate ${task.status === 'done' ? 'line-through text-[var(--t-8888a8)]' : 'text-[var(--t-1a1a2e)]'}`}
                        title={task.title}
                      >
                        {task.title}
                      </span>
                    </div>

                    {/* Lane timeline */}
                    <div className="relative flex-shrink-0" style={{ width: timelinePx }}>
                      <GridLines />
                      <TodayLine />

                      {/* Barra de tarea */}
                      {bar && (
                        <button
                          onClick={() => onEdit(task)}
                          title={`${task.title}${task.start_date ? ` · Inicio: ${formatDate(task.start_date)}` : ''}${task.due_date ? ` · Límite: ${formatDate(task.due_date)}` : ''}`}
                          className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-md ${stCfg.bar} hover:opacity-80 transition-opacity flex items-center overflow-hidden cursor-pointer ${overdue ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}
                          style={{ left: bar.leftPx, width: bar.widthPx }}
                        >
                          {task.progress > 0 && (
                            <div className="absolute left-0 top-0 bottom-0 bg-white/25 rounded-l-md" style={{ width: `${task.progress}%` }} />
                          )}
                          <span className="relative z-10 text-[9px] font-bold text-white truncate px-1.5 leading-none">{task.title}</span>
                        </button>
                      )}

                      {/* Avatar del responsable */}
                      {task.assignee_name && bar && (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white opacity-70 z-20"
                          style={{ left: bar.leftPx + bar.widthPx + 3, background: avatarBg }}
                        >
                          {getInitials(task.assignee_name)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Sin fechas */}
          {withoutDates.length > 0 && (
            <div>
              <div className="flex bg-[var(--s-f7f8fc)] border-b border-[var(--s-edeef5)]" style={{ height: 28 }}>
                <div
                  className="flex-shrink-0 px-4 flex items-center border-r border-[var(--s-e8e8f0)] sticky left-0 bg-[var(--s-f7f8fc)] z-10"
                  style={{ width: LABEL_PX }}
                >
                  <span className="text-[10px] font-bold text-[var(--t-8888a8)] uppercase tracking-wider">Sin fechas</span>
                </div>
                <div className="relative flex-shrink-0" style={{ width: timelinePx }}>
                  <GridLines />
                </div>
              </div>
              {withoutDates.map(task => {
                const stCfg = STATUS_CONFIG[task.status];
                return (
                  <div key={task.id} className="flex h-10 border-b border-[var(--s-f8f8f8)] hover:bg-[var(--s-fafafe)] transition-colors group">
                    <div
                      className="flex-shrink-0 px-4 flex items-center gap-2.5 sticky left-0 bg-[var(--surface)] group-hover:bg-[var(--s-fafafe)] z-10 transition-colors border-r border-[var(--s-f0f0f0)]"
                      style={{ width: LABEL_PX }}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${stCfg.bar}`} />
                      <button onClick={() => onEdit(task)} className="text-xs text-[var(--t-8888a8)] truncate hover:text-[var(--t-4a4a6a)] transition-colors">
                        {task.title}
                      </button>
                    </div>
                    <div className="relative flex-shrink-0" style={{ width: timelinePx }}>
                      <GridLines />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Fila inferior con label "Hoy" */}
          <div className="flex bg-[var(--s-fafafe)] border-t border-[var(--s-f0f0f0)]" style={{ height: 22 }}>
            <div className="flex-shrink-0 border-r border-[var(--s-e8e8f0)]" style={{ width: LABEL_PX }} />
            <div className="relative flex-shrink-0" style={{ width: timelinePx }}>
              <div className="absolute top-0 bottom-0 w-0.5 bg-red-400" style={{ left: todayPx }} />
              <div
                className="absolute text-[9px] font-bold text-red-500 bg-red-50 border border-red-200/70 px-1.5 rounded-sm -translate-x-1/2 leading-tight"
                style={{ left: todayPx, top: 3 }}
              >
                Hoy
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-[var(--s-f0f0f0)] flex-wrap">
        {(Object.entries(STATUS_CONFIG) as [string, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([, cfg]) => (
          <span key={cfg.label} className="flex items-center gap-1.5 text-[11px] text-[var(--t-8888a8)]">
            <span className={`w-2.5 h-2.5 rounded-sm inline-block ${cfg.bar}`} />
            {cfg.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--t-8888a8)] ml-auto">
          <span className="w-2.5 h-1 bg-red-400 inline-block rounded" />
          Hoy
        </span>
      </div>
    </div>
  );
}

// ── Export Slack Modal ────────────────────────────────────────────────────────

const PRIORITY_ORDER: ApiTask['priority'][] = ['urgent', 'high', 'medium', 'low'];
const PRIORITY_EMOJI: Record<ApiTask['priority'], string> = {
  urgent: '🔴',
  high:   '🟠',
  medium: '🔵',
  low:    '⚪',
};

function buildSlackText(tasks: ApiTask[]): string {
  const pending = tasks.filter(t => t.status !== 'done');
  const sorted  = [...pending].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
  );

  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const lines: string[] = [
    '📋 *Tareas Pendientes — Mangone Marketing*',
    `_${today}_`,
    '',
  ];

  let lastPriority: string | null = null;
  for (const task of sorted) {
    if (task.priority !== lastPriority) {
      if (lastPriority !== null) lines.push('');
      lines.push(`${PRIORITY_EMOJI[task.priority]} *${PRIORITY_CONFIG[task.priority].label.toUpperCase()}*`);
      lastPriority = task.priority;
    }
    const assignee = task.assignee_name ?? 'Sin asignar';
    const due      = task.due_date
      ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      : 'Sin fecha';
    lines.push(`• ${task.title}  —  ${assignee}  —  ${due}`);
  }

  if (sorted.length === 0) lines.push('_No hay tareas pendientes._');
  return lines.join('\n');
}

function ExportSlackModal({ tasks, onClose }: { tasks: ApiTask[]; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text  = buildSlackText(tasks);
  const count = tasks.filter(t => t.status !== 'done').length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: user can select manually
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--s-f0f0f0)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#4A154B' }}>
              <Send className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--t-1a1a2e)] text-base">Exportar a Slack</h3>
              <p className="text-xs text-[var(--t-8888a8)]">{count} tarea{count !== 1 ? 's' : ''} pendiente{count !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--s-f0f0f0)] text-[var(--t-8888a8)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 flex-1 overflow-y-auto">
          <textarea
            readOnly
            value={text}
            onClick={e => (e.target as HTMLTextAreaElement).select()}
            className="w-full h-80 text-[13px] font-mono bg-[var(--s-f7f8fc)] border border-[var(--s-e8e8f0)] rounded-xl p-4 resize-none outline-none text-[var(--t-1a1a2e)] leading-relaxed"
          />
          <p className="text-[11px] text-[var(--t-9ca3af)] mt-2">
            Clic en el texto para seleccionar todo · usa formato mrkdwn de Slack
          </p>
        </div>

        {/* Acciones */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold border border-[var(--s-e8e8f0)] rounded-xl text-[var(--t-4a4a6a)] hover:bg-[var(--s-f7f8fc)] transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handleCopy}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-[var(--s-0c2054)] text-white hover:opacity-90'
            }`}
          >
            {copied
              ? <><Check className="w-4 h-4" />¡Copiado!</>
              : <><Copy className="w-4 h-4" />Copiar al portapapeles</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function TareasPage() {
  const isGuest = typeof window !== 'undefined' && auth.getCurrentUser()?.role === 'guest';

  const [tasks,        setTasks]        = useState<ApiTask[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [view,         setView]         = useState<'kanban' | 'list' | 'roadmap'>('kanban');
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal,       setShowModal]       = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingTask,     setEditingTask]     = useState<ApiTask | null>(null);
  const [dragId,       setDragId]       = useState<number | null>(null);
  const [dragOver,     setDragOver]     = useState<ApiTask['status'] | null>(null);

  const loadTasks = async () => {
    try {
      const data = await tasksApi.list();
      setTasks(data.results);
    } catch {
      // silently ignore — user sees empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, []);

  const handleStatusToggle = async (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus: ApiTask['status'] = task.status === 'done' ? 'pending' : 'done';
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    try {
      await tasksApi.update(id, { status: newStatus });
    } catch {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: task.status } : t));
    }
  };

  const handleDelete = async (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await tasksApi.delete(id);
    } catch {
      loadTasks();
    }
  };

  const handleSaved = (saved: ApiTask) => {
    setTasks(prev => {
      const exists = prev.find(t => t.id === saved.id);
      return exists ? prev.map(t => t.id === saved.id ? saved : t) : [saved, ...prev];
    });
  };

  const handleDropOnStatus = async (status: ApiTask['status']) => {
    const id = dragId;
    setDragOver(null);
    setDragId(null);
    if (!id) return;
    const task = tasks.find(t => t.id === id);
    if (!task || task.status === status) return;
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status } : t)));
    try {
      await tasksApi.update(id, { status });
    } catch {
      setTasks(prev => prev.map(t => (t.id === id ? { ...t, status: task.status } : t)));
    }
  };

  const openCreate = () => { setEditingTask(null); setShowModal(true); };
  const openEdit   = (task: ApiTask) => { setEditingTask(task); setShowModal(true); };

  const filtered = tasks.filter(t => {
    const matchSearch  = !search || t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus  = filterStatus === 'all' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusGroups = (Object.keys(STATUS_CONFIG) as ApiTask['status'][]).map(s => ({
    status: s,
    tasks:  filtered.filter(t => t.status === s),
  }));

  const stats = {
    total:      tasks.length,
    done:       tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue:    tasks.filter(t => isOverdue(t.due_date, t.status)).length,
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Tareas"
        subtitle="Gestión de actividades del departamento de marketing"
        actions={
          !isGuest ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 border border-[var(--s-e8e8f0)] bg-[var(--surface)] text-[var(--t-4a4a6a)] text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[var(--s-f7f8fc)] transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Exportar
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 bg-[var(--s-f79c31)] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[var(--s-e08a20)] transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva tarea
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="px-10 py-10 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-6">
          {[
            { val: stats.total,      label: 'Total tareas',  color: 'text-[var(--t-0c2054)]' },
            { val: stats.inProgress, label: 'En progreso',   color: 'text-blue-600'  },
            { val: stats.done,       label: 'Completadas',   color: 'text-green-600' },
            { val: stats.overdue,    label: 'Vencidas',      color: 'text-red-600'   },
          ].map(({ val, label, color }) => (
            <Card key={label} className="p-5 text-center">
              <p className={`text-3xl font-bold tracking-tight ${color}`}>{val}</p>
              <p className="text-xs text-[var(--t-6b7280)] mt-1.5 font-medium">{label}</p>
            </Card>
          ))}
        </div>

        {/* Controles */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--t-8888a8)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar tarea..."
              className="pl-9 pr-4 py-2.5 text-sm border border-[var(--s-e8e8f0)] bg-[var(--surface)] rounded-lg outline-none focus:border-[var(--s-f79c31)] transition-colors w-60"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm font-medium border border-[var(--s-e8e8f0)] bg-[var(--surface)] rounded-lg px-3 py-2.5 outline-none focus:border-[var(--s-f79c31)] transition-colors text-[var(--t-4a4a6a)]"
          >
            <option value="all">Todos los estados</option>
            {(Object.entries(STATUS_CONFIG) as [string, { label: string }][]).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex gap-1 bg-[var(--surface)] border border-[var(--s-e8e8f0)] rounded-lg p-1 ml-auto">
            {(['kanban', 'list', 'roadmap'] as const).map(key => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  view === key ? 'bg-[var(--s-0c2054)] text-white' : 'text-[var(--t-4a4a6a)] hover:bg-[var(--s-f7f8fc)]'
                }`}
              >
                {key === 'roadmap' && <GanttChart className="w-3.5 h-3.5" />}
                {key === 'kanban' ? 'Kanban' : key === 'list' ? 'Lista' : 'Roadmap'}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--t-f79c31)]" />
          </div>
        ) : view === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {statusGroups.map(({ status, tasks: grpTasks }) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={grpTasks}
                onStatusToggle={handleStatusToggle}
                onEdit={openEdit}
                onDelete={handleDelete}
                onTaskDragStart={setDragId}
                onTaskDragEnd={() => { setDragId(null); setDragOver(null); }}
                onDropOnColumn={handleDropOnStatus}
                onDragOverColumn={s => { if (dragOver !== s) setDragOver(s); }}
                onDragLeaveColumn={s => setDragOver(d => (d === s ? null : d))}
                isDragOver={dragOver === status}
                draggingId={dragId}
              />
            ))}
          </div>
        ) : view === 'roadmap' ? (
          <RoadmapView tasks={filtered} onEdit={openEdit} />
        ) : (
          <Card>
            <div className="divide-y divide-[var(--s-f0f0f0)]">
              {filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-[var(--t-4a4a6a)] font-medium">No hay tareas que coincidan</p>
                </div>
              ) : filtered.map(task => {
                const st        = STATUS_CONFIG[task.status];
                const pr        = PRIORITY_CONFIG[task.priority];
                const StatusIcon = st.icon;
                const overdue   = isOverdue(task.due_date, task.status);
                const avatarBg  = AVATAR_COLORS[task.assignee_name ?? ''] ?? '#8888a8';

                return (
                  <div key={task.id} className="flex items-center gap-4 p-4 hover:bg-[var(--s-fafafe)] transition-colors group">
                    <button onClick={() => handleStatusToggle(task.id)} className={st.color}>
                      <StatusIcon className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${task.status === 'done' ? 'line-through text-[var(--t-8888a8)]' : 'text-[var(--t-1a1a2e)]'}`}>
                        {task.title}
                      </p>
                      {task.project && <p className="text-xs text-[var(--t-8888a8)] truncate">{task.project}</p>}
                    </div>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: avatarBg }}>
                      <span className="text-[9px] font-bold text-white">{getInitials(task.assignee_name)}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pr.text} flex-shrink-0`}>{pr.label}</span>
                    {task.due_date && (
                      <span className={`text-xs flex-shrink-0 ${overdue ? 'text-red-600 font-semibold' : 'text-[var(--t-8888a8)]'}`}>
                        {formatDate(task.due_date)}
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.color} flex-shrink-0`}>
                      {st.label}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(task)}
                        className="p-1.5 rounded-lg hover:bg-[var(--s-f0f0f0)] text-[var(--t-8888a8)] hover:text-[var(--t-4a4a6a)] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--t-8888a8)] hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {showModal && (
        <TaskModal
          task={editingTask}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {showExportModal && (
        <ExportSlackModal
          tasks={tasks}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
