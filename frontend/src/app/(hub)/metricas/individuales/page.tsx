'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { ChevronLeft, ChevronRight, Pencil, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────

type KPIUnit = 'number' | 'percentage' | 'score';

interface KPIDef {
  id: string;
  name: string;
  target: number;
  unit: KPIUnit;
  lowerIsBetter?: boolean;
}

interface MemberDef {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  kpis: KPIDef[];
}

type MemberKPIMap = Record<string, number | null>;

interface WeekData {
  kpis: Record<string, MemberKPIMap>;
  notes: Record<string, string>;
}

// ── Team definition ────────────────────────────────────────────────────

const TEAM: MemberDef[] = [
  {
    id: 'alejandra',
    name: 'Alejandra García',
    role: 'Contenido',
    initials: 'AG',
    color: '#7c3aed',
    kpis: [
      { id: 'posts-redes', name: 'Posts en redes', target: 15, unit: 'number' },
      { id: 'articulos-blog', name: 'Artículos de blog', target: 1, unit: 'number' },
      { id: 'stories', name: 'Stories publicadas', target: 10, unit: 'number' },
      { id: 'engagement', name: 'Tasa de engagement', target: 5, unit: 'percentage' },
    ],
  },
  {
    id: 'sara',
    name: 'Sara Rodríguez',
    role: 'Diseño',
    initials: 'SR',
    color: '#ec4899',
    kpis: [
      { id: 'assets-entregados', name: 'Assets entregados', target: 10, unit: 'number' },
      { id: 'solicitudes-ok', name: 'Solicitudes a tiempo', target: 8, unit: 'number' },
      { id: 'revisiones-avg', name: 'Revisiones por asset', target: 2, unit: 'number', lowerIsBetter: true },
    ],
  },
  {
    id: 'gloriana',
    name: 'Gloriana López',
    role: 'Video',
    initials: 'GL',
    color: '#0891b2',
    kpis: [
      { id: 'videos-producidos', name: 'Videos producidos', target: 2, unit: 'number' },
      { id: 'reels-publicados', name: 'Reels publicados', target: 3, unit: 'number' },
      { id: 'views-acumuladas', name: 'Views acumuladas', target: 5000, unit: 'number' },
    ],
  },
  {
    id: 'andres',
    name: 'Andrés Martínez',
    role: 'Web / SEO',
    initials: 'AM',
    color: '#059669',
    kpis: [
      { id: 'paginas-optimizadas', name: 'Páginas optimizadas', target: 3, unit: 'number' },
      { id: 'tareas-completadas', name: 'Tareas completadas', target: 10, unit: 'number' },
      { id: 'score-seo', name: 'Score SEO promedio', target: 85, unit: 'score' },
    ],
  },
  {
    id: 'jesus',
    name: 'Jesús Hernández',
    role: 'HubSpot',
    initials: 'JH',
    color: '#d97706',
    kpis: [
      { id: 'leads-procesados', name: 'Leads procesados', target: 50, unit: 'number' },
      { id: 'emails-enviados', name: 'Emails enviados', target: 200, unit: 'number' },
      { id: 'workflows-activos', name: 'Workflows activos', target: 5, unit: 'number' },
      { id: 'tareas-hubspot', name: 'Tareas HubSpot', target: 20, unit: 'number' },
    ],
  },
];

// ── Week helpers ────────────────────────────────────────────────────────

function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getWeekStartDate(weekKey: string): Date {
  const [yearStr, weekStr] = weekKey.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const week1Mon = new Date(jan4);
  week1Mon.setUTCDate(jan4.getUTCDate() - day + 1);
  const result = new Date(week1Mon);
  result.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7);
  return result;
}

function shiftWeek(weekKey: string, delta: number): string {
  const start = getWeekStartDate(weekKey);
  start.setUTCDate(start.getUTCDate() + delta * 7);
  return getISOWeekKey(start);
}

function formatWeekLabel(weekKey: string): string {
  const num = weekKey.split('-W')[1];
  const start = getWeekStartDate(weekKey);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const s = start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const e = end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `Sem. ${num} · ${s} – ${e}`;
}

// ── KPI helpers ────────────────────────────────────────────────────────

function calcPct(actual: number | null | undefined, target: number, lowerIsBetter?: boolean): number | null {
  if (actual === null || actual === undefined) return null;
  if (lowerIsBetter) {
    if (actual === 0) return 100;
    return Math.min((target / actual) * 100, 100);
  }
  return Math.min((actual / target) * 100, 100);
}

function pctColor(pct: number | null): string {
  if (pct === null) return '#d1d5db';
  if (pct >= 100) return '#00b894';
  if (pct >= 70) return '#F79C31';
  return '#ef4444';
}

function pctBadge(pct: number | null): string {
  if (pct === null) return 'bg-gray-100 text-gray-400';
  if (pct >= 100) return 'bg-green-50 text-green-700';
  if (pct >= 70) return 'bg-orange-50 text-orange-700';
  return 'bg-red-50 text-red-600';
}

function memberPct(member: MemberDef, kpiMap: MemberKPIMap | undefined): number | null {
  if (!kpiMap) return null;
  const vals = member.kpis
    .map(k => calcPct(kpiMap[k.id], k.target, k.lowerIsBetter))
    .filter((v): v is number => v !== null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function fmtVal(val: number | null | undefined, unit: KPIUnit): string {
  if (val === null || val === undefined) return '—';
  if (unit === 'percentage') return `${val}%`;
  if (unit === 'score') return `${val} pts`;
  if (val >= 1000) return val.toLocaleString('es-ES');
  return String(val);
}

// ── localStorage ────────────────────────────────────────────────────────

const LS_PREFIX = 'mangone-kpi-ind-';

function loadWeek(weekKey: string): WeekData {
  if (typeof window === 'undefined') return { kpis: {}, notes: {} };
  try {
    const raw = localStorage.getItem(LS_PREFIX + weekKey);
    return raw ? (JSON.parse(raw) as WeekData) : { kpis: {}, notes: {} };
  } catch {
    return { kpis: {}, notes: {} };
  }
}

function saveWeek(weekKey: string, data: WeekData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_PREFIX + weekKey, JSON.stringify(data));
}

function emptyDraft(): WeekData {
  return { kpis: {}, notes: {} };
}

// ── MemberCard ──────────────────────────────────────────────────────────

interface MemberCardProps {
  member: MemberDef;
  kpiMap: MemberKPIMap;
  notes: string;
  editMode: boolean;
  onKpiChange: (kpiId: string, value: number | null) => void;
  onNotesChange: (v: string) => void;
}

function MemberCard({ member, kpiMap, notes, editMode, onKpiChange, onNotesChange }: MemberCardProps) {
  const overall = memberPct(member, kpiMap);

  return (
    <Card className="p-0 overflow-hidden flex flex-col">
      {/* Card header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f0f0f0]">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm"
          style={{ background: member.color }}
        >
          {member.initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1a1a2e] truncate leading-tight">{member.name}</p>
          <p className="text-xs text-[#8888a8] mt-0.5">{member.role}</p>
        </div>
        <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', pctBadge(overall))}>
          {overall !== null ? `${overall.toFixed(0)}%` : 'Pendiente'}
        </span>
      </div>

      {/* KPI rows */}
      <div className="px-5 py-3 flex-1">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center mb-2">
          <span className="text-[10px] font-semibold text-[#8888a8] uppercase tracking-wide">KPI</span>
          <span className="text-[10px] font-semibold text-[#8888a8] uppercase tracking-wide text-right">Target</span>
          <span className="text-[10px] font-semibold text-[#8888a8] uppercase tracking-wide text-right w-16">Real</span>
          <span className="text-[10px] font-semibold text-[#8888a8] uppercase tracking-wide text-right w-10">%</span>
        </div>

        <div className="space-y-1">
          {member.kpis.map(kpi => {
            const actual = kpiMap[kpi.id] ?? null;
            const pct = calcPct(actual, kpi.target, kpi.lowerIsBetter);
            const color = pctColor(pct);

            return (
              <div key={kpi.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center py-2 border-t border-[#f7f8fc]">
                <span className="text-xs text-[#4a4a6a] font-medium truncate">{kpi.name}</span>

                <span className="text-xs text-[#8888a8] text-right tabular-nums">
                  {fmtVal(kpi.target, kpi.unit)}
                </span>

                <div className="w-16">
                  {editMode ? (
                    <input
                      type="number"
                      value={actual ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        onKpiChange(kpi.id, v === '' ? null : parseFloat(v));
                      }}
                      className="w-full text-right text-xs font-semibold px-2 py-1 rounded-md border border-[#e8e8f0] focus:outline-none focus:border-[#0C2054] bg-[#f7f8fc] text-[#1a1a2e] tabular-nums"
                      placeholder="—"
                      min={0}
                      step={kpi.unit === 'percentage' ? 0.1 : 1}
                    />
                  ) : (
                    <span
                      className="text-xs font-bold block text-right tabular-nums"
                      style={{ color: actual !== null ? color : '#d1d5db' }}
                    >
                      {fmtVal(actual, kpi.unit)}
                    </span>
                  )}
                </div>

                <div className="w-10 text-right">
                  {pct !== null ? (
                    <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>
                      {pct.toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#d1d5db]">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Compliance bar */}
        {overall !== null && (
          <div className="mt-3">
            <div className="w-full h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${overall}%`, background: pctColor(overall) }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {(editMode || notes) && (
        <div className="px-5 pb-4 border-t border-[#f0f0f0] pt-3">
          {editMode ? (
            <textarea
              value={notes}
              onChange={e => onNotesChange(e.target.value)}
              placeholder="Notas sobre el desempeño de esta semana..."
              rows={2}
              className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8e8f0] focus:outline-none focus:border-[#0C2054] bg-[#f7f8fc] text-[#4a4a6a] resize-none placeholder:text-[#c0c0d0]"
            />
          ) : (
            <p className="text-xs text-[#6b7280] italic leading-relaxed">{notes}</p>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

export default function MetricasIndividualesPage() {
  const [week, setWeek] = useState(() => getISOWeekKey(new Date()));
  const [data, setData] = useState<WeekData>(emptyDraft());
  const [draft, setDraft] = useState<WeekData>(emptyDraft());
  const [editMode, setEditMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setData(loadWeek(getISOWeekKey(new Date())));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setData(loadWeek(week));
    setEditMode(false);
  }, [week, mounted]);

  const handleEdit = () => {
    setDraft(JSON.parse(JSON.stringify(data)));
    setEditMode(true);
  };

  const handleSave = () => {
    saveWeek(week, draft);
    setData(draft);
    setEditMode(false);
  };

  const handleCancel = () => {
    setEditMode(false);
  };

  const setKpi = (memberId: string, kpiId: string, value: number | null) => {
    setDraft(prev => ({
      ...prev,
      kpis: {
        ...prev.kpis,
        [memberId]: { ...(prev.kpis[memberId] ?? {}), [kpiId]: value },
      },
    }));
  };

  const setNotes = (memberId: string, notes: string) => {
    setDraft(prev => ({
      ...prev,
      notes: { ...prev.notes, [memberId]: notes },
    }));
  };

  const active = editMode ? draft : data;

  const memberPcts = TEAM.map(m => memberPct(m, active.kpis[m.id]));
  const filled = memberPcts.filter((v): v is number => v !== null);
  const teamPct = filled.length > 0 ? filled.reduce((a, b) => a + b, 0) / filled.length : null;

  return (
    <div className="animate-fade-in">
      <Header
        title="Métricas Individuales"
        subtitle="Cumplimiento semanal de KPIs por miembro del equipo"
        actions={
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 text-xs font-semibold text-[#4a4a6a] border border-[#e8e8f0] rounded-lg px-3 py-2 hover:bg-[#f7f8fc] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 text-xs font-bold text-white rounded-lg px-4 py-2 transition-colors hover:opacity-90"
                  style={{ background: '#0C2054' }}
                >
                  <Save className="w-3.5 h-3.5" />
                  Guardar semana
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 text-xs font-semibold text-[#4a4a6a] border border-[#e8e8f0] rounded-lg px-3 py-2 hover:bg-[#f7f8fc] transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar semana
              </button>
            )}
          </div>
        }
      />

      <div className="px-10 py-10 space-y-8">

        {/* Week navigator + team summary */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Week selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeek(w => shiftWeek(w, -1))}
              disabled={editMode}
              className="w-8 h-8 rounded-lg border border-[#e8e8f0] flex items-center justify-center text-[#4a4a6a] hover:bg-[#f7f8fc] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-4 py-2 bg-white border border-[#e8e8f0] rounded-lg min-w-[280px] text-center">
              <p className="text-sm font-semibold text-[#1a1a2e]">
                {mounted ? formatWeekLabel(week) : '...'}
              </p>
            </div>

            <button
              onClick={() => setWeek(w => shiftWeek(w, 1))}
              disabled={editMode}
              className="w-8 h-8 rounded-lg border border-[#e8e8f0] flex items-center justify-center text-[#4a4a6a] hover:bg-[#f7f8fc] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setWeek(getISOWeekKey(new Date()))}
              disabled={editMode}
              className="text-xs font-semibold text-[#0C2054] hover:underline ml-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Semana actual
            </button>
          </div>

          {/* Team compliance summary */}
          <div className="flex items-center gap-3">
            {TEAM.map((m, i) => (
              <div key={m.id} className="flex flex-col items-center gap-1" title={m.name}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: m.color }}
                >
                  {m.initials}
                </div>
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color: pctColor(memberPcts[i]) }}
                >
                  {memberPcts[i] !== null ? `${(memberPcts[i] as number).toFixed(0)}%` : '—'}
                </span>
              </div>
            ))}

            {teamPct !== null && (
              <div
                className="ml-1 px-3 py-1.5 rounded-xl text-xs font-bold border"
                style={{
                  background: pctColor(teamPct) + '15',
                  color: pctColor(teamPct),
                  borderColor: pctColor(teamPct) + '40',
                }}
              >
                Equipo {teamPct.toFixed(0)}%
              </div>
            )}
          </div>
        </div>

        {/* Edit mode banner */}
        {editMode && (
          <div
            className="flex items-center gap-3 px-5 py-3.5 rounded-xl border"
            style={{ background: 'rgba(247,156,49,0.06)', borderColor: 'rgba(247,156,49,0.3)' }}
          >
            <span className="w-2 h-2 rounded-full bg-[#F79C31] animate-pulse flex-shrink-0" />
            <p className="text-sm font-medium text-[#92400e]">
              Modo edición activo — Ingresa los valores reales de cada miembro y guarda los cambios.
            </p>
          </div>
        )}

        {/* Member cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {TEAM.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              kpiMap={active.kpis[member.id] ?? {}}
              notes={active.notes[member.id] ?? ''}
              editMode={editMode}
              onKpiChange={(kpiId, value) => setKpi(member.id, kpiId, value)}
              onNotesChange={notes => setNotes(member.id, notes)}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
