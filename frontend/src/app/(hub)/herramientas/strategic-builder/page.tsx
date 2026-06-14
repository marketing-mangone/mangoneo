'use client';
import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import {
  Target, Flag, CheckSquare, TrendingUp, Plus, Trash2, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { teamApi, type ApiTeamMember } from '@/lib/api';

// ── Tipos ───────────────────────────────────────────────────────────────
type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
type Status = 'pending' | 'in_progress' | 'done';

interface Objective { id: string; text: string }
interface Milestone { id: string; title: string; date: string; status: Status }
interface SBTask { id: string; title: string; assignee: string; status: Status }
interface KPI { id: string; name: string; target: string; current: string }

interface QuarterData {
  objectives: Objective[];
  milestones: Milestone[];
  tasks: SBTask[];
  kpis: KPI[];
}

const QUARTERS: { key: Quarter; label: string; months: string }[] = [
  { key: 'Q1', label: 'Q1', months: 'Ene – Mar' },
  { key: 'Q2', label: 'Q2', months: 'Abr – Jun' },
  { key: 'Q3', label: 'Q3', months: 'Jul – Sep' },
  { key: 'Q4', label: 'Q4', months: 'Oct – Dic' },
];

const STATUS_CFG: Record<Status, { label: string; cls: string }> = {
  pending:     { label: 'Pendiente',   cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  in_progress: { label: 'En progreso', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  done:        { label: 'Completado',  cls: 'bg-green-50 text-green-700 border-green-200' },
};

const EMPTY: QuarterData = { objectives: [], milestones: [], tasks: [], kpis: [] };
const LS_KEY = (year: number, q: Quarter) => `sb-${year}-${q}`;
const uid = () => `${Date.now()}-${Math.round(performance.now())}-${Math.floor(performance.now() * 1000) % 1000}`;

function load(year: number, q: Quarter): QuarterData {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = localStorage.getItem(LS_KEY(year, q));
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return EMPTY;
}

const inputCls = 'w-full bg-transparent text-sm text-[var(--t-1a1a2e)] placeholder:text-[var(--t-9ca3af)] outline-none';

export default function StrategicBuilderPage() {
  const [mounted, setMounted] = useState(false);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [quarter, setQuarter] = useState<Quarter>('Q1');
  const [data, setData] = useState<QuarterData>(EMPTY);
  const [team, setTeam] = useState<ApiTeamMember[]>([]);

  useEffect(() => {
    setMounted(true);
    teamApi.list().then(r => setTeam(r.results.filter(m => m.status === 'active'))).catch(() => {});
  }, []);

  useEffect(() => {
    if (mounted) setData(load(year, quarter));
  }, [year, quarter, mounted]);

  // Persiste en cada cambio
  const update = useCallback((next: QuarterData) => {
    setData(next);
    localStorage.setItem(LS_KEY(year, quarter), JSON.stringify(next));
  }, [year, quarter]);

  if (!mounted) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-[var(--t-f79c31)]" /></div>;
  }

  // Helpers genéricos por sección
  const addObjective = () => update({ ...data, objectives: [...data.objectives, { id: uid(), text: '' }] });
  const addMilestone = () => update({ ...data, milestones: [...data.milestones, { id: uid(), title: '', date: '', status: 'pending' }] });
  const addTask = () => update({ ...data, tasks: [...data.tasks, { id: uid(), title: '', assignee: '', status: 'pending' }] });
  const addKpi = () => update({ ...data, kpis: [...data.kpis, { id: uid(), name: '', target: '', current: '' }] });

  const counts = `${data.objectives.length} objetivos · ${data.milestones.length} milestones · ${data.tasks.length} tareas · ${data.kpis.length} KPIs`;

  return (
    <div className="animate-fade-in">
      <Header
        title="Strategic Builder"
        subtitle="Planificación estratégica trimestral del departamento"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setYear(y => y - 1)} className="w-8 h-8 rounded-lg border border-[var(--s-e8e8f0)] flex items-center justify-center text-[var(--t-6b7280)] hover:bg-[var(--s-f7f8fc)]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-[var(--t-0c2054)] min-w-[48px] text-center">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="w-8 h-8 rounded-lg border border-[var(--s-e8e8f0)] flex items-center justify-center text-[var(--t-6b7280)] hover:bg-[var(--s-f7f8fc)]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="px-10 py-10 space-y-8">
        {/* Tabs de trimestre */}
        <div className="flex items-center gap-2 flex-wrap">
          {QUARTERS.map(q => (
            <button
              key={q.key}
              onClick={() => setQuarter(q.key)}
              className={`flex flex-col items-start px-5 py-3 rounded-xl border transition-all ${
                quarter === q.key
                  ? 'bg-[var(--s-0c2054)] text-white border-[var(--s-0c2054)] shadow-sm'
                  : 'bg-[var(--surface)] text-[var(--t-4a4a6a)] border-[var(--s-e8e8f0)] hover:bg-[var(--s-f7f8fc)]'
              }`}
            >
              <span className="text-base font-bold leading-none">{q.label}</span>
              <span className={`text-[11px] mt-1 ${quarter === q.key ? 'text-white/70' : 'text-[var(--t-9ca3af)]'}`}>{q.months}</span>
            </button>
          ))}
          <span className="ml-auto text-xs text-[var(--t-9ca3af)]">{quarter} {year} · {counts}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Objetivos ── */}
          <Section icon={<Target className="w-4 h-4" />} accent="text-[var(--t-f79c31)] bg-[#F79C31]/10" title="Objetivos" onAdd={addObjective}>
            {data.objectives.length === 0 && <Empty text="Define los objetivos del trimestre." />}
            {data.objectives.map((o, i) => (
              <Row key={o.id} onDelete={() => update({ ...data, objectives: data.objectives.filter(x => x.id !== o.id) })}>
                <span className="text-[var(--t-9ca3af)] text-xs font-bold mt-0.5 w-5 flex-shrink-0">{i + 1}.</span>
                <input
                  value={o.text}
                  onChange={e => update({ ...data, objectives: data.objectives.map(x => x.id === o.id ? { ...x, text: e.target.value } : x) })}
                  placeholder="Objetivo estratégico…"
                  className={inputCls}
                />
              </Row>
            ))}
          </Section>

          {/* ── KPIs ── */}
          <Section icon={<TrendingUp className="w-4 h-4" />} accent="text-emerald-600 bg-emerald-50" title="KPIs" onAdd={addKpi}>
            {data.kpis.length === 0 && <Empty text="Indicadores para medir el éxito del trimestre." />}
            {data.kpis.map(k => (
              <Row key={k.id} onDelete={() => update({ ...data, kpis: data.kpis.filter(x => x.id !== k.id) })}>
                <div className="flex-1 grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                  <input value={k.name} onChange={e => update({ ...data, kpis: data.kpis.map(x => x.id === k.id ? { ...x, name: e.target.value } : x) })} placeholder="Métrica…" className={inputCls} />
                  <input value={k.current} onChange={e => update({ ...data, kpis: data.kpis.map(x => x.id === k.id ? { ...x, current: e.target.value } : x) })} placeholder="Actual" className="w-16 text-sm text-right bg-[var(--s-f7f8fc)] rounded px-2 py-1 outline-none" />
                  <span className="text-[var(--t-9ca3af)] text-xs">/</span>
                  <input value={k.target} onChange={e => update({ ...data, kpis: data.kpis.map(x => x.id === k.id ? { ...x, target: e.target.value } : x) })} placeholder="Meta" className="w-16 text-sm text-right bg-[var(--s-f7f8fc)] rounded px-2 py-1 outline-none font-semibold text-[var(--t-0c2054)]" />
                </div>
              </Row>
            ))}
          </Section>

          {/* ── Milestones ── */}
          <Section icon={<Flag className="w-4 h-4" />} accent="text-blue-600 bg-blue-50" title="Milestones" onAdd={addMilestone}>
            {data.milestones.length === 0 && <Empty text="Hitos clave con fecha objetivo." />}
            {data.milestones.map(m => (
              <Row key={m.id} onDelete={() => update({ ...data, milestones: data.milestones.filter(x => x.id !== m.id) })}>
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  <input value={m.title} onChange={e => update({ ...data, milestones: data.milestones.map(x => x.id === m.id ? { ...x, title: e.target.value } : x) })} placeholder="Hito…" className={`${inputCls} min-w-[120px] flex-1`} />
                  <input type="date" value={m.date} onChange={e => update({ ...data, milestones: data.milestones.map(x => x.id === m.id ? { ...x, date: e.target.value } : x) })} className="text-xs text-[var(--t-6b7280)] bg-[var(--s-f7f8fc)] rounded px-2 py-1 outline-none" />
                  <StatusSelect value={m.status} onChange={s => update({ ...data, milestones: data.milestones.map(x => x.id === m.id ? { ...x, status: s } : x) })} />
                </div>
              </Row>
            ))}
          </Section>

          {/* ── Tareas (con responsables) ── */}
          <Section icon={<CheckSquare className="w-4 h-4" />} accent="text-purple-600 bg-purple-50" title="Tareas y Responsables" onAdd={addTask}>
            {data.tasks.length === 0 && <Empty text="Acciones concretas y quién las ejecuta." />}
            {data.tasks.map(t => (
              <Row key={t.id} onDelete={() => update({ ...data, tasks: data.tasks.filter(x => x.id !== t.id) })}>
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  <input value={t.title} onChange={e => update({ ...data, tasks: data.tasks.map(x => x.id === t.id ? { ...x, title: e.target.value } : x) })} placeholder="Tarea…" className={`${inputCls} min-w-[120px] flex-1`} />
                  <select
                    value={t.assignee}
                    onChange={e => update({ ...data, tasks: data.tasks.map(x => x.id === t.id ? { ...x, assignee: e.target.value } : x) })}
                    className="text-xs text-[var(--t-6b7280)] bg-[var(--s-f7f8fc)] rounded px-2 py-1 outline-none max-w-[120px]"
                  >
                    <option value="">Responsable…</option>
                    {team.map(m => <option key={m.user_id} value={m.name}>{m.name}</option>)}
                  </select>
                  <StatusSelect value={t.status} onChange={s => update({ ...data, tasks: data.tasks.map(x => x.id === t.id ? { ...x, status: s } : x) })} />
                </div>
              </Row>
            ))}
          </Section>
        </div>

        <p className="text-xs text-[var(--t-9ca3af)] text-center">
          Los cambios se guardan automáticamente en este navegador. {QUARTERS.find(q => q.key === quarter)?.months} · {year}
        </p>
      </div>
    </div>
  );
}

// ── Subcomponentes ──────────────────────────────────────────────────────
function Section({ icon, accent, title, onAdd, children }: {
  icon: React.ReactNode; accent: string; title: string; onAdd: () => void; children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
          <h3 className="text-[15px] font-bold text-[var(--t-111827)]">{title}</h3>
        </div>
        <button onClick={onAdd} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--t-0c2054)] border border-[var(--s-e8e8f0)] px-3 py-1.5 rounded-lg hover:bg-[var(--s-f7f8fc)] transition-colors">
          <Plus className="w-3.5 h-3.5" /> Agregar
        </button>
      </div>
      <div className="space-y-1.5">{children}</div>
    </Card>
  );
}

function Row({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  return (
    <div className="flex items-start gap-2 py-2 px-2 rounded-lg hover:bg-[var(--s-fafafe)] group">
      {children}
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-[var(--t-9ca3af)] hover:text-red-500 transition-all flex-shrink-0 mt-0.5">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-[var(--t-9ca3af)] py-3 px-2">{text}</p>;
}

function StatusSelect({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as Status)}
      className={`text-[11px] font-semibold rounded-full border px-2 py-1 outline-none cursor-pointer ${STATUS_CFG[value].cls}`}
    >
      {(Object.keys(STATUS_CFG) as Status[]).map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
    </select>
  );
}
