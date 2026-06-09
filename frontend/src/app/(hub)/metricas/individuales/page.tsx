'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import {
  ChevronLeft, ChevronRight, Pencil, Save, X,
  Loader2, Users, UserMinus, Settings2, Plus, Trash2, RotateCcw,
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

// ── Area default KPIs ──────────────────────────────────────────────────

const KPI_DEFAULTS: Record<string, KPIDef[]> = {
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
  Dirección: '#0C2054', Contenido: '#7c3aed', Digital: '#0984e3',
  Producción: '#00b894', Diseño: '#e17055', 'Paid Media': '#F79C31',
};

function avatarColor(m: ApiTeamMember): string {
  return AREA_COLORS[m.area] || '#6b7280';
}

// ── Week helpers (local time, noon avoids DST) ─────────────────────────

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

function memberOverallPct(kpis: KPIDef[], kpiMap: Record<string, number | null> | undefined): number | null {
  if (kpis.length === 0) return null;
  const vals = kpis.map(k => {
    const actual = kpiMap?.[k.id] ?? null;
    if (actual === null) return 0; // sin valor = 0% de cumplimiento
    return calcPct(actual, k.target, k.lowerIsBetter) ?? 0;
  });
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

const LS_WEEK     = 'mangone-kpi-ind-';
const LS_EXCLUDED = 'mangone-kpi-ind-excluded';
const LS_KPIDEFS  = 'mangone-kpi-ind-defs';

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

function loadAllKPIDefs(): Record<string, KPIDef[]> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(LS_KPIDEFS) || '{}'); } catch { return {}; }
}

function saveKPIDefsForMember(memberId: string, kpis: KPIDef[]): void {
  if (typeof window === 'undefined') return;
  const all = loadAllKPIDefs();
  all[memberId] = kpis;
  localStorage.setItem(LS_KPIDEFS, JSON.stringify(all));
}

function getKPIsForMember(memberId: string, area: string, allDefs: Record<string, KPIDef[]>): KPIDef[] {
  return allDefs[memberId] ?? KPI_DEFAULTS[area] ?? [];
}

function newKpiId(): string {
  return `kpi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── KPI Config Modal ────────────────────────────────────────────────────

const UNIT_LABELS: Record<KPIUnit, string> = {
  number: 'Número',
  percentage: 'Porcentaje',
  score: 'Score',
};

interface KPIConfigModalProps {
  member: ApiTeamMember;
  initialKPIs: KPIDef[];
  onSave: (kpis: KPIDef[]) => void;
  onClose: () => void;
}

function KPIConfigModal({ member, initialKPIs, onSave, onClose }: KPIConfigModalProps) {
  const [kpis, setKpis] = useState<KPIDef[]>(() => initialKPIs.map(k => ({ ...k })));
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newUnit, setNewUnit] = useState<KPIUnit>('number');
  const [newLower, setNewLower] = useState(false);
  const [addError, setAddError] = useState('');

  const inputCls = 'px-2 py-1.5 text-xs border border-[var(--s-e8e8f0)] bg-[var(--s-f7f8fc)] rounded-md outline-none focus:border-[var(--s-0c2054)] focus:bg-[var(--surface)] transition-all';

  function updateKpi(id: string, field: keyof KPIDef, value: unknown) {
    setKpis(prev => prev.map(k => k.id === id ? { ...k, [field]: value } : k));
  }

  function deleteKpi(id: string) {
    setKpis(prev => prev.filter(k => k.id !== id));
  }

  function handleAdd() {
    setAddError('');
    const name = newName.trim();
    if (!name) { setAddError('El nombre es obligatorio.'); return; }
    const target = parseFloat(newTarget);
    if (isNaN(target) || target <= 0) { setAddError('La meta debe ser mayor que cero.'); return; }
    setKpis(prev => [...prev, { id: newKpiId(), name, target, unit: newUnit, lowerIsBetter: newLower || undefined }]);
    setNewName('');
    setNewTarget('');
    setNewUnit('number');
    setNewLower(false);
  }

  function handleRestore() {
    const defaults = KPI_DEFAULTS[member.area];
    if (defaults) setKpis(defaults.map(k => ({ ...k })));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--s-e8e8f0)]">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
            style={{ background: avatarColor(member) }}
          >
            {member.avatar || member.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-[var(--t-1a1a2e)] text-base leading-tight">KPIs de {member.name.split(' ')[0]}</h2>
            <p className="text-xs text-[var(--t-8888a8)]">{member.position || member.area}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--t-8888a8)] hover:text-[var(--t-1a1a2e)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KPI list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {/* Column headers */}
          {kpis.length > 0 && (
            <div className="grid grid-cols-[1fr_80px_100px_28px_28px] gap-2 items-center px-1 mb-1">
              <span className="text-[10px] font-semibold text-[var(--t-8888a8)] uppercase tracking-wide">Nombre</span>
              <span className="text-[10px] font-semibold text-[var(--t-8888a8)] uppercase tracking-wide text-center">Meta</span>
              <span className="text-[10px] font-semibold text-[var(--t-8888a8)] uppercase tracking-wide text-center">Unidad</span>
              <span className="text-[10px] font-semibold text-[var(--t-8888a8)] uppercase tracking-wide text-center" title="¿Menor es mejor?">↓</span>
              <span />
            </div>
          )}

          {kpis.length === 0 && (
            <p className="text-sm text-[var(--t-8888a8)] italic text-center py-4">Sin KPIs. Agrega uno abajo.</p>
          )}

          {kpis.map(kpi => (
            <div key={kpi.id} className="grid grid-cols-[1fr_80px_100px_28px_28px] gap-2 items-center bg-[var(--s-f7f8fc)] rounded-lg px-3 py-2">
              <input
                value={kpi.name}
                onChange={e => updateKpi(kpi.id, 'name', e.target.value)}
                className={`${inputCls} w-full`}
                placeholder="Nombre del KPI"
              />
              <input
                type="number"
                value={kpi.target}
                min={0}
                step={kpi.unit === 'percentage' ? 0.1 : 1}
                onChange={e => updateKpi(kpi.id, 'target', parseFloat(e.target.value) || 0)}
                className={`${inputCls} w-full text-right tabular-nums`}
              />
              <select
                value={kpi.unit}
                onChange={e => updateKpi(kpi.id, 'unit', e.target.value as KPIUnit)}
                className={`${inputCls} w-full`}
              >
                {(Object.keys(UNIT_LABELS) as KPIUnit[]).map(u => (
                  <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                ))}
              </select>
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={!!kpi.lowerIsBetter}
                  onChange={e => updateKpi(kpi.id, 'lowerIsBetter', e.target.checked || undefined)}
                  className="w-3.5 h-3.5 accent-[#0C2054]"
                  title="Menor es mejor"
                />
              </div>
              <button
                onClick={() => deleteKpi(kpi.id)}
                className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--t-c0c0d0)] hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Add new KPI */}
          <div className="mt-4 pt-4 border-t border-[var(--s-e8e8f0)]">
            <p className="text-xs font-semibold text-[var(--t-1a1a2e)] mb-2">Agregar KPI</p>
            <div className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-start">
              <input
                value={newName}
                onChange={e => { setNewName(e.target.value); setAddError(''); }}
                className={`${inputCls} w-full`}
                placeholder="Nombre del KPI"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <input
                type="number"
                value={newTarget}
                min={0}
                onChange={e => setNewTarget(e.target.value)}
                className={`${inputCls} w-full text-right tabular-nums`}
                placeholder="Meta"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <select
                value={newUnit}
                onChange={e => setNewUnit(e.target.value as KPIUnit)}
                className={`${inputCls} w-full`}
              >
                {(Object.keys(UNIT_LABELS) as KPIUnit[]).map(u => (
                  <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
                style={{ background: 'var(--s-0c2054)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar
              </button>
            </div>
            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newLower}
                onChange={e => setNewLower(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#0C2054]"
              />
              <span className="text-xs text-[var(--t-4a4a6a)]">Menor es mejor (ej: tiempo de revisión, costo por lead)</span>
            </label>
            {addError && <p className="text-xs text-red-500 mt-1">{addError}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--s-e8e8f0)]">
          {KPI_DEFAULTS[member.area] && (
            <button
              onClick={handleRestore}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--t-8888a8)] hover:text-[var(--t-4a4a6a)] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar defaults del área
            </button>
          )}
          {!KPI_DEFAULTS[member.area] && <span />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-[var(--t-4a4a6a)] bg-[var(--s-f7f8fc)] hover:bg-[var(--s-eeeef5)] rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(kpis)}
              className="px-4 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{ background: 'var(--s-0c2054)' }}
            >
              Guardar KPIs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MemberCard ──────────────────────────────────────────────────────────

interface MemberCardProps {
  member: ApiTeamMember;
  kpis: KPIDef[];
  kpiMap: Record<string, number | null>;
  notes: string;
  editMode: boolean;
  isAdmin: boolean;
  onKpiChange: (kpiId: string, value: number | null) => void;
  onNotesChange: (v: string) => void;
  onRemove: () => void;
  onConfigKPIs: () => void;
}

function MemberCard({ member, kpis, kpiMap, notes, editMode, isAdmin, onKpiChange, onNotesChange, onRemove, onConfigKPIs }: MemberCardProps) {
  const overall = memberOverallPct(kpis, kpiMap);
  const color = avatarColor(member);

  return (
    <Card className="p-0 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--s-f0f0f0)]">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm"
          style={{ background: color }}
        >
          {member.avatar || member.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--t-1a1a2e)] truncate leading-tight">{member.name}</p>
          <p className="text-xs text-[var(--t-8888a8)] mt-0.5">{member.position || member.area}</p>
        </div>
        <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full', pctBadgeCls(overall))}>
          {overall !== null ? `${overall.toFixed(0)}%` : 'Pendiente'}
        </span>
        {/* Admin-only controls */}
        {isAdmin && (
          <>
            <button
              onClick={onConfigKPIs}
              title="Configurar KPIs"
              className="p-1.5 text-[var(--t-c0c0d0)] hover:text-[var(--t-0c2054)] hover:bg-[var(--s-f0f0f8)] rounded-lg transition-colors flex-shrink-0"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRemove}
              title="Quitar de seguimiento"
              className="p-1.5 text-[var(--t-c0c0d0)] hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
            >
              <UserMinus className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* KPI rows */}
      <div className="px-5 py-3 flex-1">
        {kpis.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-xs text-[var(--t-8888a8)] italic">Sin KPIs configurados.</p>
            {isAdmin && (
              <button
                onClick={onConfigKPIs}
                className="mt-2 text-xs font-semibold text-[var(--t-0c2054)] hover:underline"
              >
                + Configurar KPIs
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center mb-2">
              <span className="text-[10px] font-semibold text-[var(--t-8888a8)] uppercase tracking-wide">KPI</span>
              <span className="text-[10px] font-semibold text-[var(--t-8888a8)] uppercase tracking-wide text-right">Meta</span>
              <span className="text-[10px] font-semibold text-[var(--t-8888a8)] uppercase tracking-wide text-right w-16">Real</span>
              <span className="text-[10px] font-semibold text-[var(--t-8888a8)] uppercase tracking-wide text-right w-10">%</span>
            </div>

            <div className="space-y-0">
              {kpis.map(kpi => {
                const actual = kpiMap[kpi.id] ?? null;
                const pct = calcPct(actual, kpi.target, kpi.lowerIsBetter);
                const col = pctColor(pct);
                return (
                  <div key={kpi.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center py-2.5 border-t border-[var(--s-f7f8fc)]">
                    <span className="text-xs text-[var(--t-4a4a6a)] font-medium truncate">{kpi.name}</span>
                    <span className="text-xs text-[var(--t-8888a8)] text-right tabular-nums">{fmtVal(kpi.target, kpi.unit)}</span>
                    <div className="w-16">
                      {editMode ? (
                        <input
                          type="number"
                          value={actual ?? ''}
                          onChange={e => onKpiChange(kpi.id, e.target.value === '' ? null : parseFloat(e.target.value))}
                          className="w-full text-right text-xs font-semibold px-2 py-1 rounded-md border border-[var(--s-e8e8f0)] focus:outline-none focus:border-[var(--s-0c2054)] bg-[var(--s-f7f8fc)] text-[var(--t-1a1a2e)] tabular-nums"
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
                        : <span className="text-[10px] text-[var(--t-d1d5db)]">—</span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>

            {overall !== null && (
              <div className="mt-3">
                <div className="w-full h-1.5 bg-[var(--s-f0f0f0)] rounded-full overflow-hidden">
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
        <div className="px-5 pb-4 border-t border-[var(--s-f0f0f0)] pt-3">
          {editMode ? (
            <textarea
              value={notes}
              onChange={e => onNotesChange(e.target.value)}
              placeholder="Notas sobre el desempeño de esta semana..."
              rows={2}
              className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--s-e8e8f0)] focus:outline-none focus:border-[var(--s-0c2054)] bg-[var(--s-f7f8fc)] text-[var(--t-4a4a6a)] resize-none placeholder:text-[var(--t-c0c0d0)]"
            />
          ) : (
            <p className="text-xs text-[var(--t-6b7280)] italic leading-relaxed">{notes}</p>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Manage members modal ────────────────────────────────────────────────

function ManageModal({
  allMembers, excluded, onSave, onClose,
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
      <div className="relative bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--s-e8e8f0)]">
          <h2 className="font-bold text-[var(--t-1a1a2e)]">Miembros en seguimiento</h2>
          <button onClick={onClose} className="p-1.5 text-[var(--t-8888a8)] hover:text-[var(--t-1a1a2e)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-1 max-h-80 overflow-y-auto">
          {allMembers.map(m => {
            const included = !draft.includes(m.id);
            return (
              <label key={m.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-[var(--s-f7f8fc)] cursor-pointer transition-colors">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ background: avatarColor(m) }}
                >
                  {m.avatar || m.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--t-1a1a2e)] truncate">{m.name}</p>
                  <p className="text-xs text-[var(--t-8888a8)]">{m.position || m.area}</p>
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
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[var(--s-e8e8f0)]">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[var(--t-4a4a6a)] bg-[var(--s-f7f8fc)] hover:bg-[var(--s-eeeef5)] rounded-lg transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => { onSave(draft); onClose(); }}
            className="px-4 py-2 text-sm font-bold text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ background: 'var(--s-0c2054)' }}
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
  const [kpiDefs, setKpiDefs] = useState<Record<string, KPIDef[]>>({});
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [showManage, setShowManage] = useState(false);
  const [kpiConfigMember, setKpiConfigMember] = useState<ApiTeamMember | null>(null);

  // Bootstrap
  useEffect(() => {
    setMounted(true);
    setExcluded(loadExcluded());
    setKpiDefs(loadAllKPIDefs());

    try {
      const cached = JSON.parse(localStorage.getItem('current_user') || '{}');
      setIsAdmin(cached?.role === 'admin');
    } catch { /* ignore */ }

    teamApi.list()
      .then(res => setAllMembers(res.results.filter(m => m.status === 'active')))
      .catch(() => { /* keep empty */ })
      .finally(() => setLoadingMembers(false));
  }, []);

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

  const handleKPIConfigSave = (member: ApiTeamMember, kpis: KPIDef[]) => {
    const id = String(member.id);
    saveKPIDefsForMember(id, kpis);
    setKpiDefs(prev => ({ ...prev, [id]: kpis }));
    setKpiConfigMember(null);
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

  const memberPcts = visibleMembers.map(m =>
    memberOverallPct(getKPIsForMember(String(m.id), m.area, kpiDefs), active.kpis[String(m.id)])
  );
  // Only exclude members with no KPIs configured (null). Members with unset values count as 0%.
  const validPcts = memberPcts.filter((v): v is number => v !== null);
  const teamPct = validPcts.length > 0 ? validPcts.reduce((a, b) => a + b, 0) / validPcts.length : null;

  return (
    <div className="animate-fade-in">
      <Header
        title="Métricas Individuales"
        subtitle="Cumplimiento semanal de KPIs por miembro del equipo"
        actions={
          <div className="flex items-center gap-2">
            {/* Admin-only: manage members */}
            {isAdmin && (
              <button
                onClick={() => setShowManage(true)}
                disabled={editMode}
                className="flex items-center gap-2 text-xs font-semibold text-[var(--t-4a4a6a)] border border-[var(--s-e8e8f0)] rounded-lg px-3 py-2 hover:bg-[var(--s-f7f8fc)] transition-colors disabled:opacity-40"
              >
                <Users className="w-3.5 h-3.5" />
                Gestionar miembros
              </button>
            )}
            {editMode ? (
              <>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 text-xs font-semibold text-[var(--t-4a4a6a)] border border-[var(--s-e8e8f0)] rounded-lg px-3 py-2 hover:bg-[var(--s-f7f8fc)] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 text-xs font-bold text-white rounded-lg px-4 py-2 hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--s-0c2054)' }}
                >
                  <Save className="w-3.5 h-3.5" />
                  Guardar semana
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 text-xs font-semibold text-[var(--t-4a4a6a)] border border-[var(--s-e8e8f0)] rounded-lg px-3 py-2 hover:bg-[var(--s-f7f8fc)] transition-colors"
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
              className="w-8 h-8 rounded-lg border border-[var(--s-e8e8f0)] flex items-center justify-center text-[var(--t-4a4a6a)] hover:bg-[var(--s-f7f8fc)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-5 py-2 bg-[var(--surface)] border border-[var(--s-e8e8f0)] rounded-lg">
              <p className="text-sm font-semibold text-[var(--t-1a1a2e)]">
                {mounted ? formatWeekLabel(week) : '...'}
              </p>
            </div>
            <button
              onClick={() => setWeek(w => shiftWeek(w, 1))}
              disabled={editMode}
              className="w-8 h-8 rounded-lg border border-[var(--s-e8e8f0)] flex items-center justify-center text-[var(--t-4a4a6a)] hover:bg-[var(--s-f7f8fc)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWeek(getISOWeekKey(new Date()))}
              disabled={editMode}
              className="text-xs font-semibold text-[var(--t-0c2054)] hover:underline ml-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Semana actual
            </button>
          </div>

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
            <span className="w-2 h-2 rounded-full bg-[var(--s-f79c31)] animate-pulse flex-shrink-0" />
            <p className="text-sm font-medium text-[var(--t-92400e)]">
              Modo edición — Ingresa los valores reales de cada miembro y guarda los cambios.
            </p>
          </div>
        )}

        {loadingMembers && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--t-8888a8)]" />
          </div>
        )}

        {!loadingMembers && visibleMembers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-10 h-10 text-[var(--t-d1d5db)] mb-3" />
            <p className="text-sm font-semibold text-[var(--t-4a4a6a)]">Sin miembros en seguimiento</p>
            <p className="text-xs text-[var(--t-8888a8)] mt-1">
              {allMembers.length > 0
                ? 'Usa "Gestionar miembros" para agregar personas al panel.'
                : 'No hay miembros activos en el equipo.'}
            </p>
          </div>
        )}

        {!loadingMembers && visibleMembers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleMembers.map(member => {
              const mid = String(member.id);
              const kpis = getKPIsForMember(mid, member.area, kpiDefs);
              return (
                <MemberCard
                  key={member.id}
                  member={member}
                  kpis={kpis}
                  kpiMap={active.kpis[mid] ?? {}}
                  notes={active.notes[mid] ?? ''}
                  editMode={editMode}
                  isAdmin={isAdmin}
                  onKpiChange={(kpiId, value) => setKpi(mid, kpiId, value)}
                  onNotesChange={notes => setNotes(mid, notes)}
                  onRemove={() => handleRemoveMember(member.id)}
                  onConfigKPIs={() => setKpiConfigMember(member)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showManage && (
        <ManageModal
          allMembers={allMembers}
          excluded={excluded}
          onSave={handleManageSave}
          onClose={() => setShowManage(false)}
        />
      )}

      {kpiConfigMember && (
        <KPIConfigModal
          member={kpiConfigMember}
          initialKPIs={getKPIsForMember(String(kpiConfigMember.id), kpiConfigMember.area, kpiDefs)}
          onSave={kpis => handleKPIConfigSave(kpiConfigMember, kpis)}
          onClose={() => setKpiConfigMember(null)}
        />
      )}
    </div>
  );
}
