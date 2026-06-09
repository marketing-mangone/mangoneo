'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, RefreshCw, ArrowUpRight, ArrowDownRight,
  Download, PlaySquare, Eye, Clock, UserPlus, Users,
  ChevronLeft, ChevronRight, BarChart3, Globe, MousePointerClick,
} from 'lucide-react';
import {
  MOCK_KPIS, MOCK_LEADS_SERIES, MOCK_SESIONES_SERIES,
  MOCK_AD_SPEND_SERIES, MOCK_CHANNEL_DATA,
} from '@/lib/mock-data';
import { formatNumber, formatCurrency, calcChange } from '@/lib/utils';
import { dashboardApi, youtubeApi, ga4Api, type DashboardSummary, type YouTubeWeeklyData, type GA4Summary, type GA4Slug } from '@/lib/api';

const PERIODS = ['Este mes', 'Último trimestre', 'Últimos 6 meses', 'Este año'];
const TABS = ['Departamentales', 'Google Analytics', 'YouTube'];

function fmtWatchTime(minutes: number): string {
  if (minutes >= 60) return `${(minutes / 60).toFixed(1)}h`;
  return `${Math.round(minutes)} min`;
}

const sourceLabels: Record<string, { label: string; color: string }> = {
  hubspot:          { label: 'HubSpot',          color: 'bg-orange-50 text-orange-700' },
  google_analytics: { label: 'Google Analytics', color: 'bg-blue-50 text-blue-700' },
  meta:             { label: 'Meta',              color: 'bg-indigo-50 text-indigo-700' },
  google_ads:       { label: 'Google Ads',        color: 'bg-green-50 text-green-700' },
  manual:           { label: 'Manual',            color: 'bg-gray-100 text-gray-600' },
};

const categoryLabels: Record<string, string> = {
  acquisition: 'Adquisición',
  engagement:  'Engagement',
  conversion:  'Conversión',
  brand:       'Marca',
};

function MetricRow({ kpi }: { kpi: (typeof MOCK_KPIS)[0] }) {
  const change = calcChange(kpi.value, kpi.previousValue);
  const progress = Math.min((kpi.value / kpi.target) * 100, 100);
  const positiveChange = kpi.id === 'costo-lead' ? change < 0 : change > 0;
  const src = sourceLabels[kpi.source] || sourceLabels.manual;

  const formatVal = (v: number) => {
    if (kpi.unit === 'currency') return formatCurrency(v);
    if (kpi.unit === 'percentage') return `${v.toFixed(1)}%`;
    return formatNumber(v);
  };

  return (
    <div className="flex items-center gap-4 py-4 border-b border-[var(--s-f0f0f0)] last:border-0 hover:bg-[var(--s-fafafe)] -mx-5 px-5 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-[var(--t-1a1a2e)]">{kpi.name}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${src.color}`}>{src.label}</span>
        </div>
        <span className="text-xs text-[var(--t-8888a8)]">{categoryLabels[kpi.category]}</span>
      </div>
      <div className="text-right min-w-[80px]">
        <p className="text-base font-bold text-[var(--t-1a1a2e)]">{formatVal(kpi.value)}</p>
        <p className="text-xs text-[var(--t-8888a8)]">de {formatVal(kpi.target)}</p>
      </div>
      <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full min-w-[64px] justify-center ${
        positiveChange ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
      }`}>
        {change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {Math.abs(change).toFixed(1)}%
      </div>
      <div className="w-32">
        <div className="flex justify-between text-[10px] text-[var(--t-8888a8)] mb-1">
          <span>Progreso</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div className="w-full h-1.5 bg-[var(--s-f0f0f0)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${progress >= 100 ? 'bg-[#00b894]' : progress >= 70 ? 'bg-[var(--s-f79c31)]' : 'bg-red-400'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="text-xs text-[var(--t-8888a8)] hidden lg:block min-w-[90px]">
        {kpi.lastUpdated ? new Date(kpi.lastUpdated).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : '—'}
      </div>
    </div>
  );
}

const COMBINED_SERIES = MOCK_LEADS_SERIES.map((d, i) => ({
  date: d.date,
  leads: d.value,
  sesiones: MOCK_SESIONES_SERIES[i].value,
  spend: MOCK_AD_SPEND_SERIES[i].value,
}));

export default function MetricasPage() {
  const [period, setPeriod] = useState(PERIODS[0]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [ytData, setYtData] = useState<DashboardSummary['youtube'] | null>(null);

  useEffect(() => {
    dashboardApi.summary().then(d => setYtData(d.youtube)).catch(() => {});
  }, []);

  const filtered = activeCategory === 'all'
    ? MOCK_KPIS
    : MOCK_KPIS.filter(k => k.category === activeCategory);

  const totLeads      = MOCK_KPIS.find(k => k.id === 'leads-mes');
  const totSesiones   = MOCK_KPIS.find(k => k.id === 'sesiones-web');
  const totSpend      = MOCK_KPIS.find(k => k.id === 'ad-spend');
  const totConversion = MOCK_KPIS.find(k => k.id === 'tasa-conversion');

  return (
    <div className="animate-fade-in">
      <Header
        title="Métricas y KPIs"
        subtitle="Seguimiento de indicadores clave del departamento"
        actions={
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 text-xs font-semibold text-[var(--t-4a4a6a)] border border-[var(--s-e8e8f0)] rounded-lg px-3 py-2 hover:bg-[var(--s-f7f8fc)] transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar
            </button>
            <button className="flex items-center gap-2 text-xs font-semibold text-[var(--t-4a4a6a)] border border-[var(--s-e8e8f0)] rounded-lg px-3 py-2 hover:bg-[var(--s-f7f8fc)] transition-colors">
              <Download className="w-3.5 h-3.5" />
              Exportar
            </button>
          </div>
        }
      />

      <div className="px-10 py-10 space-y-10">

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 border-b border-[var(--s-e8e8f0)]">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 border-b-2 -mb-px transition-all ${
                activeTab === tab
                  ? 'border-[var(--s-0c2054)] text-[var(--t-0c2054)]'
                  : 'border-transparent text-[var(--t-8888a8)] hover:text-[var(--t-4a4a6a)]'
              }`}
            >
              {tab === 'YouTube'          && <PlaySquare className="w-3.5 h-3.5 text-red-500" />}
              {tab === 'Google Analytics' && <BarChart3   className="w-3.5 h-3.5 text-blue-500" />}
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Google Analytics' && <GA4Section />}

        {activeTab === 'YouTube' && (
          <YouTubeSection subscribersTotal={ytData?.['youtube-subscribers-total']?.value ?? null} />
        )}

        {activeTab === 'Departamentales' && <>
          {/* Period selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--t-8888a8)] font-medium">Período:</span>
            <div className="flex gap-1 bg-[var(--surface)] border border-[var(--s-e8e8f0)] rounded-lg p-1">
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
                    period === p ? 'bg-[var(--s-0c2054)] text-white shadow-sm' : 'text-[var(--t-4a4a6a)] hover:bg-[var(--s-f7f8fc)]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="ml-auto text-xs text-[var(--t-8888a8)] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00b894] animate-pulse" />
              Última actualización: hace 12 minutos
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { kpi: totLeads,      icon: '🎯', label: 'Leads Mes' },
              { kpi: totSesiones,   icon: '🌐', label: 'Sesiones Web' },
              { kpi: totSpend,      icon: '💰', label: 'Inversión Ads' },
              { kpi: totConversion, icon: '📈', label: 'Conversión' },
            ].map(({ kpi, icon, label }) => {
              if (!kpi) return null;
              const change = calcChange(kpi.value, kpi.previousValue);
              const pos = kpi.id === 'costo-lead' ? change < 0 : change > 0;
              return (
                <Card key={kpi.id} className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{icon}</span>
                    <p className="text-xs font-medium text-[var(--t-8888a8)]">{label}</p>
                  </div>
                  <p className="text-2xl font-bold text-[var(--t-1a1a2e)] mb-1">
                    {kpi.unit === 'currency' ? formatCurrency(kpi.value)
                      : kpi.unit === 'percentage' ? `${kpi.value}%`
                      : formatNumber(kpi.value)}
                  </p>
                  <span className={`text-xs font-semibold ${pos ? 'text-green-600' : 'text-red-500'}`}>
                    {change > 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs mes anterior
                  </span>
                </Card>
              );
            })}
          </div>

          {/* Main chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[15px] font-bold text-[var(--t-111827)]">Evolución de Métricas Clave</h3>
                <p className="text-xs text-[var(--t-6b7280)] mt-0.5">Leads, sesiones y gasto — últimos 5 meses</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={COMBINED_SERIES}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8888a8' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#8888a8' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#8888a8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}K`} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Line yAxisId="left" type="monotone" dataKey="leads" name="Leads" stroke="#F79C31" strokeWidth={2.5} dot={{ fill: 'var(--s-f79c31)', r: 4 }} />
                <Line yAxisId="left" type="monotone" dataKey="sesiones" name="Sesiones" stroke="#0C2054" strokeWidth={2} dot={{ fill: 'var(--s-0c2054)', r: 3 }} strokeDasharray="5 5" />
                <Line yAxisId="right" type="monotone" dataKey="spend" name="Ad Spend" stroke="#00b894" strokeWidth={2} dot={{ fill: '#00b894', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Channel breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-[15px] font-bold text-[var(--t-111827)] mb-5">Rendimiento por Canal</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={MOCK_CHANNEL_DATA} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#8888a8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="channel" tick={{ fontSize: 12, fill: '#4a4a6a', fontWeight: 500 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px' }} />
                  <Bar dataKey="leads" name="Leads" fill="#F79C31" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="text-[15px] font-bold text-[var(--t-111827)] mb-5">Costo por Lead por Canal</h3>
              <div className="space-y-3">
                {MOCK_CHANNEL_DATA.filter(d => d.cpl > 0).map((d) => (
                  <div key={d.channel}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-[var(--t-4a4a6a)]">{d.channel}</span>
                      <span className="font-bold text-[var(--t-1a1a2e)]">{formatCurrency(d.cpl)}</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--s-f0f0f0)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(d.cpl / 50) * 100}%`,
                          background: d.cpl <= 35 ? '#00b894' : d.cpl <= 45 ? '#F79C31' : '#e17055',
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-[var(--t-8888a8)] mt-1">
                      Target: $35.00 · {d.leads} leads · {formatCurrency(d.spend)} gasto
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* KPI Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-bold text-[var(--t-111827)]">Todos los KPIs</h3>
              <div className="flex gap-1 bg-[var(--s-f7f8fc)] rounded-lg p-1">
                {[['all', 'Todos'], ['acquisition', 'Adquisición'], ['engagement', 'Engagement'], ['conversion', 'Conversión'], ['brand', 'Marca']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setActiveCategory(val)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                      activeCategory === val ? 'bg-[var(--surface)] text-[var(--t-0c2054)] shadow-sm' : 'text-[var(--t-8888a8)] hover:text-[var(--t-4a4a6a)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="border border-[var(--s-f0f0f0)] rounded-lg overflow-hidden">
              <div className="flex items-center gap-4 py-2.5 px-5 bg-[var(--s-f7f8fc)] border-b border-[var(--s-f0f0f0)]">
                <span className="flex-1 text-xs font-semibold text-[var(--t-8888a8)] uppercase tracking-wide">Métrica</span>
                <span className="text-xs font-semibold text-[var(--t-8888a8)] uppercase tracking-wide min-w-[80px] text-right">Valor</span>
                <span className="text-xs font-semibold text-[var(--t-8888a8)] uppercase tracking-wide min-w-[64px] text-center">Cambio</span>
                <span className="text-xs font-semibold text-[var(--t-8888a8)] uppercase tracking-wide w-32">Progreso</span>
                <span className="text-xs font-semibold text-[var(--t-8888a8)] uppercase tracking-wide hidden lg:block min-w-[90px]">Actualizado</span>
              </div>
              <div className="px-5">
                {filtered.map(kpi => <MetricRow key={kpi.id} kpi={kpi} />)}
              </div>
            </div>
          </Card>
        </>}
      </div>
    </div>
  );
}

/* ─── Google Analytics 4 Section ─── */

const GA4_STATS: {
  slug: GA4Slug;
  label: string;
  icon: React.ReactNode;
  fmt: (v: number) => string;
  goodUp: boolean;
}[] = [
  { slug: 'ga4-sessions',             label: 'Sesiones',              icon: <Globe className="w-5 h-5" />,            fmt: formatNumber,                           goodUp: true  },
  { slug: 'ga4-active-users',         label: 'Usuarios Activos',      icon: <Users className="w-5 h-5" />,            fmt: formatNumber,                           goodUp: true  },
  { slug: 'ga4-new-users',            label: 'Usuarios Nuevos',       icon: <UserPlus className="w-5 h-5" />,         fmt: formatNumber,                           goodUp: true  },
  { slug: 'ga4-pageviews',            label: 'Vistas de Página',      icon: <Eye className="w-5 h-5" />,              fmt: formatNumber,                           goodUp: true  },
  { slug: 'ga4-engagement-rate',      label: 'Tasa de Interacción',   icon: <TrendingUp className="w-5 h-5" />,       fmt: v => `${(v * 100).toFixed(1)}%`,        goodUp: true  },
  { slug: 'ga4-avg-session-duration', label: 'Duración Media',        icon: <Clock className="w-5 h-5" />,            fmt: v => `${Math.round(v)}s`,               goodUp: true  },
  { slug: 'ga4-conversions',          label: 'Conversiones',          icon: <MousePointerClick className="w-5 h-5" />, fmt: formatNumber,                          goodUp: true  },
];

function GA4Section() {
  const [viewMode, setViewMode]   = useState<'monthly' | 'weekly'>('monthly');
  const [weekStr,  setWeekStr]    = useState(getCurrentISOWeek());
  const [data,     setData]       = useState<GA4Summary | null>(null);
  const [loading,  setLoading]    = useState(false);

  useEffect(() => {
    setLoading(true);
    const call = viewMode === 'monthly'
      ? ga4Api.monthly()
      : ga4Api.weekly(weekStr);
    call
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [viewMode, weekStr]);

  const currentWeek = getCurrentISOWeek();
  const sessions = data?.metrics['ga4-sessions']?.value;

  return (
    <div className="space-y-8">

      {/* Hero — sesiones totales */}
      <div className="rounded-2xl p-6 flex items-center justify-between gap-5 flex-wrap"
        style={{ background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)' }}>
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">
              {viewMode === 'monthly' ? 'Sesiones — últimos 28 días' : `Sesiones — ${weekStr}`}
            </p>
            <p className="text-white text-4xl font-extrabold leading-none">
              {sessions !== null && sessions !== undefined ? formatNumber(sessions) : '—'}
            </p>
          </div>
        </div>
        {data?.period_start && (
          <p className="text-white/50 text-xs">
            {data.period_start} → {data.period_end ?? ''}
          </p>
        )}
      </div>

      {/* Controles de período */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-[var(--surface)] border border-[var(--s-e8e8f0)] rounded-lg p-1">
          {(['monthly', 'weekly'] as const).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
                viewMode === m ? 'bg-[var(--s-0c2054)] text-white' : 'text-[var(--t-4a4a6a)] hover:bg-[var(--s-f7f8fc)]'
              }`}
            >
              {m === 'monthly' ? '28 días' : 'Por semana'}
            </button>
          ))}
        </div>

        {viewMode === 'weekly' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekStr(w => addWeeks(w, -1))}
              className="w-8 h-8 rounded-lg border border-[var(--s-e5e7eb)] flex items-center justify-center text-[var(--t-6b7280)] hover:border-[var(--s-0c2054)] hover:text-[var(--t-0c2054)] transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-[var(--t-111827)] min-w-[80px] text-center">
              {weekStr}
            </span>
            <button
              onClick={() => setWeekStr(w => addWeeks(w, 1))}
              disabled={weekStr === currentWeek}
              className="w-8 h-8 rounded-lg border border-[var(--s-e5e7eb)] flex items-center justify-center text-[var(--t-6b7280)] hover:border-[var(--s-0c2054)] hover:text-[var(--t-0c2054)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading && <span className="text-xs text-[var(--t-9ca3af)] animate-pulse ml-2">Cargando...</span>}
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {GA4_STATS.map(({ slug, label, icon, fmt, goodUp }) => {
          const entry     = data?.metrics[slug];
          const value     = entry?.value ?? null;
          const changePct = entry?.change_pct ?? null;
          const isPos     = changePct !== null && (goodUp ? changePct >= 0 : changePct <= 0);

          return (
            <Card key={slug} className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  {icon}
                </div>
                {changePct !== null && (
                  <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full ${
                    isPos ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                  }`}>
                    {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(changePct).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-[var(--t-9ca3af)] uppercase tracking-[0.08em] mb-1.5">{label}</p>
              {value !== null ? (
                <p className="text-2xl font-extrabold text-[var(--t-111827)] leading-none tracking-tight">
                  {fmt(value)}
                </p>
              ) : (
                <p className="text-base font-semibold text-[var(--t-d1d5db)] leading-none">Sin datos</p>
              )}
              {entry?.prev_value != null && (
                <p className="text-[10px] text-[var(--t-9ca3af)] mt-1.5">
                  Anterior: {fmt(entry.prev_value)}
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Top pages note */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 flex items-center gap-2">
        <Globe className="w-4 h-4 flex-shrink-0" />
        <span>
          <strong>Páginas más visitadas</strong> (últimos 28 días): asesoria-migratoria, arregla-tus-papeles, visa-t-requisitos, vawa-landing.
          Sincronización diaria a las 6:00am.
        </span>
      </div>
    </div>
  );
}

/* ─── ISO week helpers ─── */
function getISOWeekYear(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

function getCurrentISOWeek(): string {
  const { year, week } = getISOWeekYear(new Date());
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function mondayOfISOWeek(year: number, week: number): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const monday = new Date(simple);
  if (dow <= 4) monday.setDate(simple.getDate() - simple.getDay() + 1);
  else monday.setDate(simple.getDate() + 8 - simple.getDay());
  return monday;
}

function addWeeks(weekStr: string, delta: number): string {
  const [yearStr, wStr] = weekStr.split('-W');
  const monday = mondayOfISOWeek(parseInt(yearStr), parseInt(wStr));
  monday.setDate(monday.getDate() + delta * 7);
  const { year, week } = getISOWeekYear(monday);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function fmtDateRange(start: string, end: string): string {
  const fmt = (s: string) => { const [, m, d] = s.split('-'); return `${d}/${m}`; };
  return `${fmt(start)} — ${fmt(end)}`;
}

/* ─── YouTube Section ─── */
function YouTubeSection({ subscribersTotal }: { subscribersTotal: number | null }) {
  const [weekStr, setWeekStr] = useState(getCurrentISOWeek());
  const [weekData, setWeekData] = useState<YouTubeWeeklyData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    youtubeApi.weekly(weekStr)
      .then(setWeekData)
      .catch(() => setWeekData(null))
      .finally(() => setLoading(false));
  }, [weekStr]);

  const currentWeek = getCurrentISOWeek();
  const isCurrentWeek = weekStr === currentWeek;

  const STATS: Array<{
    slug: keyof YouTubeWeeklyData['metrics'];
    label: string;
    icon: React.ReactNode;
    fmt: (v: number) => string;
  }> = [
    { slug: 'youtube-views',           label: 'Reproducciones',       icon: <Eye className="w-5 h-5" />,       fmt: formatNumber },
    { slug: 'youtube-watch-time',       label: 'Tiempo de reproducción', icon: <Clock className="w-5 h-5" />,    fmt: fmtWatchTime },
    { slug: 'youtube-net-subscribers',  label: 'Suscriptores netos',   icon: <UserPlus className="w-5 h-5" />, fmt: v => v >= 0 ? `+${formatNumber(v)}` : formatNumber(v) },
    { slug: 'youtube-likes',            label: 'Me gusta',             icon: <TrendingUp className="w-5 h-5" />, fmt: formatNumber },
    { slug: 'youtube-comments',         label: 'Comentarios',          icon: <Users className="w-5 h-5" />,     fmt: formatNumber },
    { slug: 'youtube-shares',           label: 'Compartidos',          icon: <PlaySquare className="w-5 h-5" />, fmt: formatNumber },
  ];

  return (
    <div className="space-y-8">

      {/* Subscriber total banner */}
      {subscribersTotal !== null && (
        <div className="rounded-2xl p-6 flex items-center gap-5"
          style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}>
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <PlaySquare className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Suscriptores Totales</p>
            <p className="text-white text-4xl font-extrabold leading-none">{formatNumber(subscribersTotal)}</p>
          </div>
        </div>
      )}

      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekStr(w => addWeeks(w, -1))}
            className="w-8 h-8 rounded-lg border border-[var(--s-e5e7eb)] flex items-center justify-center text-[var(--t-6b7280)] hover:border-[var(--s-0c2054)] hover:text-[var(--t-0c2054)] transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-[160px]">
            <p className="text-sm font-bold text-[var(--t-111827)]">
              {weekData ? fmtDateRange(weekData.period_start, weekData.period_end) : weekStr}
            </p>
            <p className="text-[11px] text-[var(--t-9ca3af)]">
              {weekStr}{isCurrentWeek ? ' · Semana actual' : ''}
            </p>
          </div>
          <button
            onClick={() => setWeekStr(w => addWeeks(w, 1))}
            disabled={isCurrentWeek}
            className="w-8 h-8 rounded-lg border border-[var(--s-e5e7eb)] flex items-center justify-center text-[var(--t-6b7280)] hover:border-[var(--s-0c2054)] hover:text-[var(--t-0c2054)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {loading && <span className="text-xs text-[var(--t-9ca3af)] animate-pulse">Cargando...</span>}
      </div>

      {/* Weekly metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {STATS.map(({ slug, label, icon, fmt }) => {
          const entry = weekData?.metrics[slug];
          const value = entry?.value ?? null;
          const changePct = entry?.change_pct ?? null;
          const isPositive = changePct !== null && changePct >= 0;

          return (
            <Card key={slug} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0">
                  {icon}
                </div>
                {changePct !== null && (
                  <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                    isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                  }`}>
                    {isPositive
                      ? <ArrowUpRight className="w-3 h-3" />
                      : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(changePct).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-[11px] font-bold text-[var(--t-9ca3af)] uppercase tracking-[0.1em] mb-2">{label}</p>
              {value !== null ? (
                <p className="text-[26px] font-extrabold text-[var(--t-111827)] leading-none tracking-tight">
                  {fmt(value)}
                </p>
              ) : (
                <p className="text-[16px] font-semibold text-[var(--t-d1d5db)] leading-none">Sin datos</p>
              )}
              {entry?.prev_value != null && (
                <p className="text-[11px] text-[var(--t-9ca3af)] mt-1.5">
                  Semana anterior: {fmt(entry.prev_value)}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
