'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, Clock, AlertTriangle, ListChecks } from 'lucide-react';
import { ventasApi, type ApiLeadTask } from '@/lib/api';

const TYPE_EMOJI: Record<string, string> = {
  seguimiento: '📌', llamada: '📞', email: '✉️', whatsapp: '💬', reunion: '🤝', otro: '•',
};

function dueLabel(iso: string | null): string {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso);
  return d.toLocaleString('es-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function TasksPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [tasks, setTasks] = useState<ApiLeadTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ventasApi.listTasks({ status: 'pendiente', ordering: 'due_date', page_size: 100 });
      setTasks(res.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const complete = async (id: number) => {
    setBusyId(id);
    setTasks(prev => prev.filter(t => t.id !== id)); // optimista
    try {
      await ventasApi.completeTask(id);
    } catch (e) {
      console.error(e);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const now = new Date();
  const today = now.toDateString();
  const overdue = tasks.filter(t => t.is_overdue);
  const dueToday = tasks.filter(t => !t.is_overdue && t.due_date && new Date(t.due_date).toDateString() === today);
  const upcoming = tasks.filter(t => !t.is_overdue && (!t.due_date || new Date(t.due_date).toDateString() !== today));

  const Row = ({ t }: { t: ApiLeadTask }) => (
    <div className="flex items-start gap-3 py-2.5 group">
      <button
        onClick={() => complete(t.id)}
        disabled={busyId === t.id}
        className="mt-0.5 text-[var(--t-9ca3af)] hover:text-emerald-600 transition-colors flex-shrink-0"
        title="Marcar como completada"
      >
        {busyId === t.id ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--t-374151)] leading-snug">
          <span className="mr-1">{TYPE_EMOJI[t.task_type] ?? '•'}</span>{t.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--t-9ca3af)]">
          <Link href={`/ventas/leads/${t.lead}`} className="hover:underline truncate max-w-[160px]">{t.lead_name}</Link>
          <span>·</span>
          <span className={t.is_overdue ? 'text-red-500 font-semibold' : ''}>{dueLabel(t.due_date)}</span>
          {t.assigned_to_name && <><span>·</span><span className="truncate">{t.assigned_to_name}</span></>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-[var(--t-0c2054)]" />
          <h3 className="text-sm font-bold text-[var(--t-0c2054)]">Tareas pendientes</h3>
        </div>
        {overdue.length > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> {overdue.length} vencidas
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-[var(--t-9ca3af)] py-4">Cargando tareas...</p>
      ) : tasks.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
          <p className="text-sm text-[var(--t-9ca3af)]">Sin tareas pendientes. ¡Todo al día!</p>
          <p className="text-xs text-[var(--t-d1d5db)] mt-1">Agrega tareas desde el detalle de un lead.</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[420px] overflow-y-auto">
          {overdue.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Vencidas
              </p>
              <div className="divide-y divide-[var(--s-f3f4f6)]">{overdue.map(t => <Row key={t.id} t={t} />)}</div>
            </div>
          )}
          {dueToday.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[var(--t-f79c31)] uppercase tracking-wide mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Hoy
              </p>
              <div className="divide-y divide-[var(--s-f3f4f6)]">{dueToday.map(t => <Row key={t.id} t={t} />)}</div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[var(--t-9ca3af)] uppercase tracking-wide mb-1">Próximas</p>
              <div className="divide-y divide-[var(--s-f3f4f6)]">{upcoming.map(t => <Row key={t.id} t={t} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
