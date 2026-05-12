'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import {
  ChevronLeft, ChevronRight, Pencil, Save, X,
  Loader2, Users, UserMinus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { teamApi, type ApiTeamMember } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────

type KPIUnit = 'number' | 'percentage' | 'score';

interface KPIDef {
  id: string;
  name: string;
  target: number;
  unit: KPIUnit;
  lowerIsBetter?: boolean;
}

interface WeekData {
  kpis: Record<string, Record<string, number | null>>;
  notes: Record<string, string>;
}

// ── KPI definitions by area ────────────────────────────────────────────

const KPI_BY_AREA: Record<string, KPIDef[]> = {
  Contenido: [
    { id: 'posts-redes', name: 'Posts en redes', target: 15, unit: 'number' },
    { id: 'articulos-blog', name: 'Artículos de blog', target: 1, unit: 'number' },
    { id: 'stories', name: 'Stories publicadas', target: 10, unit: 'number' },
    { id: 'engagement', name: 'Engagement promedio', target: 5, unit: 'percentage' },
  ],
  Diseño: [
    { id: 'assets-entregados', name: 'Assets entregados', target: 10, unit: 'number' },
    { id: 'solicitudes-ok', name: 'Solicitudes a tiempo', target: 8, unit: 'number' },
    { id: 'revisiones-avg', name: 'Revisiones por asset', target: 2, unit: 'number', lowerIsBetter: true },
  ],
  Producción: [
    { id: 'videos-producidos', name: 'Videos producidos', target: 2, unit: 'number' },
    { id: 'reels-publicados', name: 'Reels publicados', target: 3, unit: 'number' },
    { id: 'views-acumuladas', name: 'Views acumuladas', target: 5000, unit: 'number' },
  ],
  Digital: [
    { id: 'paginas-optimizadas', name: 'Páginas optimizadas', target: 3, unit: 'number' },
    { id: 'tareas-completadas', name: 'Tareas completadas', target: 10, unit: 'number' },
    { id: 'score-seo', name: 'Score SEO promedio', target: 85, unit: 'score' },
  ],
  'Paid Media': [
    { id: 'leads-procesados', name: 'Leads procesados', target: 50, unit: 'number' },
    { id: 'emails-enviados', name: 'Emails enviados', target: 200, unit: 'number' },
    { id: 'workflows-activos', name: 'Workflows activos', target: 5, unit: 'number' },
    { id: 'tareas-hubspot', name: 'Tareas HubSpot', target: 20, unit: 'number' },
  ],
  Dirección: [
    { id: 'reuniones-equipo', name: 'Reuniones de equipo', target: 3, unit: 'number' },
    { id: 'reportes', name: 'Reportes entregados', target: 1, unit: 'number' },
  ],
};

const AREA_COLORS: Record<string, string> = {
  Dirección: '#0C2054',
  Contenido: '#7c3aed',
  Digital: '#0984e3',
  Producción: '#00b894',
  Diseño: '#e17055',
  'Paid Media': '#F79C31',
};

function avatarColor(member: ApiTeamMember): string {
  return AREA_COLORS[member.area] || '#6b7280';
}

// ── Week helpers — all LOCAL time (noon avoids DST edge cases) ─────────

function getISOWeekKey(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getWeekStartDate(weekKey: string): Date {
  const [yearStr, weekStr] = weekKey.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan4 = new Date(year, 0, 4, 12);
  const day = jan4.getDay() || 7;
  const week1Mon = new Date(jan4);
  week1Mon.setDate(jan4.getDate() - day + 1);
  const result = new Date(week1Mon);
  result.setDate(week1Mon.getDate() + (week - 1) * 7);
  return result;
}

function shiftWeek(weekKey: string, delta: number): string {
  const start = getWeekStartDate(weekKey);
  start.setDate(start.getDate() + delta * 7);
  return getISOWeekKey(start);
}

function formatWeekLabel(weekKey: string): string {
  const start = getWeekStartDate(weekKey);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const s = start.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  const e = end.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${s} – ${e}`;
}

// ── Compliance helpers ─────────────────────────────────────────────────

function calcPct(actual: number | null | undefined, target: number, lowerIsBetter?: boolean): number | null {
  if (actual === null || actual === undefined) return null;
  if (lowerIsBetter) return actual === 0 ? 100 : Math.min((target / actual) * 100, 100);
  return Math.min((actual / target) * 100, 100);
}

function pctColor(pct: number | null): string {
  if (pct === null) return '#d1d5db';
  if (pct >= 100) return '#00b894';
  if (pct >= 70) return '#F79C31';
  return '#ef4444';
}

function pctBadgeCls(pct: number | null): string {
  if (pct === null) return 'bg-gray-100 text-gray-400';
  if (pct >= 100) return 'bg-green-50 text-green-700';
  if (pct >= 70) return 'bg-orange-50 text-orange-700';
  return 'bg-red-50 text-red-600';
}

function memberOverallPct(member: ApiTeamMember, kpiMap: Record<string, number | null> | undefined): number | null {
  const kpis = KPI_BY_AREA[member.area];
  if (!kpis || !kpiMap) return null;
  const vals = kpis.map(k => calcPct(kpiMap[k.id], k.target, k.lowerIsBetter)).filter((v): v is number => v !== null);
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

const LS_WEEK = 'mangone-kpi-ind-';
const LS_EXCLUDED = 'mangone-kpi-ind-excluded';

function loadWeek(weekKey: string): WeekData {
  if (typeof window === 'undefined') return { kpis: {}, notes: {} };
  try {
    const raw = localStorage.getItem(LS_WEEK + weekKey);
    return raw ? (JSON.parse(raw) as WeekData) : { kpis: {}, notes: {} };
  } catch { return { kpis: {}, notes: {} }; }
}

function saveWeek(weekKey: string, data: WeekData): void {
  if (typeof window !== 'undefined') localStorage.setItem(LS_WEEK + weekKey, JSON.stringify(data));
}

function loadExcluded(): number[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LS_EXCLUDED) || '[]'); } catch { return []; }
}

function saveExcluded(ids: number[]): void {
  if (typeof window !== 'undefined') localStorage.setItem(LS_EXCLUDED, JSON.stringify(ids));
}

// ── MemberCard ──────────────────────────────────────────────────────────

interface MemberCardProps {
  member: ApiTeamMember;
  kpiMap: Record<string, number | null>;
  notes: string;
  editMode: boolean;
  isAdmin: boolean;
  onKpiChange: (kpiId: string, value: number | null) => void;
  onNotesChange: (v: string) => void;
  onRemove: () => void;
}

function MemberCard({ member, kpiMap, notes, editMode, isAdmin, onKpiChange, onNotesChange, onRemove }: MemberCardProps) {
  const kpis = KPI_BY_AREA[member.area] ?? [];
  const overall = memberOverallPct(member, kpiMap);
  const color = avatarColor(member);

  return (
    <Card className="p-0 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f0f0f0]">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm"
          style={{ background: color }}
        >
          {member.avatar || member.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1a1a2e] truncate leading-tight">{member.name}</p>
          <p className="text-xs text-[#8888a8] mt-0.5">{member.position || member.area}</p>
        </div>
        <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', pctBadgeCls(overall))}>
          {overall !== null ? `${overall.toFixed(0)}%` : 'Pendiente'}
        </span>
        {isAdmin && (
          <button
            onClick={onRemove}
            title="Quitar de seguimiento"
            className="p-1.5 text-[#c0c0d0] hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
          >
            <UserMinus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* KPI rows */}
      <div className="px-5 py-3 flex-1">
        {kpis.length === 0 ? (
          <p className="text-xs text-[#8888a8] italic py-3 text-center">Sin KPIs definidos para el área "{member.area}"</p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center mb-2">
              <span className="text-[10px] font-semibold text-[#8888a8] uppercase tracking-wide">KPI</span>
              <span className="text-[10px] font-semibold text-[#8888a8] uppercase tracking-wide text-right">Meta</span>
              <span className="text-[10px] font-semibold text-[#8888a8] uppercase tracking-wide text-right w-16">Real</span>
              <span className="text-[10px] font-semibold text-[#8888a8] uppercase tracking-wide text-right w-10">%</span>
            </div>

            <div className="space-y-0">
              {kpis.map(kpi => {
                const actual = kpiMap[kpi.id] ?? null;
                const pct = calcPct(actual, kpi.target, kpi.lowerIsBetter);
                const col = pctColor(pct);
                return (
                  <div key={kpi.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center py-2.5 border-t border-[#f7f8fc]">
                    <span className="text-xs text-[#4a4a6a] font-medium truncate">{kpi.name}</span>
                    <span className="text-xs text-[#8888a8] text-right tabular-nums">{fmtVal(kpi.target, kpi.unit)}</span>
                    <div className="w-16">
                      {editMode ? (
                        <input
                          type="number"
                          value={actual ?? ''}
                          onChange={e => onKpiChange(kpi.id, e.target.value === '' ? null : parseFloat(e.target.value))}
                          className="w-full text-right text-xs font-semibold px-2 py-1 rounded-md border border-[#e8e8f0] focus:outline-none focus:border-[#0C2054] bg-[#f7f8fc] text-[#1a1a2e] tabular-nums"
                          placeholder="—"
                          min={0}
                          step={kpi.unit === 'percentage' ? 0.1 : 1}
                        />
                      ) : (
                        <span
                          className="text-xs font-bold block text-right tabular-nums"
                          style={{ color: actual !== null ? col : '#d1d5db' }}
                        >
                          {fmtVal(actual, kpi.unit)}
                        </span>
                      )}
                    </div>
                    <div className="w-10 text-right">
                      {pct !== null
                        ? <span className="text-[10px] font-semibold tabular-nums" style={{ color: col }}>{pct.toFixed(0)}%</span>
                        : <span className="text-[10px] text-[#d1d5db]">—</span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>

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
          </>
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

// ── Manage members modal ────────────────────────────────────────────────

function ManageModal({
  allMembers,
  excluded,
  onSave,
  onClose,
}: {
  allMembers: ApiTeamMember[];
  excluded: number[];
  onSave: (excluded: number[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<number[]>(excluded);

  function toggle(id: number) {
    setDraft(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e8f0]">
          <h2 className="font-bold text-[#1a1a2e]">Miembros en seguimiento</h2>
          <button onClick={onClose} className="p-1.5 text-[#8888a8] hover:text-[#1a1a2e] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-1 max-h-80 overflow-y-auto">
          {allMembers.map(m => {
            const included = !draft.includes(m.id);
            const color = avatarColor(m);
            return (
              <label key={m.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-[#f7f8fc] cursor-pointer transition-colors">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ background: color }}
                >
                  {m.avatar || m.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1a1a2e] truncate">{m.name}</p>
                  <p className="text-xs text-[#8888a8]">{m.position || m.area}</p>
                </div>
                <input
                  type="checkbox"
                  checked={included}
                  onChange={() => toggle(m.id)}
                  className="w-4 h-4 rounded accent-[#0C2054]"
                />
              </label>
            );
          })}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#e8e8f0]">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[#4a4a6a] bg-[#f7f8fc] hover:bg-[#eeeef5] rounded-lg transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => { onSave(draft); onClose(); }}
            className="px-4 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ background: '#0C2054' }}
          >
            Guardar selección
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

export default function MetricasIndividualesPage() {
  const [week, setWeek] = useState(() => getISOWeekKey(new Date()));
  const [data, setData] = useState<WeekData>({ kpis: {}, notes: {} });
  const [draft, setDraft] = useState<WeekData>({ kpis: {}, notes: {} });
  const [editMode, setEditMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [allMembers, setAllMembers] = useState<ApiTeamMember[]>([]);
  const [excluded, setExcluded] = useState<number[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showManage, setShowManage] = useState(false);

  // Bootstrap: load team + excluded list
  useEffect(() => {
    setMounted(true);
    setExcluded(loadExcluded());

    // Check if admin from cached user
    try {
      const cached = JSON.parse(localStorage.getItem('current_user') || '{}');
      setIsAdmin(cached?.role === 'admin');
    } catch { /* ignore */ }

    teamApi.list()
      .then(res => setAllMembers(res.results.filter(m => m.status === 'active')))
      .catch(() => {/* keep empty */})
      .finally(() => setLoadingMembers(false));
  }, []);

  // Load week data when week changes
  useEffect(() => {
    if (!mounted) return;
    setData(loadWeek(week));
    setEditMode(false);
  }, [week, mounted]);

  const visibleMembers = allMembers.filter(m => !excluded.includes(m.id));

  const handleEdit = () => {
    setDraft(JSON.parse(JSON.stringify(data)));
    setEditMode(true);
  };

  const handleSave = () => {
    saveWeek(week, draft);
    setData(draft);
    setEditMode(false);
  };

  const handleCancel = () => setEditMode(false);

  const handleRemoveMember = (id: number) => {
    const next = [...excluded, id];
    setExcluded(next);
    saveExcluded(next);
  };

  const handleManageSave = (newExcluded: number[]) => {
    setExcluded(newExcluded);
    saveExcluded(newExcluded);
  };

  const setKpi = (memberId: string, kpiId: string, value: number | null) => {
    setDraft(prev => ({
      ...prev,
      kpis: { ...prev.kpis, [memberId]: { ...(prev.kpis[memberId] ?? {}), [kpiId]: value } },
    }));
  };

  const setNotes = (memberId: string, notes: string) => {
    setDraft(prev => ({ ...prev, notes: { ...prev.notes, [memberId]: notes } }));
  };

  const active = editMode ? draft : data;

  // Team summary
  const memberPcts = visibleMembers.map(m => memberOverallPct(m, active.kpis[String(m.id)]));
  const filled = memberPcts.filter((v): v is number => v !== null);
  const teamPct = filled.length > 0 ? filled.reduce((a, b) => a + b, 0) / filled.length : null;

  return (
    <div className="animate-fade-in">
      <Header
        title="Métricas Individuales"
        subtitle="Cumplimiento semanal de KPIs por miembro del equipo"
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowManage(true)}
                disabled={editMode}
                className="flex items-center gap-2 text-xs font-semibold text-[#4a4a6a] border border-[#e8e8f0] rounded-lg px-3 py-2 hover:bg-[#f7f8fc] transition-colors disabled:opacity-40"
              >
                <Users className="w-3.5 h-3.5" />
                Gestionar miembros
              </button>
            )}
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
                  className="flex items-center gap-2 text-xs font-bold text-white rounded-lg px-4 py-2 hover:opacity-90 transition-opacity"
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

        {/* Week nav + team summary */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeek(w => shiftWeek(w, -1))}
              disabled={editMode}
              className="w-8 h-8 rounded-lg border border-[#e8e8f0] flex items-center justify-center text-[#4a4a6a] hover:bg-[#f7f8fc] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-5 py-2 bg-white border border-[#e8e8f0] rounded-lg">
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

          {/* Per-member mini badges */}
          {visibleMembers.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              {visibleMembers.map((m, i) => (
                <div key={m.id} className="flex flex-col items-center gap-1" title={m.name}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ background: avatarColor(m) }}
                  >
                    {m.avatar || m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: pctColor(memberPcts[i]) }}>
                    {memberPcts[i] !== null ? `${(memberPcts[i] as number).toFixed(0)}%` : '—'}
                  </span>
                </div>
              ))}
              {teamPct !== null && (
                <div
                  className="ml-1 px-3 py-1.5 rounded-xl text-xs font-bold border"
                  style={{ background: pctColor(teamPct) + '15', color: pctColor(teamPct), borderColor: pctColor(teamPct) + '40' }}
                >
                  Equipo {teamPct.toFixed(0)}%
                </div>
              )}
            </div>
          )}
        </div>

        {/* Edit mode banner */}
        {editMode && (
          <div
            className="flex items-center gap-3 px-5 py-3.5 rounded-xl border"
            style={{ background: 'rgba(247,156,49,0.06)', borderColor: 'rgba(247,156,49,0.3)' }}
          >
            <span className="w-2 h-2 rounded-full bg-[#F79C31] animate-pulse flex-shrink-0" />
            <p className="text-sm font-medium text-[#92400e]">
              Modo edición — Ingresa los valores reales de cada miembro y guarda los cambios.
            </p>
          </div>
        )}

        {/* Loading */}
        {loadingMembers && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#8888a8]" />
          </div>
        )}

        {/* No members */}
        {!loadingMembers && visibleMembers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-10 h-10 text-[#d1d5db] mb-3" />
            <p className="text-sm font-semibold text-[#4a4a6a]">Sin miembros en seguimiento</p>
            <p className="text-xs text-[#8888a8] mt-1">
              {allMembers.length > 0
                ? 'Usa "Gestionar miembros" para agregar personas al panel.'
                : 'No hay miembros activos en el equipo.'}
            </p>
          </div>
        )}

        {/* Member cards */}
        {!loadingMembers && visibleMembers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleMembers.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                kpiMap={active.kpis[String(member.id)] ?? {}}
                notes={active.notes[String(member.id)] ?? ''}
                editMode={editMode}
                isAdmin={isAdmin}
                onKpiChange={(kpiId, value) => setKpi(String(member.id), kpiId, value)}
                onNotesChange={notes => setNotes(String(member.id), notes)}
                onRemove={() => handleRemoveMember(member.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showManage && (
        <ManageModal
          allMembers={allMembers}
          excluded={excluded}
          onSave={handleManageSave}
          onClose={() => setShowManage(false)}
        />
      )}
    </div>
  );
}
