'use client';
import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, Target, RefreshCw,
  ArrowUpRight, ArrowDownRight, Filter, Download,
  PlaySquare, Eye, Clock, UserPlus, Users,
} from 'lucide-react';
import {
  MOCK_KPIS, MOCK_LEADS_SERIES, MOCK_SESIONES_SERIES,
  MOCK_AD_SPEND_SERIES, MOCK_CHANNEL_DATA,
} from '@/lib/mock-data';
import { formatNumber, formatCurrency, calcChange } from '@/lib/utils';
import { dashboardApi, type DashboardSummary } from '@/lib/api';

const PERIODS = ['Este mes', 'Último trimestre', 'Últimos 6 meses', 'Este año'];
const TABS = ['Departamentales', 'YouTube'];

function fmtWatchTime(minutes: number): string {
  if (minutes >= 60) return `${(minutes / 60).toFixed(1)}h`;
  return `${Math.round(minutes)} min`;
}

const sourceLabels: Record<string, { label: string; color: string; dot: string }> = {
  hubspot: { label: 'HubSpot', color: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  google_analytics: { label: 'Google Analytics', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  meta: { label: 'Meta', color: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  google_ads: { label: 'Google Ads', color: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  manual: { label: 'Manual', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};

const categoryLabels: Record<string, string> = {
  acquisition: 'Adquisición',
  engagement: 'Engagement',
  conversion: 'Conversión',
  brand: 'Marca',
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
    <div className="flex items-center gap-4 py-4 border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafe] -mx-5 px-5 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-[#1a1a2e]">{kpi.name}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${src.color}`}>{src.label}</span>
        </div>
        <span className="text-xs text-[#8888a8]">{categoryLabels[kpi.category]}</span>
      </div>

      <div className="text-right min-w-[80px]">
        <p className="text-base font-bold text-[#1a1a2e]">{formatVal(kpi.value)}</p>
        <p className="text-xs text-[#8888a8]">de {formatVal(kpi.target)}</p>
      </div>

      <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full min-w-[64px] justify-center ${
        positiveChange ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
      }`}>
        {change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {Math.abs(change).toFixed(1)}%
      </div>

      <div className="w-32">
        <div className="flex justify-between text-[10px] text-[#8888a8] mb-1">
          <span>Progreso</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div className="w-full h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${progress >= 100 ? 'bg-[#00b894]' : progress >= 70 ? 'bg-[#F79C31]' : 'bg-red-400'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="text-xs text-[#8888a8] hidden lg:block min-w-[90px]">
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

  const totLeads = MOCK_KPIS.find(k => k.id === 'leads-mes');
  const totSesiones = MOCK_KPIS.find(k => k.id === 'sesiones-web');
  const totSpend = MOCK_KPIS.find(k => k.id === 'ad-spend');
  const totConversion = MOCK_KPIS.find(k => k.id === 'tasa-conversion');

  return (
    <div className="animate-fade-in">
      <Header
        title="Métricas y KPIs"
        subtitle="Seguimiento de indicadores clave del departamento"
        actions={
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 text-xs font-semibold text-[#4a4a6a] border border-[#e8e8f0] rounded-lg px-3 py-2 hover:bg-[#f7f8fc] transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar
            </button>
            <button className="flex items-center gap-2 text-xs font-semibold text-[#4a4a6a] border border-[#e8e8f0] rounded-lg px-3 py-2 hover:bg-[#f7f8fc] transition-colors">
              <Download className="w-3.5 h-3.5" />
              Exportar
            </button>
          </div>
        }
      />

      <div className="px-10 py-10 space-y-10">

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 border-b border-[#e8e8f0]">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 border-b-2 -mb-px transition-all ${
                activeTab === tab
                  ? 'border-[#0C2054] text-[#0C2054]'
                  : 'border-transparent text-[#8888a8] hover:text-[#4a4a6a]'
              }`}
            >
              {tab === 'YouTube' && <PlaySquare className="w-3.5 h-3.5 text-red-500" />}
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'YouTube' && (
          <YouTubeSection ytData={ytData} />
        )}

        {activeTab === 'Departamentales' && <>
        {/* Period selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#8888a8] font-medium">Período:</span>
          <div className="flex gap-1 bg-white border border-[#e8e8f0] rounded-lg p-1">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
                  period === p
                    ? 'bg-[#0C2054] text-white shadow-sm'
                    : 'text-[#4a4a6a] hover:bg-[#f7f8fc]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="ml-auto text-xs text-[#8888a8] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00b894] animate-pulse" />
            Última actualización: hace 12 minutos
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { kpi: totLeads, icon: '🎯', label: 'Leads Mes' },
            { kpi: totSesiones, icon: '🌐', label: 'Sesiones Web' },
            { kpi: totSpend, icon: '💰', label: 'Inversión Ads' },
            { kpi: totConversion, icon: '📈', label: 'Conversión' },
          ].map(({ kpi, icon, label }) => {
            if (!kpi) return null;
            const change = calcChange(kpi.value, kpi.previousValue);
            const pos = kpi.id === 'costo-lead' ? change < 0 : change > 0;
            return (
              <Card key={kpi.id} className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{icon}</span>
                  <p className="text-xs font-medium text-[#8888a8]">{label}</p>
                </div>
                <p className="text-2xl font-bold text-[#1a1a2e] mb-1">
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
              <h3 className="text-[15px] font-bold text-[#111827]">Evolución de Métricas Clave</h3>
              <p className="text-xs text-[#6b7280] mt-0.5">Leads, sesiones y gasto — últimos 5 meses</p>
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
              <Line yAxisId="left" type="monotone" dataKey="leads" name="Leads" stroke="#F79C31" strokeWidth={2.5} dot={{ fill: '#F79C31', r: 4 }} />
              <Line yAxisId="left" type="monotone" dataKey="sesiones" name="Sesiones" stroke="#0C2054" strokeWidth={2} dot={{ fill: '#0C2054', r: 3 }} strokeDasharray="5 5" />
              <Line yAxisId="right" type="monotone" dataKey="spend" name="Ad Spend" stroke="#00b894" strokeWidth={2} dot={{ fill: '#00b894', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Channel breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-[15px] font-bold text-[#111827] mb-5">Rendimiento por Canal</h3>
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
            <h3 className="text-[15px] font-bold text-[#111827] mb-5">Costo por Lead por Canal</h3>
            <div className="space-y-3">
              {MOCK_CHANNEL_DATA.filter(d => d.cpl > 0).map((d, i) => (
                <div key={d.channel}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-[#4a4a6a]">{d.channel}</span>
                    <span className="font-bold text-[#1a1a2e]">{formatCurrency(d.cpl)}</span>
                  </div>
                  <div className="w-full h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(d.cpl / 50) * 100}%`,
                        background: d.cpl <= 35 ? '#00b894' : d.cpl <= 45 ? '#F79C31' : '#e17055'
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-[#8888a8] mt-1">
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
            <h3 className="text-[15px] font-bold text-[#111827]">Todos los KPIs</h3>
            <div className="flex gap-1 bg-[#f7f8fc] rounded-lg p-1">
              {[['all', 'Todos'], ['acquisition', 'Adquisición'], ['engagement', 'Engagement'], ['conversion', 'Conversión'], ['brand', 'Marca']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setActiveCategory(val)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                    activeCategory === val ? 'bg-white text-[#0C2054] shadow-sm' : 'text-[#8888a8] hover:text-[#4a4a6a]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="border border-[#f0f0f0] rounded-lg overflow-hidden">
            <div className="flex items-center gap-4 py-2.5 px-5 bg-[#f7f8fc] border-b border-[#f0f0f0]">
              <span className="flex-1 text-xs font-semibold text-[#8888a8] uppercase tracking-wide">Métrica</span>
              <span className="text-xs font-semibold text-[#8888a8] uppercase tracking-wide min-w-[80px] text-right">Valor</span>
              <span className="text-xs font-semibold text-[#8888a8] uppercase tracking-wide min-w-[64px] text-center">Cambio</span>
              <span className="text-xs font-semibold text-[#8888a8] uppercase tracking-wide w-32">Progreso</span>
              <span className="text-xs font-semibold text-[#8888a8] uppercase tracking-wide hidden lg:block min-w-[90px]">Actualizado</span>
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

/* ─── YouTube Section ─── */
function YouTubeSection({ ytData }: { ytData: DashboardSummary['youtube'] | null }) {
  const stats = [
    {
      slug: 'youtube-views' as const,
      label: 'Reproducciones',
      icon: <Eye className="w-5 h-5" />,
      fmt: (v: number) => formatNumber(v),
    },
    {
      slug: 'youtube-watch-time' as const,
      label: 'Tiempo de Reproducción',
      icon: <Clock className="w-5 h-5" />,
      fmt: (v: number) => fmtWatchTime(v),
    },
    {
      slug: 'youtube-net-subscribers' as const,
      label: 'Suscriptores Netos',
      icon: <UserPlus className="w-5 h-5" />,
      fmt: (v: number) => (v >= 0 ? `+${formatNumber(v)}` : formatNumber(v)),
    },
  ];

  const period = ytData?.['youtube-views']
    ? `${ytData['youtube-views'].period_start} → ${ytData['youtube-views'].period_end}`
    : null;

  return (
    <div className="space-y-8">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <PlaySquare className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#111827]">YouTube Analytics</h3>
            <p className="text-xs text-[#9ca3af]">{period ?? 'Sin datos — ejecuta sync_youtube para cargar métricas'}</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(({ slug, label, icon, fmt }) => {
          const entry = ytData?.[slug];
          const value = entry?.value ?? null;
          return (
            <Card key={slug} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0">
                  {icon}
                </div>
              </div>
              <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-[0.1em] mb-2">{label}</p>
              {value !== null ? (
                <p className="text-[28px] font-extrabold text-[#111827] leading-none tracking-tight">
                  {fmt(value)}
                </p>
              ) : (
                <p className="text-[18px] font-semibold text-[#d1d5db] leading-none">Sin datos</p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Setup instructions when no data */}
      {!ytData?.['youtube-views']?.value && (
        <Card className="p-8 border-dashed border-2 border-[#e5e7eb]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <PlaySquare className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#111827] mb-1">Configurar integración con YouTube</h4>
              <p className="text-xs text-[#6b7280] mb-3 leading-relaxed">
                Los datos de YouTube Analytics se sincronizan automáticamente cada 6 horas una vez configurada la integración.
              </p>
              <ol className="text-xs text-[#6b7280] space-y-1.5 list-decimal list-inside">
                <li>Coloca <code className="bg-[#f3f4f6] px-1 rounded">client_secret_youtube.json</code> en la carpeta <code className="bg-[#f3f4f6] px-1 rounded">backend/</code></li>
                <li>Ejecuta <code className="bg-[#f3f4f6] px-1 rounded">python manage.py authorize_youtube</code> para obtener el refresh token</li>
                <li>Agrega <code className="bg-[#f3f4f6] px-1 rounded">YOUTUBE_CLIENT_ID</code>, <code className="bg-[#f3f4f6] px-1 rounded">YOUTUBE_CLIENT_SECRET</code>, <code className="bg-[#f3f4f6] px-1 rounded">YOUTUBE_REFRESH_TOKEN</code> y <code className="bg-[#f3f4f6] px-1 rounded">YOUTUBE_CHANNEL_ID</code> al <code className="bg-[#f3f4f6] px-1 rounded">.env</code></li>
                <li>Ejecuta <code className="bg-[#f3f4f6] px-1 rounded">python manage.py seed_youtube_metrics</code> para crear las definiciones</li>
                <li>Ejecuta <code className="bg-[#f3f4f6] px-1 rounded">python manage.py sync_youtube</code> para cargar datos inmediatamente</li>
              </ol>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
