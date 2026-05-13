'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Users, Target, Globe, DollarSign, Eye,
  ArrowUpRight, ArrowDownRight, Activity, PlaySquare,
  Clock, UserPlus,
} from 'lucide-react';
import {
  MOCK_KPIS, MOCK_LEADS_SERIES, MOCK_AD_SPEND_SERIES,
  MOCK_CHANNEL_DATA, MOCK_TASKS, MOCK_EVENTS,
} from '@/lib/mock-data';
import { formatNumber, formatCurrency, calcChange } from '@/lib/utils';
import { dashboardApi, type DashboardSummary } from '@/lib/api';
import Link from 'next/link';

/* ─── Constantes de diseño ─── */
const CHANNEL_COLORS = ['#F79C31', '#0C2054', '#10b981', '#3b82f6'];

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

const KPI_ICON: Record<string, React.ReactNode> = {
  'leads-mes':       <Users className="w-5 h-5" />,
  'costo-lead':      <DollarSign className="w-5 h-5" />,
  'sesiones-web':    <Globe className="w-5 h-5" />,
  'tasa-conversion': <Target className="w-5 h-5" />,
  'ad-spend':        <DollarSign className="w-5 h-5" />,
  'reach-social':    <Eye className="w-5 h-5" />,
  'engagement-rate': <Activity className="w-5 h-5" />,
  'seo-clicks':      <Globe className="w-5 h-5" />,
};

/* ─── KpiCard ─── */
function KpiCard({ kpi }: { kpi: (typeof MOCK_KPIS)[0] }) {
  const change   = calcChange(kpi.value, kpi.previousValue);
  const progress = Math.min((kpi.value / kpi.target) * 100, 100);
  const isGood   = kpi.id === 'costo-lead' ? change <= 0 : change >= 0;

  const fmt = (v: number) => {
    if (kpi.unit === 'currency')   return formatCurrency(v);
    if (kpi.unit === 'percentage') return `${v.toFixed(1)}%`;
    return formatNumber(v);
  };

  const barColor = progress >= 100 ? '#10b981' : progress >= 70 ? '#F79C31' : '#ef4444';

  return (
    <Card className="flex flex-col hover:shadow-[0_8px_28px_rgba(12,32,84,0.13)] transition-all duration-200 hover:-translate-y-0.5">
      <div className="p-6 flex flex-col gap-5 flex-1">

        {/* Fila superior: icono + badge de cambio */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-[#F79C31]/10 flex items-center justify-center text-[#F79C31] flex-shrink-0">
            {KPI_ICON[kpi.id] ?? <Activity className="w-5 h-5" />}
          </div>
          <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
            isGood ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}>
            {change >= 0
              ? <ArrowUpRight className="w-3.5 h-3.5" />
              : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        </div>

        {/* Bloque central: etiqueta + valor */}
        <div>
          <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-[0.1em] mb-2.5">
            {kpi.name}
          </p>
          <p className="text-[34px] font-extrabold text-[#111827] leading-none tracking-tight">
            {fmt(kpi.value)}
          </p>
          <p className="text-xs text-[#9ca3af] mt-2">vs mes anterior</p>
        </div>

        {/* Barra de progreso */}
        <div className="mt-auto pt-1">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-[#6b7280]">
              Objetivo: <span className="font-semibold text-[#374151]">{fmt(kpi.target)}</span>
            </span>
            <span className="text-xs font-bold" style={{ color: barColor }}>
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: barColor }}
            />
          </div>
        </div>

      </div>
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

/* ─── Page ─── */
export default function DashboardPage() {
  const mainKpis      = MOCK_KPIS.slice(0, 4);
  const secondaryKpis = MOCK_KPIS.slice(4);
  const totalLeads    = MOCK_CHANNEL_DATA.reduce((s, d) => s + d.leads, 0);

  const [ytData, setYtData] = useState<DashboardSummary['youtube'] | null>(null);

  useEffect(() => {
    dashboardApi.summary().then(d => setYtData(d.youtube)).catch(() => {});
  }, []);

  return (
    <div className="animate-fade-in">
      <Header
        title="Dashboard"
        subtitle="Vista general del departamento de marketing — Mayo 2026"
      />

      {/* ── Contenedor principal con padding generoso ── */}
      <div className="px-10 py-10 space-y-10">

        {/* ════════════ WELCOME BANNER ════════════ */}
        <div
          className="rounded-2xl p-8 flex items-center justify-between overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, #0c2054 0%, #1a3a7a 100%)' }}
        >
          {/* Orbes decorativos */}
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#F79C31]/8 pointer-events-none" />
          <div className="absolute -bottom-10 right-40 w-36 h-36 rounded-full bg-white/3 pointer-events-none" />

          {/* Texto izquierda */}
          <div className="relative z-10">
            <p className="text-[#F79C31] text-[11px] font-bold uppercase tracking-[0.2em] mb-3">
              Mayo 2026
            </p>
            <h2 className="text-white text-3xl font-bold tracking-tight mb-3">
              ¡Buenos días, Sebastian!
            </h2>
            <p className="text-white/55 text-sm leading-relaxed max-w-sm">
              Tienes{' '}
              <strong className="text-white font-semibold">4 tareas activas</strong> y{' '}
              <strong className="text-white font-semibold">2 notificaciones</strong> pendientes hoy.
            </p>
          </div>

          {/* Stats derecha */}
          <div className="hidden md:flex items-stretch relative z-10 divide-x divide-white/10 flex-shrink-0">
            {[
              { val: '284',   sub: 'Leads este mes', icon: '📈' },
              { val: '18.4K', sub: 'Sesiones web',   icon: '🌐' },
              { val: '5.2%',  sub: 'Engagement',     icon: '💬' },
            ].map(({ val, sub, icon }) => (
              <div key={sub} className="text-center px-10">
                <p className="text-2xl mb-2">{icon}</p>
                <p className="text-[#F79C31] font-display text-3xl leading-none">{val}</p>
                <p className="text-white/45 text-xs mt-2 font-medium">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ════════════ KPIs PRINCIPALES ════════════ */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-[#111827] leading-tight">KPIs Principales</h2>
              <p className="text-sm text-[#9ca3af] mt-1">Indicadores clave del mes actual</p>
            </div>
            <Link
              href="/metricas"
              className="text-sm text-[#F79C31] font-semibold hover:underline underline-offset-2"
            >
              Ver métricas completas →
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {mainKpis.map(kpi => <KpiCard key={kpi.id} kpi={kpi} />)}
          </div>
        </section>

        {/* ════════════ FILA DE GRÁFICOS ════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Area chart: Leads ── */}
          <Card className="lg:col-span-2">
            <div className="p-7 pb-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="text-[15px] font-bold text-[#111827]">Leads Generados</h3>
                  <p className="text-xs text-[#9ca3af] mt-1">Evolución últimos 5 meses</p>
                </div>
                <Badge variant="success">+17.8% vs anterior</Badge>
              </div>
            </div>
            <div className="px-4 pb-6">
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={MOCK_LEADS_SERIES} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#F79C31" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#F79C31" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px', border: 'none',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                      fontSize: '12px', padding: '10px 14px',
                    }}
                    cursor={{ stroke: '#F79C31', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Leads"
                    stroke="#F79C31"
                    strokeWidth={2.5}
                    fill="url(#leadsGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#F79C31', strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* ── Donut: Leads por canal ── */}
          <Card>
            <div className="p-7 pb-4">
              <h3 className="text-[15px] font-bold text-[#111827]">Leads por Canal</h3>
              <p className="text-xs text-[#9ca3af] mt-1">Distribución Mayo 2026</p>
            </div>

            <div className="px-4">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={MOCK_CHANNEL_DATA}
                    dataKey="leads"
                    nameKey="channel"
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={72}
                    paddingAngle={3}
                  >
                    {MOCK_CHANNEL_DATA.map((_, i) => (
                      <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [`${v} leads`, '']}
                    contentStyle={{
                      borderRadius: '10px', border: 'none',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                      fontSize: '12px', padding: '8px 12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Leyenda de canales */}
            <div className="px-7 pb-7 mt-2 space-y-3.5">
              {MOCK_CHANNEL_DATA.map((d, i) => {
                const pct = totalLeads > 0 ? ((d.leads / totalLeads) * 100).toFixed(0) : '0';
                return (
                  <div key={d.channel} className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ background: CHANNEL_COLORS[i] }}
                    />
                    <span className="text-sm text-[#374151] flex-1 leading-none">{d.channel}</span>
                    <span className="text-xs text-[#9ca3af] w-8 text-right">{pct}%</span>
                    <span className="text-sm font-bold text-[#111827] w-8 text-right">{d.leads}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ════════════ KPIs SECUNDARIOS ════════════ */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-[#111827] leading-tight">Métricas Secundarias</h2>
              <p className="text-sm text-[#9ca3af] mt-1">Alcance, engagement y SEO</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {secondaryKpis.map(kpi => <KpiCard key={kpi.id} kpi={kpi} />)}
          </div>
        </section>

        {/* ════════════ YOUTUBE ════════════ */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                <PlaySquare className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#111827] leading-tight">YouTube Analytics</h2>
                <p className="text-sm text-[#9ca3af] mt-0.5">Últimos 28 días</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Subscriber total spans full width on lg */}
            {[
              {
                label: 'Suscriptores Totales',
                icon: <Users className="w-5 h-5" />,
                value: ytData?.['youtube-subscribers-total']?.value,
                fmt: (v: number) => formatNumber(v),
                highlight: true,
              },
              {
                label: 'Reproducciones (28d)',
                icon: <Eye className="w-5 h-5" />,
                value: ytData?.['youtube-views']?.value,
                fmt: (v: number) => formatNumber(v),
              },
              {
                label: 'Tiempo de Reproducción',
                icon: <Clock className="w-5 h-5" />,
                value: ytData?.['youtube-watch-time']?.value,
                fmt: (v: number) => fmtWatchTime(v),
              },
              {
                label: 'Suscriptores Netos (28d)',
                icon: <UserPlus className="w-5 h-5" />,
                value: ytData?.['youtube-net-subscribers']?.value,
                fmt: (v: number) => (v !== null ? (v >= 0 ? `+${formatNumber(v)}` : formatNumber(v)) : '—'),
              },
              {
                label: 'Me gusta (28d)',
                icon: <Activity className="w-5 h-5" />,
                value: ytData?.['youtube-likes']?.value,
                fmt: (v: number) => formatNumber(v),
              },
              {
                label: 'Comentarios (28d)',
                icon: <Activity className="w-5 h-5" />,
                value: ytData?.['youtube-comments']?.value,
                fmt: (v: number) => formatNumber(v),
              },
              {
                label: 'Compartidos (28d)',
                icon: <Activity className="w-5 h-5" />,
                value: ytData?.['youtube-shares']?.value,
                fmt: (v: number) => formatNumber(v),
              },
            ].map(({ label, icon, value, fmt, highlight }) => (
              <Card key={label} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${highlight ? 'bg-red-600 text-white' : 'bg-red-50 text-red-500'}`}>
                    {icon}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">YouTube</span>
                </div>
                <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-[0.1em] mb-2">{label}</p>
                {value !== null && value !== undefined ? (
                  <p className="text-[28px] font-extrabold text-[#111827] leading-none tracking-tight">
                    {fmt(value)}
                  </p>
                ) : (
                  <p className="text-[18px] font-semibold text-[#d1d5db] leading-none">Sin datos</p>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* ════════════ FILA INFERIOR ════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Bar chart: Inversión publicitaria ── */}
          <Card>
            <div className="p-7 pb-4">
              <h3 className="text-[15px] font-bold text-[#111827]">Inversión Publicitaria</h3>
              <p className="text-xs text-[#9ca3af] mt-1">Gasto mensual en ads — USD</p>
            </div>
            <div className="px-4 pb-6">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart
                  data={MOCK_AD_SPEND_SERIES}
                  barSize={24}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `$${v / 1000}K`}
                  />
                  <Tooltip
                    formatter={(v) => [typeof v === 'number' ? formatCurrency(v) : v, 'Inversión']}
                    contentStyle={{
                      borderRadius: '10px', border: 'none',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                      fontSize: '12px', padding: '10px 14px',
                    }}
                  />
                  <Bar dataKey="value" fill="#0C2054" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* ── Tareas activas ── */}
          <Card>
            <div className="p-7 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[15px] font-bold text-[#111827]">Tareas Activas</h3>
                  <p className="text-xs text-[#9ca3af] mt-1">{upcomingTasks.length} tareas en curso</p>
                </div>
                <Link
                  href="/tareas"
                  className="text-sm text-[#F79C31] font-semibold hover:underline underline-offset-2 flex-shrink-0"
                >
                  Ver todas
                </Link>
              </div>
            </div>

            <div className="px-7 pb-7 divide-y divide-[#f3f4f6]">
              {upcomingTasks.map(task => (
                <div key={task.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                  {/* Punto de prioridad */}
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[task.priority]}`} />
                  {/* Texto */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#111827] truncate leading-snug">
                      {task.title}
                    </p>
                    <p className="text-xs text-[#9ca3af] mt-1 truncate">{task.assignee}</p>
                  </div>
                  {/* Estado */}
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 leading-none ${STATUS_CFG[task.status].cls}`}>
                    {STATUS_CFG[task.status].label}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* ── Próximos eventos ── */}
          <Card>
            <div className="p-7 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[15px] font-bold text-[#111827]">Próximos Eventos</h3>
                  <p className="text-xs text-[#9ca3af] mt-1">Agenda del equipo</p>
                </div>
                <Link
                  href="/calendario"
                  className="text-sm text-[#F79C31] font-semibold hover:underline underline-offset-2 flex-shrink-0"
                >
                  Ver todos
                </Link>
              </div>
            </div>

            <div className="px-7 pb-7 divide-y divide-[#f3f4f6]">
              {upcomingEvents.map(ev => {
                const d   = new Date(ev.date);
                const cfg = EVENT_CFG[ev.type];
                return (
                  <div key={ev.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                    {/* Badge de fecha */}
                    <div className="w-11 h-11 rounded-xl bg-[#F79C31]/10 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[#b97a00] font-extrabold text-sm leading-none">
                        {d.getDate()}
                      </span>
                      <span className="text-[#F79C31] text-[9px] font-bold uppercase mt-0.5">
                        {d.toLocaleString('es', { month: 'short' })}
                      </span>
                    </div>
                    {/* Texto */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#111827] truncate leading-snug">
                        {ev.title}
                      </p>
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
