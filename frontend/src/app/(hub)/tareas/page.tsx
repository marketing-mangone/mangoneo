'use client';
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Plus, Filter, Search, ChevronDown, Clock,
  CheckCircle2, Circle, AlertCircle, Pause, Ban,
  Flag, User, Calendar, Tag, MoreVertical,
} from 'lucide-react';
import { MOCK_TASKS } from '@/lib/mock-data';
import type { Task } from '@/types';
import { formatDate } from '@/lib/utils';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', icon: Circle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
  in_progress: { label: 'En progreso', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  review: { label: 'En revisión', icon: AlertCircle, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  done: { label: 'Completada', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  blocked: { label: 'Bloqueada', icon: Ban, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgente', color: 'bg-red-500', text: 'text-red-700 bg-red-50' },
  high: { label: 'Alta', color: 'bg-[#F79C31]', text: 'text-orange-700 bg-orange-50' },
  medium: { label: 'Media', color: 'bg-blue-400', text: 'text-blue-700 bg-blue-50' },
  low: { label: 'Baja', color: 'bg-gray-300', text: 'text-gray-600 bg-gray-50' },
};

const AVATAR_COLORS: Record<string, string> = {
  'Sebastian Quijada': '#0C2054',
  'Alejandra Andrade': '#7c3aed',
  'Andrés Coronel': '#0984e3',
  'Gloriana López': '#00b894',
  'Sara Castaño': '#e17055',
  'Jesús Méndez': '#F79C31',
};

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
}

function isOverdue(dueDate: string, status: Task['status']) {
  return status !== 'done' && new Date(dueDate) < new Date();
}

function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange: (id: number, status: Task['status']) => void }) {
  const st = STATUS_CONFIG[task.status];
  const pr = PRIORITY_CONFIG[task.priority];
  const StatusIcon = st.icon;
  const overdue = isOverdue(task.dueDate, task.status);
  const avatarBg = AVATAR_COLORS[task.assignee] || '#8888a8';

  return (
    <Card className={`p-4 hover:shadow-md transition-all ${overdue ? 'border-red-200' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onStatusChange(task.id, task.status === 'done' ? 'pending' : 'done')}
          className={`mt-0.5 flex-shrink-0 ${st.color} hover:opacity-70 transition-opacity`}
        >
          <StatusIcon className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={`text-sm font-semibold leading-tight ${task.status === 'done' ? 'line-through text-[#8888a8]' : 'text-[#1a1a2e]'}`}>
              {task.title}
            </p>
            <button className="text-[#8888a8] hover:text-[#4a4a6a] flex-shrink-0 p-0.5">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {task.description && (
            <p className="text-xs text-[#8888a8] line-clamp-2 mb-2">{task.description}</p>
          )}

          {/* Progress bar */}
          {task.progress !== undefined && task.status !== 'done' && (
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
          <div className="flex flex-wrap gap-1 mb-2">
            {task.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#f7f8fc] text-[#8888a8]">
                #{tag}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ background: avatarBg }}>
                {getInitials(task.assignee)}
              </div>
              <span className="text-xs text-[#8888a8] truncate max-w-[100px]">{task.assignee.split(' ')[0]}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pr.text}`}>
                {pr.label}
              </span>
              <span className={`flex items-center gap-0.5 text-[10px] font-medium ${overdue ? 'text-red-600' : 'text-[#8888a8]'}`}>
                <Calendar className="w-3 h-3" />
                {overdue ? '¡Vencida!' : formatDate(task.dueDate)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function KanbanColumn({ status, tasks, onStatusChange }: {
  status: Task['status'];
  tasks: Task[];
  onStatusChange: (id: number, status: Task['status']) => void;
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
          <TaskCard key={task.id} task={task} onStatusChange={onStatusChange} />
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

export default function TareasPage() {
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');

  const filtered = tasks.filter(t => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
    const matchAssignee = filterAssignee === 'all' || t.assignee === filterAssignee;
    return matchSearch && matchAssignee;
  });

  const handleStatusChange = (id: number, newStatus: Task['status']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const statusGroups = (Object.keys(STATUS_CONFIG) as Task['status'][]).map(s => ({
    status: s,
    tasks: filtered.filter(t => t.status === s),
  }));

  const assignees = [...new Set(tasks.map(t => t.assignee))];

  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => isOverdue(t.dueDate, t.status)).length,
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Tareas"
        subtitle="Gestión de actividades del departamento de marketing"
        actions={
          <button className="flex items-center gap-2 bg-[#F79C31] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#e08a20] transition-colors shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            Nueva tarea
          </button>
        }
      />

      <div className="px-10 py-10 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-6">
          {[
            { val: stats.total, label: 'Total tareas', color: 'text-[#0C2054]' },
            { val: stats.inProgress, label: 'En progreso', color: 'text-blue-600' },
            { val: stats.done, label: 'Completadas', color: 'text-green-600' },
            { val: stats.overdue, label: 'Vencidas', color: 'text-red-600' },
          ].map(({ val, label, color }) => (
            <Card key={label} className="p-5 text-center">
              <p className={`text-3xl font-bold tracking-tight ${color}`}>{val}</p>
              <p className="text-xs text-[#6b7280] mt-1.5 font-medium">{label}</p>
            </Card>
          ))}
        </div>

        {/* Controls */}
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
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            className="text-sm font-medium border border-[#e8e8f0] bg-white rounded-lg px-3 py-2.5 outline-none focus:border-[#F79C31] transition-colors text-[#4a4a6a]"
          >
            <option value="all">Todos los miembros</option>
            {assignees.map(a => <option key={a} value={a}>{a.split(' ')[0]}</option>)}
          </select>

          <div className="flex gap-1 bg-white border border-[#e8e8f0] rounded-lg p-1 ml-auto">
            <button
              onClick={() => setView('kanban')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${view === 'kanban' ? 'bg-[#0C2054] text-white' : 'text-[#4a4a6a] hover:bg-[#f7f8fc]'}`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView('list')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${view === 'list' ? 'bg-[#0C2054] text-white' : 'text-[#4a4a6a] hover:bg-[#f7f8fc]'}`}
            >
              Lista
            </button>
          </div>
        </div>

        {/* Board */}
        {view === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {statusGroups.map(({ status, tasks: grpTasks }) => (
              <KanbanColumn key={status} status={status} tasks={grpTasks} onStatusChange={handleStatusChange} />
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
                const st = STATUS_CONFIG[task.status];
                const pr = PRIORITY_CONFIG[task.priority];
                const StatusIcon = st.icon;
                const overdue = isOverdue(task.dueDate, task.status);
                const avatarBg = AVATAR_COLORS[task.assignee] || '#8888a8';

                return (
                  <div key={task.id} className="flex items-center gap-4 p-4 hover:bg-[#fafafe] transition-colors">
                    <button onClick={() => handleStatusChange(task.id, task.status === 'done' ? 'pending' : 'done')} className={st.color}>
                      <StatusIcon className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${task.status === 'done' ? 'line-through text-[#8888a8]' : 'text-[#1a1a2e]'}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-[#8888a8] truncate">{task.project}</p>
                    </div>
                    <div className="flex items-center gap-2 w-6 h-6 rounded-full flex-shrink-0" style={{ background: avatarBg }}>
                      <span className="text-[9px] font-bold text-white mx-auto">{getInitials(task.assignee)}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pr.text} flex-shrink-0`}>{pr.label}</span>
                    <span className={`text-xs flex-shrink-0 ${overdue ? 'text-red-600 font-semibold' : 'text-[#8888a8]'}`}>
                      {formatDate(task.dueDate)}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.color} flex-shrink-0`}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
