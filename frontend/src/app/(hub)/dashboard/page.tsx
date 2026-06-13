'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import {
  AreaChart, Area, ResponsiveContainer,
} from 'recharts';
import {
  Users, Eye, ArrowUpRight, ArrowDownRight, Activity, PlaySquare,
  Clock, UserPlus, DollarSign, TrendingUp, Target, Zap, Wallet,
} from 'lucide-react';
import {
  MOCK_TASKS, MOCK_EVENTS, MOCK_FUNNEL, MOCK_FINANCE,
  MOCK_REVENUE_SERIES, MOCK_AD_SPEND_SERIES,
  type FunnelStage,
} from '@/lib/mock-data';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { dashboardApi, type DashboardSummary } from '@/lib/api';
import Link from 'next/link';

/* ─── Config visual ─── */
const EVENT_CFG = {
  content:  { label: 'Contenido',  cls: 'bg-blue-50 text-blue-700' },
  meeting:  { label: 'Reunión',    cls: 'bg-purple-50 text-purple-700' },
  deadline: { label: 'Entrega',    cls: 'bg-red-50 text-red-600' },
  campaign: { label: 'Campaña',    cls: 'bg-amber-50 text-amber-700' },
  event:    { label: 'Evento',     cls: 'bg-green-50 text-green-700' },
} as const;

const STATUS_CFG = {
  pending:     { label: 'Pendiente',   cls: 'text-amber-700 bg-amber-50 border border-amber-100' },
  in_progress: { label: 'En progreso', cls: 'text-blue-700 bg-blue-50 border border-blue-100' },
  review:      { label: 'En revisión', cls: 'text-purple-700 bg-purple-50 border border-purple-100' },
  done:        { label: 'Completada',  cls: 'text-green-700 bg-green-50 border border-green-100' },
  blocked:     { label: 'Bloqueada',   cls: 'text-red-700 bg-red-50 border border-red-100' },
} as const;

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high:   'bg-amber-400',
  medium: 'bg-blue-400',
  low:    'bg-gray-300',
};

/* Tonos del embudo: claro (reach) → oscuro (conversiones) */
const FUNNEL_COLORS = ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb'];
const FUNNEL_BAR    = ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8'];

/* ════════════ Tarjeta financiera superior ════════════ */
function FinanceCard({
  label, value, icon, accent, sparkData, sparkColor, change, footer, progress,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  sparkData?: { date: string; value: number }[];
  sparkColor?: string;
  change?: number;
  footer?: string;
  progress?: number;
}) {
  return (
    <Card className="p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${accent}`}>
            {icon}
          </div>
          <p className="text-[11px] font-bold text-[var(--t-9ca3af)] uppercase tracking-[0.1em]">{label}</p>
        </div>
        {change !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full ${
            change >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}>
            {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>

      <p className="text-[32px] font-extrabold text-[var(--t-111827)] leading-none tracking-tight">{value}</p>

      {/* Sparkline */}
      {sparkData && (
        <div className="h-12 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor={sparkColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke={sparkColor} strokeWidth={2}
                fill={`url(#spark-${label})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Barra de progreso (objetivo) */}
      {progress !== undefined && (
        <div className="mt-1">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-[var(--t-9ca3af)]">{footer}</span>
            <span className="text-xs font-bold text-[var(--t-f79c31)]">{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 bg-[var(--s-f3f4f6)] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%`, background: progress >= 100 ? '#10b981' : '#F79C31' }} />
          </div>
        </div>
      )}

      {footer && progress === undefined && (
        <p className="text-xs text-[var(--t-9ca3af)]">{footer}</p>
      )}
    </Card>
  );
}

/* ════════════ Embudo de ventas con desglose al hover ════════════ */
function SalesFunnel() {
  const [hovered, setHovered] = useState<number | null>(null);
  const stages = MOCK_FUNNEL;
  const vMax = stages[0].value;

  const W = 1000, cy = 75, viewH = 150, maxH = 118;
  const seg = W / stages.length;
  // Escala perceptual: el reach domina (×3000), así que usamos potencia + piso
  const thick = (v: number) => maxH * Math.max(0.2, Math.pow(v / vMax, 0.16));

  return (
    <Card className="p-7">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-[15px] font-bold text-[var(--t-111827)]">Embudo de la Firma</h3>
          <p className="text-xs text-[var(--t-9ca3af)] mt-1">
            Del alcance al caso ganado — pasa el ratón sobre cada etapa para ver el desglose
          </p>
        </div>
        <span className="text-[11px] font-semibold text-[var(--t-9ca3af)] bg-[var(--s-f3f4f6)] px-3 py-1.5 rounded-full">
          Mayo 2026
        </span>
      </div>

      {/* Encabezados de etapa */}
      <div className="grid grid-cols-5 gap-0">
        {stages.map((s, i) => {
          const prev = i > 0 ? stages[i - 1].value : null;
          const conv = prev ? (s.value / prev) * 100 : null;
          return (
            <div
              key={s.key}
              className={`text-center px-2 pb-4 transition-opacity ${hovered !== null && hovered !== i ? 'opacity-40' : ''}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--t-9ca3af)] mb-1.5">{s.label}</p>
              <p className="text-[22px] font-extrabold text-[var(--t-111827)] leading-none">{formatNumber(s.value)}</p>
              {conv !== null && (
                <p className="text-[11px] text-[var(--t-9ca3af)] mt-1.5">
                  <span className="font-semibold text-blue-600">{conv.toFixed(0)}%</span> de la previa
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Cinta del embudo */}
      <div className="relative" onMouseLeave={() => setHovered(null)}>
        <svg viewBox={`0 0 ${W} ${viewH}`} preserveAspectRatio="none" className="w-full" style={{ height: viewH }}>
          {stages.map((s, i) => {
            const lH = thick(s.value);
            const rH = thick(stages[Math.min(i + 1, stages.length - 1)].value);
            const xL = i * seg, xR = (i + 1) * seg;
            const pts = [
              `${xL},${cy - lH / 2}`,
              `${xR},${cy - rH / 2}`,
              `${xR},${cy + rH / 2}`,
              `${xL},${cy + lH / 2}`,
            ].join(' ');
            const dim = hovered !== null && hovered !== i;
            return (
              <polygon
                key={s.key}
                points={pts}
                fill={FUNNEL_COLORS[i]}
                opacity={dim ? 0.45 : 1}
                style={{ transition: 'opacity 0.15s' }}
              />
            );
          })}
        </svg>

        {/* Zonas de hover + popover de desglose */}
        <div className="absolute inset-0 grid grid-cols-5">
          {stages.map((s, i) => (
            <div key={s.key} className="relative" onMouseEnter={() => setHovered(i)}>
              {hovered === i && <BreakdownPopover stage={s} index={i} />}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function BreakdownPopover({ stage, index }: { stage: FunnelStage; index: number }) {
  const total = stage.breakdown.reduce((s, b) => s + b.value, 0);
  // Anclar a izquierda/derecha según posición para no salirse del card
  const alignRight = index >= 3;
  return (
    <div
      className={`absolute z-20 top-full mt-2 w-[230px] rounded-xl bg-[var(--surface)] border border-[var(--s-e5e7eb)] shadow-[0_8px_28px_rgba(12,32,84,0.16)] p-4 pointer-events-none ${
        alignRight ? 'right-0' : 'left-0'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-[var(--t-111827)]">{stage.label}</p>
        <span className="text-[10px] font-semibold text-[var(--t-9ca3af)] uppercase tracking-wide">{stage.breakdownLabel}</span>
      </div>
      <div className="space-y-2.5">
        {stage.breakdown.map((b) => {
          const pct = total > 0 ? (b.value / total) * 100 : 0;
          return (
            <div key={b.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[var(--t-374151)] truncate">{b.label}</span>
                <span className="text-[11px] font-bold text-[var(--t-111827)] ml-2">{formatNumber(b.value)}</span>
              </div>
              <div className="w-full h-1.5 bg-[var(--s-f3f4f6)] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: FUNNEL_BAR[index] }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════ Insights derivados del embudo ════════════ */
function InsightStat({ icon, label, value, hint, accent }: {
  icon: React.ReactNode; label: string; value: string; hint: string; accent: string;
}) {
  return (
    <Card className="p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${accent}`}>{icon}</div>
      <p className="text-[10px] font-bold text-[var(--t-9ca3af)] uppercase tracking-[0.1em] mb-1.5">{label}</p>
      <p className="text-[22px] font-extrabold text-[var(--t-111827)] leading-none">{value}</p>
      <p className="text-[11px] text-[var(--t-9ca3af)] mt-2 leading-snug">{hint}</p>
    </Card>
  );
}

/* ─── Datos derivados ─── */
const upcomingTasks = MOCK_TASKS.filter(t => t.status !== 'done').slice(0, 4);
const upcomingEvents = MOCK_EVENTS
  .filter(e => new Date(e.date) >= new Date())
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  .slice(0, 5);

function fmtWatchTime(minutes: number): string {
  if (minutes >= 60) return `${(minutes / 60).toFixed(1)}h`;
  return `${Math.round(minutes)} min`;
}

/* ════════════ Página ════════════ */
export default function DashboardPage() {
  const [ytData, setYtData] = useState<DashboardSummary['youtube'] | null>(null);

  useEffect(() => {
    dashboardApi.summary().then(d => setYtData(d.youtube)).catch(() => {});
  }, []);

  const { spent, revenue, goal } = MOCK_FINANCE;
  const leads        = MOCK_FUNNEL.find(s => s.key === 'leads')?.value ?? 0;
  const ventas       = MOCK_FUNNEL.find(s => s.key === 'ventas')?.value ?? 0;
  const reach        = MOCK_FUNNEL.find(s => s.key === 'reach')?.value ?? 0;

  const roas        = revenue / spent;                       // retorno sobre inversión
  const cac         = ventas > 0 ? spent / ventas : 0;       // costo de adquisición de cliente
  const leadToSale  = leads > 0 ? (ventas / leads) * 100 : 0;
  const avgTicket   = ventas > 0 ? revenue / ventas : 0;     // ingreso promedio por caso firmado
  const goalPct     = (revenue / goal) * 100;

  return (
    <div className="animate-fade-in">
      <Header
        title="Dashboard"
        subtitle="Estado general de la firma — Mayo 2026"
      />

      <div className="px-10 py-10 space-y-10">

        {/* ════════════ TARJETAS FINANCIERAS ════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FinanceCard
            label="Inversión (Spent)"
            value={formatCurrency(spent)}
            icon={<Wallet className="w-5 h-5 text-[#0C2054]" />}
            accent="bg-[#0C2054]/10"
            sparkData={MOCK_AD_SPEND_SERIES}
            sparkColor="#0C2054"
            change={-2.4}
            footer="Gasto en ads del mes (Meta + Google)"
          />
          <FinanceCard
            label="Ingresos"
            value={formatCurrency(revenue)}
            icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
            accent="bg-emerald-50"
            sparkData={MOCK_REVENUE_SERIES}
            sparkColor="#10b981"
            change={14.3}
            footer="Casos firmados este mes"
          />
          <FinanceCard
            label="Objetivo"
            value={formatCurrency(goal)}
            icon={<Target className="w-5 h-5 text-[#F79C31]" />}
            accent="bg-[#F79C31]/10"
            progress={goalPct}
            footer={`${formatCurrency(revenue)} de ${formatCurrency(goal)}`}
          />
        </div>

        {/* ════════════ EMBUDO ════════════ */}
        <SalesFunnel />

        {/* ════════════ INSIGHTS ════════════ */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-[var(--t-111827)] leading-tight">Insights del Mes</h2>
              <p className="text-sm text-[var(--t-9ca3af)] mt-1">Indicadores derivados del embudo y las finanzas</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <InsightStat
              icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
              accent="bg-emerald-50"
              label="ROAS"
              value={`${roas.toFixed(1)}x`}
              hint={`Por cada $1 invertido, la firma genera $${roas.toFixed(2)} en ingresos.`}
            />
            <InsightStat
              icon={<Wallet className="w-5 h-5 text-[#0C2054]" />}
              accent="bg-[#0C2054]/10"
              label="Costo por Cliente (CAC)"
              value={formatCurrency(cac)}
              hint={`Inversión publicitaria entre los ${ventas} casos firmados.`}
            />
            <InsightStat
              icon={<Zap className="w-5 h-5 text-[#F79C31]" />}
              accent="bg-[#F79C31]/10"
              label="Tasa Lead → Cliente"
              value={`${leadToSale.toFixed(1)}%`}
              hint={`${ventas} de ${leads} leads terminaron firmando.`}
            />
            <InsightStat
              icon={<DollarSign className="w-5 h-5 text-violet-600" />}
              accent="bg-violet-50"
              label="Ingreso por Caso"
              value={formatCurrency(avgTicket)}
              hint="Ingreso promedio por caso firmado este mes."
            />
          </div>

          {/* Tira de insights cualitativos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3.5 flex items-start gap-3">
              <Eye className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>Instagram</strong> es el canal de mayor alcance ({formatNumber(58200)}),
                seguido de Facebook. Concentra el {((58200 / reach) * 100).toFixed(0)}% del reach total.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3.5 flex items-start gap-3">
              <Activity className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 leading-relaxed">
                <strong>VAWA</strong> lidera tanto en ventas (22) como en conversiones (15) —
                es el tipo de caso más rentable del embudo.
              </p>
            </div>
            <div className={`rounded-xl border px-4 py-3.5 flex items-start gap-3 ${
              goalPct >= 100 ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'
            }`}>
              <Target className={`w-4 h-4 flex-shrink-0 mt-0.5 ${goalPct >= 100 ? 'text-emerald-600' : 'text-amber-600'}`} />
              <p className={`text-xs leading-relaxed ${goalPct >= 100 ? 'text-emerald-800' : 'text-amber-800'}`}>
                {goalPct >= 100
                  ? <>¡Objetivo de ingresos <strong>superado</strong>! Vamos al {goalPct.toFixed(0)}% de la meta.</>
                  : <>Faltan <strong>{formatCurrency(goal - revenue)}</strong> para la meta del mes ({goalPct.toFixed(0)}% completado).</>}
              </p>
            </div>
          </div>
        </section>

        {/* ════════════ YOUTUBE (datos reales) ════════════ */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                <PlaySquare className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--t-111827)] leading-tight">YouTube Analytics</h2>
                <p className="text-sm text-[var(--t-9ca3af)] mt-0.5">Últimos 28 días</p>
              </div>
            </div>
            <Link href="/metricas" className="text-sm text-[var(--t-f79c31)] font-semibold hover:underline underline-offset-2">
              Ver métricas completas →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Suscriptores Totales',     icon: <Users className="w-5 h-5" />,    value: ytData?.['youtube-subscribers-total']?.value, fmt: (v: number) => formatNumber(v), highlight: true },
              { label: 'Reproducciones (28d)',      icon: <Eye className="w-5 h-5" />,      value: ytData?.['youtube-views']?.value,             fmt: (v: number) => formatNumber(v) },
              { label: 'Tiempo de Reproducción',    icon: <Clock className="w-5 h-5" />,    value: ytData?.['youtube-watch-time']?.value,        fmt: (v: number) => fmtWatchTime(v) },
              { label: 'Suscriptores Netos (28d)',  icon: <UserPlus className="w-5 h-5" />, value: ytData?.['youtube-net-subscribers']?.value,   fmt: (v: number) => (v >= 0 ? `+${formatNumber(v)}` : formatNumber(v)) },
            ].map(({ label, icon, value, fmt, highlight }) => (
              <Card key={label} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${highlight ? 'bg-red-600 text-white' : 'bg-red-50 text-red-500'}`}>
                    {icon}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">YouTube</span>
                </div>
                <p className="text-[11px] font-bold text-[var(--t-9ca3af)] uppercase tracking-[0.1em] mb-2">{label}</p>
                {value !== null && value !== undefined ? (
                  <p className="text-[28px] font-extrabold text-[var(--t-111827)] leading-none tracking-tight">{fmt(value)}</p>
                ) : (
                  <p className="text-[18px] font-semibold text-[var(--t-d1d5db)] leading-none">Sin datos</p>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* ════════════ FILA INFERIOR: TAREAS + EVENTOS ════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Tareas activas */}
          <Card>
            <div className="p-7 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--t-111827)]">Tareas Activas</h3>
                  <p className="text-xs text-[var(--t-9ca3af)] mt-1">{upcomingTasks.length} tareas en curso</p>
                </div>
                <Link href="/tareas" className="text-sm text-[var(--t-f79c31)] font-semibold hover:underline underline-offset-2 flex-shrink-0">
                  Ver todas
                </Link>
              </div>
            </div>
            <div className="px-7 pb-7 divide-y divide-[var(--s-f3f4f6)]">
              {upcomingTasks.map(task => (
                <div key={task.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[task.priority]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--t-111827)] truncate leading-snug">{task.title}</p>
                    <p className="text-xs text-[var(--t-9ca3af)] mt-1 truncate">{task.assignee}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 leading-none ${STATUS_CFG[task.status].cls}`}>
                    {STATUS_CFG[task.status].label}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Próximos eventos */}
          <Card>
            <div className="p-7 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[15px] font-bold text-[var(--t-111827)]">Próximos Eventos</h3>
                  <p className="text-xs text-[var(--t-9ca3af)] mt-1">Agenda del equipo</p>
                </div>
                <Link href="/calendario" className="text-sm text-[var(--t-f79c31)] font-semibold hover:underline underline-offset-2 flex-shrink-0">
                  Ver todos
                </Link>
              </div>
            </div>
            <div className="px-7 pb-7 divide-y divide-[var(--s-f3f4f6)]">
              {upcomingEvents.map(ev => {
                const d   = new Date(ev.date);
                const cfg = EVENT_CFG[ev.type];
                return (
                  <div key={ev.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="w-11 h-11 rounded-xl bg-[#F79C31]/10 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[var(--t-b97a00)] font-extrabold text-sm leading-none">{d.getDate()}</span>
                      <span className="text-[var(--t-f79c31)] text-[9px] font-bold uppercase mt-0.5">
                        {d.toLocaleString('es', { month: 'short' })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--t-111827)] truncate leading-snug">{ev.title}</p>
                      <span className={`inline-flex mt-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

      </div>{/* /px-10 py-10 */}
    </div>
  );
}
