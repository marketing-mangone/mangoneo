'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, ListChecks } from 'lucide-react';
import { ventasApi, type ApiLeadTask, type LeadTaskType, type LeadPriority } from '@/lib/api';

const TASK_TYPES: { value: LeadTaskType; label: string }[] = [
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'llamada',     label: 'Llamada' },
  { value: 'email',       label: 'Email' },
  { value: 'whatsapp',    label: 'WhatsApp' },
  { value: 'reunion',     label: 'Reunión' },
  { value: 'otro',        label: 'Otro' },
];

function dueLabel(iso: string | null): string {
  if (!iso) return 'Sin fecha';
  return new Date(iso).toLocaleString('es-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function LeadTasksCard({ leadId }: { leadId: number }) {
  const [tasks, setTasks] = useState<ApiLeadTask[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<LeadTaskType>('seguimiento');
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState<LeadPriority>('media');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await ventasApi.listTasks({ lead: leadId, ordering: 'status,due_date', page_size: 100 });
      setTasks(res.results);
    } catch (e) { console.error(e); }
  }, [leadId]);

  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await ventasApi.createTask({
        lead: leadId,
        title: title.trim(),
        task_type: type,
        priority,
        due_date: due ? new Date(due).toISOString() : null,
      });
      setTitle(''); setDue(''); setType('seguimiento'); setPriority('media');
      setShowForm(false);
      await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const toggle = async (t: ApiLeadTask) => {
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: t.status === 'completada' ? 'pendiente' : 'completada' } : x));
    try { await ventasApi.completeTask(t.id, t.status === 'completada'); await load(); }
    catch (e) { console.error(e); load(); }
  };

  const remove = async (id: number) => {
    setTasks(prev => prev.filter(x => x.id !== id));
    try { await ventasApi.deleteTask(id); } catch (e) { console.error(e); load(); }
  };

  const inputCls = 'border border-[var(--s-e5e7eb)] rounded-lg px-3 py-2 text-sm bg-[var(--surface)] text-[var(--t-0c2054)] focus:outline-none focus:ring-2 focus:ring-[#0C2054]/20';

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--s-e8eaf0)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-[var(--t-0c2054)] text-base flex items-center gap-2">
          <ListChecks className="w-4 h-4" /> Tareas
        </h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--t-0c2054)] border border-[var(--s-e5e7eb)] px-3 py-1.5 rounded-lg hover:bg-[var(--s-f9fafb)] transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Nueva
        </button>
      </div>

      {showForm && (
        <form onSubmit={add} className="space-y-2 mb-4 bg-[var(--s-f7f8fc)] rounded-xl p-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="ej. Llamar para confirmar consulta"
            className={`${inputCls} w-full`}
            autoFocus
          />
          <div className="grid grid-cols-3 gap-2">
            <select value={type} onChange={e => setType(e.target.value as LeadTaskType)} className={inputCls}>
              {TASK_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={priority} onChange={e => setPriority(e.target.value as LeadPriority)} className={inputCls}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
            <input type="datetime-local" value={due} onChange={e => setDue(e.target.value)} className={inputCls} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-[var(--t-6b7280)] px-3 py-1.5">Cancelar</button>
            <button type="submit" disabled={saving || !title.trim()} className="bg-[var(--s-0c2054)] text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-[var(--s-1a3a7a)] disabled:opacity-50 transition-colors">
              {saving ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </form>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-[var(--t-9ca3af)] text-center py-4">Sin tareas para este lead.</p>
      ) : (
        <div className="divide-y divide-[var(--s-f3f4f6)]">
          {tasks.map(t => {
            const done = t.status === 'completada';
            return (
              <div key={t.id} className="flex items-start gap-3 py-2.5 group">
                <button onClick={() => toggle(t)} className="mt-0.5 flex-shrink-0 transition-colors" title={done ? 'Reabrir' : 'Completar'}>
                  {done ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-[var(--t-9ca3af)] hover:text-emerald-600" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${done ? 'line-through text-[var(--t-9ca3af)]' : 'text-[var(--t-374151)]'}`}>{t.title}</p>
                  <p className={`text-[11px] mt-0.5 ${t.is_overdue ? 'text-red-500 font-semibold' : 'text-[var(--t-9ca3af)]'}`}>
                    {t.task_type_display} · {dueLabel(t.due_date)}{t.is_overdue ? ' · vencida' : ''}
                  </p>
                </div>
                <button onClick={() => remove(t.id)} className="opacity-0 group-hover:opacity-100 text-[var(--t-9ca3af)] hover:text-red-500 transition-all flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
