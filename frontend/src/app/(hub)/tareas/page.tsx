'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import {
  Plus, Search, Clock, CheckCircle2, Circle, AlertCircle, Ban,
  Calendar, MoreVertical, X, Loader2, Trash2, Pencil, CheckSquare,
} from 'lucide-react';
import { tasksApi, ApiTask } from '@/lib/api';
import { formatDate } from '@/lib/utils';

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:     { label: 'Pendiente',   icon: Circle,       color: 'text-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  in_progress: { label: 'En progreso', icon: Clock,        color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  review:      { label: 'En revisión', icon: AlertCircle,  color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  done:        { label: 'Completada',  icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
  blocked:     { label: 'Bloqueada',   icon: Ban,          color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
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
  'Jesús Méndez':      '#F79C31',
};

function getInitials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
}

function isOverdue(dueDate: string | null, status: ApiTask['status']) {
  return status !== 'done' && !!dueDate && new Date(dueDate) < new Date();
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

  const [title,       setTitle]       = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status,      setStatus]      = useState<ApiTask['status']>(task?.status ?? 'pending');
  const [priority,    setPriority]    = useState<ApiTask['priority']>(task?.priority ?? 'medium');
  const [dueDate,     setDueDate]     = useState(task?.due_date ?? '');
  const [project,     setProject]     = useState(task?.project ?? '');
  const [progress,    setProgress]    = useState(task?.progress ?? 0);
  const [tagsInput,   setTagsInput]   = useState((task?.tags ?? []).join(', '));
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const submit = async () => {
    if (!title.trim()) { setError('El título es obligatorio.'); return; }
    setSaving(true);
    setError('');
    const payload = {
      title:       title.trim(),
      description: description.trim(),
      status,
      priority,
      due_date:    dueDate || null,
      project:     project.trim(),
      progress,
      tags:        tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      assignee:    null,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f0f0f0] sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F79C31]/10 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-[#F79C31]" />
            </div>
            <h3 className="font-bold text-[#1a1a2e]">{isEdit ? 'Editar tarea' : 'Nueva tarea'}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f8fc] text-[#8888a8]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nombre de la tarea"
              className="w-full px-3 py-2.5 text-sm border border-[#e8e8f0] rounded-lg outline-none focus:border-[#F79C31] transition-colors"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">
              Descripción <span className="text-[#8888a8] font-normal">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalle de la tarea..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-[#e8e8f0] rounded-lg outline-none focus:border-[#F79C31] transition-colors resize-none"
            />
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">Estado</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(STATUS_CONFIG) as [ApiTask['status'], typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setStatus(key)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    status === key
                      ? `${cfg.bg} ${cfg.color} border-current`
                      : 'bg-white text-[#4a4a6a] border-[#e8e8f0] hover:bg-[#f7f8fc]'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">Prioridad</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(PRIORITY_CONFIG) as [ApiTask['priority'], typeof PRIORITY_CONFIG[keyof typeof PRIORITY_CONFIG]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setPriority(key)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    priority === key
                      ? `${cfg.text} border-current`
                      : 'bg-white text-[#4a4a6a] border-[#e8e8f0] hover:bg-[#f7f8fc]'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fecha límite + Proyecto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">
                Fecha límite <span className="text-[#8888a8] font-normal">(opcional)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[#e8e8f0] rounded-lg outline-none focus:border-[#F79C31] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">
                Proyecto <span className="text-[#8888a8] font-normal">(opcional)</span>
              </label>
              <input
                value={project}
                onChange={e => setProject(e.target.value)}
                placeholder="Ej: Blog Q2"
                className="w-full px-3 py-2.5 text-sm border border-[#e8e8f0] rounded-lg outline-none focus:border-[#F79C31] transition-colors"
              />
            </div>
          </div>

          {/* Progreso */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-[#4a4a6a] mb-1.5">
              <label>Progreso</label>
              <span className="text-[#F79C31]">{progress}%</span>
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
            <label className="block text-xs font-semibold text-[#4a4a6a] mb-1.5">
              Etiquetas <span className="text-[#8888a8] font-normal">(separadas por coma)</span>
            </label>
            <input
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="diseño, redes, VAWA"
              className="w-full px-3 py-2.5 text-sm border border-[#e8e8f0] rounded-lg outline-none focus:border-[#F79C31] transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold border border-[#e8e8f0] rounded-lg text-[#4a4a6a] hover:bg-[#f7f8fc] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold bg-[#F79C31] text-white rounded-lg hover:bg-[#e08a20] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
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
    if (confirmDelete) {
      onDelete(task.id);
    } else {
      setConfirmDelete(true);
    }
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
            <p className={`text-sm font-semibold leading-tight ${task.status === 'done' ? 'line-through text-[#8888a8]' : 'text-[#1a1a2e]'}`}>
              {task.title}
            </p>

            {/* MoreVertical menu */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => { setMenuOpen(v => !v); setConfirmDelete(false); }}
                className="text-[#8888a8] hover:text-[#4a4a6a] p-0.5"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => { setMenuOpen(false); setConfirmDelete(false); }} />
                  <div className="absolute right-0 top-6 z-20 bg-white border border-[#e8e8f0] rounded-xl shadow-lg py-1 w-36 overflow-hidden">
                    <button
                      onClick={() => { onEdit(task); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#4a4a6a] hover:bg-[#f7f8fc] transition-colors"
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
            <p className="text-xs text-[#8888a8] line-clamp-2 mb-2">{task.description}</p>
          )}

          {/* Barra de progreso */}
          {task.progress > 0 && task.status !== 'done' && (
            <div className="mb-2">
              <div className="flex justify-between text-[10px] text-[#8888a8] mb-1">
                <span>Progreso</span>
                <span>{task.progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${task.progress}%`, background: task.progress >= 80 ? '#00b894' : '#F79C31' }}
                />
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#f7f8fc] text-[#8888a8]">
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
              <span className="text-xs text-[#8888a8] truncate max-w-[100px]">
                {task.assignee_name ? task.assignee_name.split(' ')[0] : '—'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pr.text}`}>
                {pr.label}
              </span>
              {task.due_date && (
                <span className={`flex items-center gap-0.5 text-[10px] font-medium ${overdue ? 'text-red-600' : 'text-[#8888a8]'}`}>
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
}: {
  status: ApiTask['status'];
  tasks: ApiTask[];
  onStatusToggle: (id: number) => void;
  onEdit: (task: ApiTask) => void;
  onDelete: (id: number) => void;
}) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <div className="flex flex-col min-w-[280px]">
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg mb-3 border ${config.bg} ${config.border}`}>
        <StatusIcon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-sm font-bold ${config.color}`}>{config.label}</span>
        <span className="ml-auto text-xs font-bold bg-white rounded-full w-5 h-5 flex items-center justify-center text-[#4a4a6a] shadow-sm">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-3 flex-1">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onStatusToggle={onStatusToggle} onEdit={onEdit} onDelete={onDelete} />
        ))}
        {tasks.length === 0 && (
          <div className="border-2 border-dashed border-[#e8e8f0] rounded-xl p-6 text-center">
            <p className="text-sm text-[#8888a8]">Sin tareas</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function TareasPage() {
  const [tasks,        setTasks]        = useState<ApiTask[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [view,         setView]         = useState<'kanban' | 'list'>('kanban');
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal,    setShowModal]    = useState(false);
  const [editingTask,  setEditingTask]  = useState<ApiTask | null>(null);

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
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#F79C31] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#e08a20] transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva tarea
          </button>
        }
      />

      <div className="px-10 py-10 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-6">
          {[
            { val: stats.total,      label: 'Total tareas',  color: 'text-[#0C2054]' },
            { val: stats.inProgress, label: 'En progreso',   color: 'text-blue-600'  },
            { val: stats.done,       label: 'Completadas',   color: 'text-green-600' },
            { val: stats.overdue,    label: 'Vencidas',      color: 'text-red-600'   },
          ].map(({ val, label, color }) => (
            <Card key={label} className="p-5 text-center">
              <p className={`text-3xl font-bold tracking-tight ${color}`}>{val}</p>
              <p className="text-xs text-[#6b7280] mt-1.5 font-medium">{label}</p>
            </Card>
          ))}
        </div>

        {/* Controles */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8888a8]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar tarea..."
              className="pl-9 pr-4 py-2.5 text-sm border border-[#e8e8f0] bg-white rounded-lg outline-none focus:border-[#F79C31] transition-colors w-60"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm font-medium border border-[#e8e8f0] bg-white rounded-lg px-3 py-2.5 outline-none focus:border-[#F79C31] transition-colors text-[#4a4a6a]"
          >
            <option value="all">Todos los estados</option>
            {(Object.entries(STATUS_CONFIG) as [string, { label: string }][]).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          <div className="flex gap-1 bg-white border border-[#e8e8f0] rounded-lg p-1 ml-auto">
            {(['kanban', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
                  view === v ? 'bg-[#0C2054] text-white' : 'text-[#4a4a6a] hover:bg-[#f7f8fc]'
                }`}
              >
                {v === 'kanban' ? 'Kanban' : 'Lista'}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[#F79C31]" />
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
              />
            ))}
          </div>
        ) : (
          <Card>
            <div className="divide-y divide-[#f0f0f0]">
              {filtered.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-[#4a4a6a] font-medium">No hay tareas que coincidan</p>
                </div>
              ) : filtered.map(task => {
                const st        = STATUS_CONFIG[task.status];
                const pr        = PRIORITY_CONFIG[task.priority];
                const StatusIcon = st.icon;
                const overdue   = isOverdue(task.due_date, task.status);
                const avatarBg  = AVATAR_COLORS[task.assignee_name ?? ''] ?? '#8888a8';

                return (
                  <div key={task.id} className="flex items-center gap-4 p-4 hover:bg-[#fafafe] transition-colors group">
                    <button onClick={() => handleStatusToggle(task.id)} className={st.color}>
                      <StatusIcon className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${task.status === 'done' ? 'line-through text-[#8888a8]' : 'text-[#1a1a2e]'}`}>
                        {task.title}
                      </p>
                      {task.project && <p className="text-xs text-[#8888a8] truncate">{task.project}</p>}
                    </div>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: avatarBg }}>
                      <span className="text-[9px] font-bold text-white">{getInitials(task.assignee_name)}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pr.text} flex-shrink-0`}>{pr.label}</span>
                    {task.due_date && (
                      <span className={`text-xs flex-shrink-0 ${overdue ? 'text-red-600 font-semibold' : 'text-[#8888a8]'}`}>
                        {formatDate(task.due_date)}
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.color} flex-shrink-0`}>
                      {st.label}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(task)}
                        className="p-1.5 rounded-lg hover:bg-[#f0f0f0] text-[#8888a8] hover:text-[#4a4a6a] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[#8888a8] hover:text-red-600 transition-colors"
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
    </div>
  );
}
